'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getWeekRange } from '@/lib/utils'
import { getSignedUrl } from '@/lib/image-upload'

export interface WeekDayData {
  date: string
  praiseCount: number
  thumbUrl: string | null // Signed URL for display
  hasStamp: boolean
  caption: string | null
  stickers: string[]
  time: string | null
}

export function useWeekData(anchorDate: Date) {
  const [data, setData] = useState<Map<string, WeekDayData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchWeekData = useCallback(async () => {
    try {
      setLoading(true)
      const { start, end } = getWeekRange(anchorDate)

      // Query from entries table with correct column names
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('entry_date, praise, photo_path, created_at')
        .gte('entry_date', start)
        .lte('entry_date', end)

      if (entriesError) {
        console.error('[useWeekData] DB error:', entriesError)
        throw entriesError
      }

      // Build aggregated data
      const weekData = new Map<string, WeekDayData>()

      // Process entries and fetch signed URLs for photos
      if (entriesData) {
        for (const entry of entriesData) {
          let thumbUrl: string | null = null

          // Get signed URL if photo exists
          if (entry.photo_path) {
            try {
              thumbUrl = await getSignedUrl(entry.photo_path)
            } catch (err) {
              console.error('[useWeekData] Failed to get signed URL:', err)
            }
          }

          const time = entry.created_at
            ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null

          weekData.set(entry.entry_date, {
            date: entry.entry_date,
            praiseCount: entry.praise ? 1 : 0, // Count as 1 if praise exists
            thumbUrl,
            hasStamp: false, // Not used in entries table
            caption: entry.praise, // Map praise to caption for UI compatibility
            stickers: [], // Not used in entries table
            time,
          })
        }
      }

      setData(weekData)
    } catch (err) {
      console.error('[useWeekData] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch week data')
    } finally {
      setLoading(false)
    }
  }, [anchorDate, supabase])

  useEffect(() => {
    fetchWeekData()
  }, [fetchWeekData])

  return { data, loading, error, refetch: fetchWeekData }
}
