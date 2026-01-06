'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { User, Session } from '@supabase/supabase-js'

export default function AuthDebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useSupabase()

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) setError(userError.message)
      setUser(user)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) setError(sessionError.message)
      setSession(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Auth Diagnostics</h1>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {user ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">User</span>
            </div>
            <p className="text-sm text-gray-400">
              {user ? user.email : 'Not logged in'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {session ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">Session</span>
            </div>
            <p className="text-sm text-gray-400">
              {session ? 'Active' : 'No session'}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-2 text-red-300">{error}</p>
          </div>
        )}

        {/* Configuration */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="font-medium mb-3">Configuration</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Auth Method:</span>
              <span className="text-green-400">Email Magic Link (Cookie-based)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase URL:</span>
              <span className="text-blue-400 truncate max-w-[250px]">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Callback URL:</span>
              <span className="text-blue-400">
                {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* User Details */}
        {user && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">User Details</h2>
            <pre className="text-xs overflow-auto bg-gray-900 p-3 rounded">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Session Details */}
        {session && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">Session Details</h2>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Expires At:</span>
                <span>{new Date(session.expires_at! * 1000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Provider:</span>
                <span>{session.user?.app_metadata?.provider || 'email'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Common Issues Checklist */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="font-medium mb-3">Common Issues Checklist</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span>Supabase Dashboard → Authentication → URL Configuration → Add redirect URLs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span>Redirect URL must match exactly: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span>Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span>Clear browser cookies if session seems stuck</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span>Check browser console for CORS or network errors</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
