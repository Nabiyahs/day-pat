'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/image-upload'
import type { DayCard, StickerState } from '@/types/database'

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
  const supabase = createClient()

  // Fetch signed URL when photo_url (path) changes
  const fetchSignedUrl = useCallback(async (path: string | null) => {
    if (!path) {
      setPhotoSignedUrl(null)
      return
    }
    const signedUrl = await getSignedUrl(path)
    setPhotoSignedUrl(signedUrl)
  }, [])

  const fetchDayCard = useCallback(async () => {
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
        setDayCard(card)
        // Fetch signed URL for the photo path
        await fetchSignedUrl(card.photo_url)
      } else {
        setDayCard(null)
        setPhotoSignedUrl(null)
      }
    } catch (err) {
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
  }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    setSaving(true)
    const oldDayCard = dayCard
    const oldPhotoSignedUrl = photoSignedUrl

    // Optimistic update
    if (dayCard) {
      setDayCard({ ...dayCard, ...updates, updated_at: new Date().toISOString() })
    } else {
      setDayCard({
        id: Date.now(),
        user_id: user.id,
        card_date: date,
        photo_url: updates.photo_url ?? null,
        thumb_url: null,
        caption: updates.caption ?? null,
        sticker_state: updates.sticker_state ?? [],
        updated_at: new Date().toISOString(),
      })
    }

    // If photo_url is being updated, fetch new signed URL
    if (updates.photo_url !== undefined) {
      await fetchSignedUrl(updates.photo_url)
    }

    try {
      const stickers = updates.sticker_state ?? dayCard?.sticker_state ?? []

      const { data, error } = await supabase
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

      if (error) throw error
      const updatedCard = toDayCard(data)
      setDayCard(updatedCard)
      // Refresh signed URL after successful save
      await fetchSignedUrl(updatedCard.photo_url)
      return updatedCard
    } catch (err) {
      setDayCard(oldDayCard)
      setPhotoSignedUrl(oldPhotoSignedUrl)
      setError(err instanceof Error ? err.message : 'Failed to save day card')
      return null
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
  }
}
