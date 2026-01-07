'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

const DEBUG = process.env.NODE_ENV === 'development'

// Helper to convert entries table row to DayCard (for UI compatibility)
// Maps: entry_date → card_date, photo_path → photo_url, praise → caption
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDayCard(row: any): DayCard {
  return {
    id: row.id,
    user_id: row.user_id,
    card_date: row.entry_date, // Map entry_date to card_date
    photo_url: row.photo_path, // Map photo_path to photo_url (stores path, not URL)
    thumb_url: null, // Not used in entries table
    caption: row.praise, // Map praise to caption
    sticker_state: [], // Not used in entries table
    updated_at: row.created_at, // Map created_at to updated_at
  }
}

export function useDayCard(date: string) {
  const [dayCard, setDayCard] = useState<DayCard | null>(null)
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
        .select('id, user_id, entry_date, praise, photo_path, created_at')
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
  const upsertDayCard = async (updates: {
    photo_url?: string | null // Will be saved as photo_path
    caption?: string | null   // Will be saved as praise
    sticker_state?: StickerState[] // Ignored - not in entries table
  }): Promise<{ success: boolean; error?: string }> => {
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('[useDayCard] Auth error:', authError)
      return { success: false, error: 'Authentication failed. Please log in again.' }
    }

    if (!user) {
      console.error('[useDayCard] No user found')
      return { success: false, error: 'Please log in to save.' }
    }

    if (DEBUG) console.log('[useDayCard] Saving entry for user:', user.id, 'date:', date)

    setSaving(true)
    setError(null)

    // Save old values for rollback
    const oldDayCard = dayCard
    const oldPhotoSignedUrl = photoSignedUrl

    try {
      // Build the payload with correct column names for entries table
      const payload: {
        user_id: string
        entry_date: string
        photo_path?: string | null
        praise?: string | null
      } = {
        user_id: user.id,
        entry_date: date, // YYYY-MM-DD format
      }

      // Only include photo_path if it's being updated
      if (updates.photo_url !== undefined) {
        payload.photo_path = updates.photo_url
      } else if (dayCard?.photo_url) {
        payload.photo_path = dayCard.photo_url
      }

      // Only include praise if it's being updated
      if (updates.caption !== undefined) {
        payload.praise = updates.caption
      } else if (dayCard?.caption) {
        payload.praise = dayCard.caption
      }

      if (DEBUG) console.log('[useDayCard] Upserting to entries table:', payload)

      const { data, error: dbError } = await supabase
        .from('entries')
        .upsert(payload, { onConflict: 'user_id,entry_date' })
        .select('id, user_id, entry_date, praise, photo_path, created_at')
        .single()

      if (dbError) {
        console.error('[useDayCard] DB upsert error:', dbError)
        throw dbError
      }

      if (DEBUG) console.log('[useDayCard] Save successful:', data)

      const updatedCard = toDayCard(data)
      setDayCard(updatedCard)

      // Fetch new signed URL if photo_path changed
      if (updates.photo_url !== undefined && updates.photo_url !== oldDayCard?.photo_url) {
        const newSignedUrl = await fetchSignedUrl(data.photo_path)
        if (newSignedUrl) {
          setPhotoSignedUrl(newSignedUrl)
        } else if (data.photo_path) {
          // Keep old URL temporarily to prevent photo disappearing
          console.warn('[useDayCard] Could not get signed URL for new photo')
        }
      }

      return { success: true }
    } catch (err) {
      // Rollback on failure
      setDayCard(oldDayCard)
      setPhotoSignedUrl(oldPhotoSignedUrl)

      // Log actual error for debugging
      console.error('[useDayCard] Save error:', err)

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
        }
      }

      setError(userFriendlyMessage)
      return { success: false, error: userFriendlyMessage }
    } finally {
      setSaving(false)
    }
  }

  return {
    dayCard,
    photoSignedUrl, // Use this for displaying the image
    loading,
    saving,
    error,
    upsertDayCard,
    refetch: fetchDayCard,
    setEditingState, // Call this when entering/exiting edit mode
  }
}
