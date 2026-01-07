'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

const DEBUG = process.env.NODE_ENV === 'development'

// Helper to convert database row to DayCard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDayCard(row: any): DayCard {
  return {
    id: row.id,
    user_id: row.user_id,
    card_date: row.card_date,
    photo_url: row.photo_url, // This stores the path, will be converted to signed URL
    thumb_url: row.thumb_url || null,
    caption: row.caption,
    sticker_state: (row.sticker_state as StickerState[]) || [],
    updated_at: row.updated_at,
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

  // Fetch signed URL when photo_url (path) changes
  const fetchSignedUrl = useCallback(async (path: string | null): Promise<string | null> => {
    if (!path) {
      return null
    }
    const signedUrl = await getSignedUrl(path)
    return signedUrl
  }, [])

  const fetchDayCard = useCallback(async () => {
    // Don't overwrite state if user is editing
    if (isEditingRef.current) {
      if (DEBUG) console.log('[useDayCard] Skipping fetch - user is editing')
      return
    }

    if (DEBUG) console.log('[useDayCard] Fetching day card for date:', date)

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('day_cards')
        .select('*')
        .eq('card_date', date)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const card = toDayCard(data)
        if (DEBUG) console.log('[useDayCard] Fetched card:', { photo_url: card.photo_url, caption: card.caption?.slice(0, 20) })
        setDayCard(card)
        // Fetch signed URL for the photo path
        const signedUrl = await fetchSignedUrl(card.photo_url)
        if (DEBUG) console.log('[useDayCard] Got signed URL:', signedUrl ? 'yes' : 'no')
        setPhotoSignedUrl(signedUrl)
      } else {
        if (DEBUG) console.log('[useDayCard] No card found for date')
        setDayCard(null)
        setPhotoSignedUrl(null)
      }
    } catch (err) {
      if (DEBUG) console.error('[useDayCard] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch day card')
    } finally {
      setLoading(false)
    }
  }, [date, supabase, fetchSignedUrl])

  useEffect(() => {
    fetchDayCard()
  }, [fetchDayCard])

  const upsertDayCard = async (updates: {
    photo_url?: string | null
    caption?: string | null
    sticker_state?: StickerState[]
  }): Promise<{ success: boolean; error?: string }> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'User not authenticated' }

    setSaving(true)
    setError(null)

    // Save old values for rollback (but don't modify state yet until we confirm success)
    const oldDayCard = dayCard
    const oldPhotoSignedUrl = photoSignedUrl

    try {
      const stickers = updates.sticker_state ?? dayCard?.sticker_state ?? []

      const { data, error: dbError } = await supabase
        .from('day_cards')
        .upsert(
          {
            user_id: user.id,
            card_date: date,
            photo_url: updates.photo_url ?? dayCard?.photo_url ?? null,
            caption: updates.caption ?? dayCard?.caption ?? null,
            sticker_state: stickers,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,card_date' }
        )
        .select()
        .single()

      if (dbError) throw dbError

      const updatedCard = toDayCard(data)
      setDayCard(updatedCard)

      // Only fetch new signed URL AFTER DB save succeeds
      // If photo_url changed, get the new signed URL
      if (updates.photo_url !== undefined && updates.photo_url !== oldDayCard?.photo_url) {
        const newSignedUrl = await fetchSignedUrl(updatedCard.photo_url)
        if (newSignedUrl) {
          setPhotoSignedUrl(newSignedUrl)
        } else if (updatedCard.photo_url) {
          // If we couldn't get signed URL but path exists, keep old URL temporarily
          // This prevents photo from disappearing
          console.warn('Could not get signed URL for new photo, keeping old display')
        }
      }

      return { success: true }
    } catch (err) {
      // Rollback on failure
      setDayCard(oldDayCard)
      setPhotoSignedUrl(oldPhotoSignedUrl)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save day card'
      setError(errorMessage)
      return { success: false, error: errorMessage }
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
