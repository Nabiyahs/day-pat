import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE_MB = 1
const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const BUCKET_NAME = 'entry-photos' // Must match Supabase Storage bucket name (private bucket)
const SIGNED_URL_EXPIRES_IN = 60 * 60 // 1 hour

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

/**
 * Upload photo to Supabase Storage
 * @returns The storage path (not URL) for storing in DB
 */
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

  // Generate file path: {user_id}/{YYYY-MM-DD}/{uuid}.webp
  const fileExt = 'webp'
  const uuid = crypto.randomUUID()
  const filePath = `${user.id}/${date}/${uuid}.${fileExt}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
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

  // Return the path (not URL) for storing in DB
  return filePath
}

/**
 * Get a signed URL for a private storage path
 * @param path The storage path (e.g., "user_id/2026-01-07/uuid.webp")
 * @returns Signed URL for temporary access
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null

  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)

  if (error) {
    console.error('Failed to get signed URL:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Delete photo from storage
 * @param path The storage path to delete
 */
export async function deletePhoto(path: string): Promise<void> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Verify the path belongs to the current user
  if (!path.startsWith(user.id)) {
    throw new Error('Permission denied')
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw error
  }
}
