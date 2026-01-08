import imageCompression from 'browser-image-compression'
import { getSupabaseClient } from '@/lib/supabase/client'

const DEBUG = process.env.NODE_ENV === 'development'
const MAX_SIZE_MB = 1
const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const BUCKET_NAME = 'entry-photos' // Must match Supabase Storage bucket name (private bucket)
const SIGNED_URL_EXPIRES_IN = 60 * 60 // 1 hour
const SIGNED_URL_CACHE_DURATION = 50 * 60 * 1000 // 50 minutes in ms (refresh before expiry)

// Simple in-memory cache for signed URLs to avoid redundant requests
const signedUrlCache = new Map<string, { url: string; timestamp: number }>()

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
  const supabase = getSupabaseClient()

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

  // Generate flat file path: {uuid}.webp (matches existing Storage structure)
  // DO NOT use folder structure - Storage has flat filenames only
  const fileExt = 'webp'
  const uuid = crypto.randomUUID()
  const filePath = `${uuid}.${fileExt}`

  if (DEBUG) {
    console.log('[uploadPhoto] Generated upload path:', filePath)
    console.log('[uploadPhoto] User ID:', user.id)
    console.log('[uploadPhoto] Date:', date)
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, compressedFile, {
      upsert: true,
      contentType: 'image/webp',
    })

  if (uploadError) {
    // Log detailed error info for debugging (dev console only)
    console.error('[uploadPhoto] Storage upload FAILED')
    console.error('[uploadPhoto] Error name:', uploadError.name)
    console.error('[uploadPhoto] Error message:', uploadError.message)
    console.error('[uploadPhoto] Upload path attempted:', filePath)
    console.error('[uploadPhoto] User ID:', user.id)
    console.error('[uploadPhoto] File size:', compressedFile.size)
    // Map all errors to user-friendly messages - never expose raw Supabase errors
    const errMsg = (uploadError.message || '').toLowerCase()
    if (errMsg.includes('bucket not found') || errMsg.includes('bucket')) {
      throw new Error('Storage not configured. Please contact support.')
    }
    if (errMsg.includes('not allowed') || errMsg.includes('policy') || errMsg.includes('permission') || errMsg.includes('denied')) {
      throw new Error('Upload permission denied. Please try logging in again.')
    }
    if (errMsg.includes('exceeded') || errMsg.includes('size') || errMsg.includes('too large')) {
      throw new Error('Image is too large. Please use a smaller photo.')
    }
    if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('connection') || errMsg.includes('timeout')) {
      throw new Error('Network error. Check your connection and try again.')
    }
    if (errMsg.includes('auth') || errMsg.includes('jwt') || errMsg.includes('expired') || errMsg.includes('token')) {
      throw new Error('Session expired. Please log in again.')
    }
    // Default user-friendly message - never expose raw error
    throw new Error('Upload failed. Please try again.')
  }

  // SUCCESS: Log the path that will be saved to DB
  if (DEBUG) {
    console.log('[uploadPhoto] ✅ Upload SUCCESS')
    console.log('[uploadPhoto] Storage path (to save in DB):', filePath)
  }

  // Return the path (not URL) for storing in DB
  // CRITICAL: This exact value must be saved to entries.photo_path
  return filePath
}

/**
 * Get a signed URL for a private storage path
 * Uses in-memory cache to avoid redundant requests
 * @param path The storage path (e.g., "uuid.webp")
 * @returns Signed URL for temporary access
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null

  // Check cache first
  const cached = signedUrlCache.get(path)
  const now = Date.now()
  if (cached && now - cached.timestamp < SIGNED_URL_CACHE_DURATION) {
    if (DEBUG) {
      console.log('[getSignedUrl] ✅ Cache hit for:', path)
    }
    return cached.url
  }

  const supabase = getSupabaseClient()

  if (DEBUG) {
    console.log('[getSignedUrl] Requesting signed URL for path:', path)
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)

  if (error) {
    console.error('[getSignedUrl] Failed to get signed URL:', error.message)
    console.error('[getSignedUrl] Path attempted:', path)
    return null
  }

  if (DEBUG) {
    console.log('[getSignedUrl] ✅ Got signed URL for:', path)
  }

  // Cache the result
  signedUrlCache.set(path, { url: data.signedUrl, timestamp: now })

  return data.signedUrl
}

/**
 * Clear the signed URL cache (useful after logout or when URLs need refresh)
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear()
  if (DEBUG) {
    console.log('[getSignedUrl] Cache cleared')
  }
}

/**
 * Delete photo from storage
 * @param path The storage path to delete (flat filename like "uuid.webp")
 */
export async function deletePhoto(path: string): Promise<void> {
  const supabase = getSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Path is now a flat filename (uuid.webp) - no user prefix to verify
  // RLS policies on Storage bucket handle authorization

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    console.error('[deletePhoto] Delete error:', error)
    throw error
  }

  if (DEBUG) {
    console.log('[deletePhoto] ✅ Deleted:', path)
  }
}
