'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getMonthRange } from '@/lib/utils'
import { getSignedUrl } from '@/lib/image-upload'

export interface MonthDayData {
  date: string
  praiseCount: number
  thumbUrl: string | null // Signed URL for display
  hasStamp: boolean
  caption: string | null
  stickers: string[]
}

export function useMonthData(year: number, month: number) {
  const [data, setData] = useState<Map<string, MonthDayData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchMonthData = useCallback(async () => {
    try {
      setLoading(true)
      const { start, end } = getMonthRange(year, month)

      // Query from entries table with correct column names
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('entry_date, praise, photo_path')
        .gte('entry_date', start)
        .lte('entry_date', end)

      if (entriesError) {
        console.error('[useMonthData] DB error:', entriesError)
        throw entriesError
      }

      // Build aggregated data
      const monthData = new Map<string, MonthDayData>()

      // Process entries and fetch signed URLs for photos
      if (entriesData) {
        for (const entry of entriesData) {
          let thumbUrl: string | null = null

          // Get signed URL if photo exists
          if (entry.photo_path) {
            try {
              thumbUrl = await getSignedUrl(entry.photo_path)
            } catch (err) {
              console.error('[useMonthData] Failed to get signed URL:', err)
            }
          }

          monthData.set(entry.entry_date, {
            date: entry.entry_date,
            praiseCount: entry.praise ? 1 : 0, // Count as 1 if praise exists
            thumbUrl,
            hasStamp: false, // Not used in entries table
            caption: entry.praise, // Map praise to caption for UI compatibility
            stickers: [], // Not used in entries table
          })
        }
      }

      setData(monthData)
    } catch (err) {
      console.error('[useMonthData] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch month data')
    } finally {
      setLoading(false)
    }
  }, [year, month, supabase])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

  return { data, loading, error, refetch: fetchMonthData }
}
