import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_MB = 1
const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: Math.max(MAX_WIDTH, MAX_HEIGHT),
    useWebWorker: true,
    fileType: 'image/webp' as const,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Image compression failed:', error)
    return file
  }
}

export async function uploadPhoto(
  file: File,
  date: string
): Promise<string | null> {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Auth error:', authError)
    throw new Error('Authentication failed. Please log in again.')
  }

  if (!user) {
    throw new Error('Please log in to upload photos.')
  }

  // Compress image before upload
  let compressedFile: File
  try {
    compressedFile = await compressImage(file)
  } catch (compressionError) {
    console.error('Compression error:', compressionError)
    throw new Error('Failed to process image. Please try a different photo.')
  }

  // Generate file path: {user_id}/{YYYY-MM-DD}.webp
  const fileExt = 'webp'
  const filePath = `${user.id}/${date}.${fileExt}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('praise-photos')
    .upload(filePath, compressedFile, {
      upsert: true,
      contentType: 'image/webp',
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    // Provide more specific error messages based on error type
    if (uploadError.message?.includes('Bucket not found')) {
      throw new Error('Storage not configured. Please contact support.')
    }
    if (uploadError.message?.includes('not allowed') || uploadError.message?.includes('policy')) {
      throw new Error('Upload permission denied. Please try logging in again.')
    }
    if (uploadError.message?.includes('exceeded') || uploadError.message?.includes('size')) {
      throw new Error('Image is too large. Please use a smaller photo.')
    }
    throw new Error(uploadError.message || 'Upload failed. Please try again.')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('praise-photos').getPublicUrl(filePath)

  // Add cache-busting query param
  const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`

  return urlWithTimestamp
}

export async function deletePhoto(date: string): Promise<void> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const filePath = `${user.id}/${date}.webp`

  const { error } = await supabase.storage.from('praise-photos').remove([filePath])

  if (error) {
    console.error('Delete error:', error)
    throw error
  }
}
