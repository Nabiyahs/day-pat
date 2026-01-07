'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSignedUrl } from '@/lib/image-upload'

export interface FavoriteEntry {
  id: number
  entry_date: string
  praise: string
  photo_path: string
  thumbUrl: string | null
  created_at: string
}

export function useFavorites() {
  const [data, setData] = useState<FavoriteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('id, entry_date, praise, photo_path, created_at')
        .eq('is_liked', true)
        .order('entry_date', { ascending: false })

      if (entriesError) {
        console.error('[useFavorites] DB error:', entriesError)
        throw entriesError
      }

      // Process entries and fetch signed URLs
      const favorites: FavoriteEntry[] = []
      if (entriesData) {
        for (const entry of entriesData) {
          let thumbUrl: string | null = null
          if (entry.photo_path) {
            try {
              thumbUrl = await getSignedUrl(entry.photo_path)
            } catch (err) {
              console.error('[useFavorites] Failed to get signed URL:', err)
            }
          }
          favorites.push({
            id: entry.id,
            entry_date: entry.entry_date,
            praise: entry.praise,
            photo_path: entry.photo_path,
            thumbUrl,
            created_at: entry.created_at,
          })
        }
      }

      setData(favorites)
    } catch (err) {
      console.error('[useFavorites] Fetch error:', err)
      setError('Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  return { data, loading, error, refetch: fetchFavorites }
}
