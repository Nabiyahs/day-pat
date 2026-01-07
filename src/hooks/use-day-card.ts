'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

const DEBUG = process.env.NODE_ENV === 'development'

// Convert entries table row to DayCard state
// Field names now match DB directly - no confusing mapping
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDayCard(row: any): DayCard & { is_liked: boolean } {
  return {
    id: row.id,
    user_id: row.user_id,
    entry_date: row.entry_date,
    photo_path: row.photo_path, // Storage path (e.g., "uuid.webp"), NOT a URL
    praise: row.praise,
    sticker_state: [],
    created_at: row.created_at,
    is_liked: row.is_liked || false,
  }
}

export function useDayCard(date: string) {
  const [dayCard, setDayCard] = useState<(DayCard & { is_liked: boolean }) | null>(null)
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use singleton client to prevent re-fetch on every render
  const supabase = getSupabaseClient()

  // Track if we're in edit mode to prevent fetched data from overwriting drafts
  const isEditingRef = useRef(false)

  // Expose method to set editing state from component
  const setEditingState = useCallback((editing: boolean) => {
    isEditingRef.current = editing
    if (DEBUG) console.log('[useDayCard] Edit state changed:', editing)
  }, [])

  // Fetch signed URL when photo_path changes
  const fetchSignedUrl = useCallback(async (path: string | null): Promise<string | null> => {
    if (!path) {
      return null
    }
    try {
      const signedUrl = await getSignedUrl(path)
      return signedUrl
    } catch (err) {
      console.error('[useDayCard] Failed to get signed URL:', err)
      return null
    }
  }, [])

  const fetchDayCard = useCallback(async () => {
    // Don't overwrite state if user is editing
    if (isEditingRef.current) {
      if (DEBUG) console.log('[useDayCard] Skipping fetch - user is editing')
      return
    }

    if (DEBUG) console.log('[useDayCard] Fetching entry for date:', date)

    try {
      setLoading(true)

      // Query from 'entries' table with correct column names
      const { data, error: fetchError } = await supabase
        .from('entries')
        .select('id, user_id, entry_date, praise, photo_path, is_liked, created_at')
        .eq('entry_date', date)
        .maybeSingle()

      if (fetchError) {
        console.error('[useDayCard] DB fetch error:', fetchError)
        throw fetchError
      }

      if (data) {
        const card = toDayCard(data)
        if (DEBUG) console.log('[useDayCard] Fetched entry:', {
          photo_path: data.photo_path,
          praise: data.praise?.slice(0, 20)
        })
        setDayCard(card)

        // Fetch signed URL for the photo path
        const signedUrl = await fetchSignedUrl(data.photo_path)
        if (DEBUG) console.log('[useDayCard] Got signed URL:', signedUrl ? 'yes' : 'no')
        setPhotoSignedUrl(signedUrl)
      } else {
        if (DEBUG) console.log('[useDayCard] No entry found for date')
        setDayCard(null)
        setPhotoSignedUrl(null)
      }
    } catch (err) {
      console.error('[useDayCard] Fetch error:', err)
      // Don't expose raw error to UI - just log it
    } finally {
      setLoading(false)
    }
  }, [date, supabase, fetchSignedUrl])

  useEffect(() => {
    fetchDayCard()
  }, [fetchDayCard])

  // upsertDayCard accepts UI field names (photo_url, caption) but saves to DB column names (photo_path, praise)
  // SAVE STAGES:
  // 1. Upload stage (handled by polaroid-card before calling this)
  // 2. DB save stage (critical - failure = save failed)
  // 3. Post-save processing (signed URL, state update - failure = warning only, returns as 'refreshError')
  const upsertDayCard = async (updates: {
    photo_url?: string | null // Will be saved as photo_path
    caption?: string | null   // Will be saved as praise
    sticker_state?: StickerState[] // Ignored - not in entries table
  }): Promise<{ success: boolean; error?: string; refreshError?: string }> => {
    console.log('[useDayCard] ═══════════════════════════════════════════════════')
    console.log('[useDayCard] SAVE FLOW STARTED')
    console.log('[useDayCard] Date:', date)
    console.log('[useDayCard] Updates:', JSON.stringify(updates, null, 2))
    console.log('[useDayCard] ═══════════════════════════════════════════════════')

    // ═══════════════════════════════════════════════════════════════════
    // PRE-VALIDATION (Before any DB operation)
    // ═══════════════════════════════════════════════════════════════════

    // Check authentication first
    let user
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('[useDayCard] ❌ Auth check failed')
        console.error('[useDayCard] Auth error code:', authError.code)
        console.error('[useDayCard] Auth error message:', authError.message)
        return { success: false, error: 'Authentication failed. Please log in again.' }
      }
      user = data.user
    } catch (authException) {
      console.error('[useDayCard] ❌ Auth exception:', authException)
      if (authException instanceof Error) {
        console.error('[useDayCard] Stack:', authException.stack)
      }
      return { success: false, error: 'Authentication check failed.' }
    }

    if (!user) {
      console.error('[useDayCard] ❌ No user found after auth check')
      return { success: false, error: 'Please log in to save.' }
    }

    console.log('[useDayCard] ✅ Auth check passed, user:', user.id)

    // REQUIRED: Photo must exist to save entry
    // updates.photo_url contains the new path from upload, dayCard?.photo_path is the existing path
    const effectivePhotoPath = updates.photo_url !== undefined ? updates.photo_url : dayCard?.photo_path
    if (!effectivePhotoPath) {
      console.error('[useDayCard] ❌ Save blocked - photo is required')
      console.error('[useDayCard] updates.photo_url:', updates.photo_url)
      console.error('[useDayCard] dayCard?.photo_path:', dayCard?.photo_path)
      return { success: false, error: 'Please add a photo first.' }
    }

    // Validate entry_date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      console.error('[useDayCard] ❌ Save blocked - invalid date format:', date)
      return { success: false, error: 'Invalid date. Please try again.' }
    }

    console.log('[useDayCard] ✅ Pre-validation passed')
    console.log('[useDayCard] Effective photo_path:', effectivePhotoPath)

    setSaving(true)
    setError(null)

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 2: DB SAVE (Critical - failure means save failed)
    // ═══════════════════════════════════════════════════════════════════
    let savedData: {
      id: string
      user_id: string
      entry_date: string
      praise: string
      photo_path: string
      is_liked: boolean
      created_at: string
    } | null = null

    // Build the payload OUTSIDE try block for debugging
    // updates.caption is the new value, dayCard?.praise is the existing value
    const payload = {
      user_id: user.id,
      entry_date: date,
      photo_path: effectivePhotoPath,
      praise: updates.caption !== undefined
        ? (updates.caption || '')
        : (dayCard?.praise || ''),
    }

    console.log('[useDayCard] ═══════════════════════════════════════')
    console.log('[useDayCard] STAGE 2: DB SAVE')
    console.log('[useDayCard] Payload:', JSON.stringify(payload, null, 2))
    console.log('[useDayCard] ═══════════════════════════════════════')

    try {
      // IMPORTANT: Only upsert without .select().single() chain
      // RLS SELECT policy issues can cause the select to fail even when upsert succeeds
      // We treat upsert success (no error) as save success
      const { error: upsertError } = await supabase
        .from('entries')
        .upsert(payload, { onConflict: 'user_id,entry_date' })

      if (upsertError) {
        console.error('[useDayCard] ❌ STAGE 2 FAILED: DB upsert error')
        console.error('[useDayCard] Error code:', upsertError.code)
        console.error('[useDayCard] Error message:', upsertError.message)
        console.error('[useDayCard] Error details:', upsertError.details)
        console.error('[useDayCard] Error hint:', upsertError.hint)
        throw upsertError
      }

      console.log('[useDayCard] ✅ STAGE 2 SUCCESS: DB upsert complete')

      // Now try to fetch the saved data separately (non-critical)
      // Using .maybeSingle() to avoid errors when RLS SELECT policy has issues
      const { data: fetchedData, error: fetchError } = await supabase
        .from('entries')
        .select('id, user_id, entry_date, praise, photo_path, is_liked, created_at')
        .eq('user_id', user.id)
        .eq('entry_date', date)
        .maybeSingle()

      if (fetchError) {
        console.warn('[useDayCard] ⚠️ STAGE 2: Post-upsert fetch failed (non-critical)')
        console.warn('[useDayCard] Fetch error code:', fetchError.code)
        console.warn('[useDayCard] Fetch error message:', fetchError.message)
        console.warn('[useDayCard] Fetch error details:', fetchError.details)
        // Don't throw - upsert succeeded, this is just for UI update
      } else if (fetchedData) {
        savedData = fetchedData
        console.log('[useDayCard] ✅ STAGE 2: Post-upsert fetch succeeded')
        console.log('[useDayCard] Fetched data:', JSON.stringify(fetchedData, null, 2))
      } else {
        console.warn('[useDayCard] ⚠️ STAGE 2: Post-upsert fetch returned null (RLS SELECT issue?)')
        // Don't throw - upsert succeeded
      }
    } catch (err) {
      // DB upsert failed - this is a real failure
      console.error('[useDayCard] ❌ STAGE 2 EXCEPTION')
      console.error('[useDayCard] Error type:', typeof err)
      console.error('[useDayCard] Error:', err)
      if (err instanceof Error) {
        console.error('[useDayCard] Error name:', err.name)
        console.error('[useDayCard] Error message:', err.message)
        console.error('[useDayCard] Error stack:', err.stack)
      }

      // Provide specific error messages based on error type
      let userFriendlyMessage = 'Failed to save. Please try again.'

      if (err instanceof Error) {
        const msg = err.message.toLowerCase()
        if (msg.includes('row-level security') || msg.includes('rls') || msg.includes('policy')) {
          userFriendlyMessage = 'Permission denied. Please log in again.'
        } else if (msg.includes('not authenticated') || msg.includes('jwt') || msg.includes('expired')) {
          userFriendlyMessage = 'Session expired. Please log in again.'
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
          userFriendlyMessage = 'Network error. Check your connection.'
        } else if (msg.includes('unique') || msg.includes('duplicate')) {
          userFriendlyMessage = 'Entry already exists for this date.'
        } else if (msg.includes('relation') || msg.includes('does not exist')) {
          userFriendlyMessage = 'Database not configured. Contact support.'
        } else if (msg.includes('not-null') || msg.includes('null value') || msg.includes('violates not-null')) {
          userFriendlyMessage = 'Please add a photo first.'
        }
      }

      setError(userFriendlyMessage)
      setSaving(false)
      return { success: false, error: userFriendlyMessage }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 3: POST-SAVE PROCESSING (Non-critical - failure = refreshError only)
    // DB save succeeded at this point. Errors here don't mean "save failed"
    // They are returned as 'refreshError' for UI to show "Refresh failed" toast
    // ═══════════════════════════════════════════════════════════════════
    console.log('[useDayCard] ═══════════════════════════════════════')
    console.log('[useDayCard] STAGE 3: POST-SAVE PROCESSING')
    console.log('[useDayCard] savedData available:', !!savedData)
    console.log('[useDayCard] ═══════════════════════════════════════')

    let refreshError: string | undefined

    // 3a. Update local state with saved data
    if (savedData) {
      try {
        const updatedCard = toDayCard(savedData)
        setDayCard(updatedCard)
        console.log('[useDayCard] ✅ Stage 3a: Local state updated')
      } catch (stateError) {
        console.warn('[useDayCard] ⚠️ Stage 3a WARNING: Failed to update local state')
        console.warn('[useDayCard] Error:', stateError)
        refreshError = 'Failed to update display. Please refresh.'
      }
    } else {
      console.warn('[useDayCard] ⚠️ Stage 3a: No savedData to update local state')
      // Force refetch since we don't have the data
      try {
        await fetchDayCard()
        console.log('[useDayCard] ✅ Stage 3a: Refetched data after save')
      } catch (refetchError) {
        console.warn('[useDayCard] ⚠️ Stage 3a WARNING: Refetch failed')
        console.warn('[useDayCard] Error:', refetchError)
        if (refetchError instanceof Error) {
          console.warn('[useDayCard] Refetch error message:', refetchError.message)
        }
        refreshError = 'Saved successfully, but failed to refresh. Please reload.'
      }
    }

    // 3b. Fetch signed URL if photo changed
    if (updates.photo_url !== undefined) {
      const photoPathForUrl = savedData?.photo_path || payload.photo_path
      console.log('[useDayCard] Stage 3b: Fetching signed URL for:', photoPathForUrl)

      try {
        const newSignedUrl = await fetchSignedUrl(photoPathForUrl)
        if (newSignedUrl) {
          setPhotoSignedUrl(newSignedUrl)
          console.log('[useDayCard] ✅ Stage 3b: Signed URL fetched')
        } else {
          console.warn('[useDayCard] ⚠️ Stage 3b WARNING: fetchSignedUrl returned null')
          console.warn('[useDayCard] photo_path used:', photoPathForUrl)
          if (!refreshError) {
            refreshError = 'Photo may not display. Please refresh.'
          }
        }
      } catch (signedUrlError) {
        console.warn('[useDayCard] ⚠️ Stage 3b WARNING: Signed URL fetch error')
        console.warn('[useDayCard] Error:', signedUrlError)
        if (signedUrlError instanceof Error) {
          console.warn('[useDayCard] Signed URL error message:', signedUrlError.message)
          console.warn('[useDayCard] Stack:', signedUrlError.stack)
        }
        if (!refreshError) {
          refreshError = 'Photo may not display. Please refresh.'
        }
      }
    }

    setSaving(false)
    console.log('[useDayCard] ═══════════════════════════════════════')
    console.log('[useDayCard] ✅ SAVE FLOW COMPLETE - SUCCESS')
    if (refreshError) {
      console.log('[useDayCard] ⚠️ With refresh warning:', refreshError)
    }
    console.log('[useDayCard] ═══════════════════════════════════════')
    return { success: true, refreshError }
  }

  // Toggle the is_liked flag for the current entry
  const toggleLike = async (): Promise<{ success: boolean; error?: string }> => {
    if (!dayCard?.id) {
      return { success: false, error: 'No entry to like' }
    }

    const newLikedState = !dayCard.is_liked

    // Optimistic update
    setDayCard({ ...dayCard, is_liked: newLikedState })

    try {
      const { error: updateError } = await supabase
        .from('entries')
        .update({ is_liked: newLikedState })
        .eq('id', dayCard.id)

      if (updateError) {
        // Rollback on error
        setDayCard({ ...dayCard, is_liked: !newLikedState })
        console.error('[useDayCard] Toggle like error:', updateError)
        return { success: false, error: 'Failed to update favorite' }
      }

      if (DEBUG) console.log('[useDayCard] Like toggled:', newLikedState)
      return { success: true }
    } catch (err) {
      // Rollback on error
      setDayCard({ ...dayCard, is_liked: !newLikedState })
      console.error('[useDayCard] Toggle like error:', err)
      return { success: false, error: 'Failed to update favorite' }
    }
  }

  return {
    dayCard,
    photoSignedUrl, // Use this for displaying the image
    loading,
    saving,
    error,
    upsertDayCard,
    toggleLike, // Toggle is_liked for Favorites
    refetch: fetchDayCard,
    setEditingState, // Call this when entering/exiting edit mode
  }
}
