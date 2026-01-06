'use client'

import { useEffect, useState } from 'react'
import { AppIcon } from '@/components/ui/app-icon'
import {
  isDebugMode,
  getDebugLogs,
  clearDebugLogs,
  subscribeToDebugLogs,
  setupGlobalErrorCapture,
  getDeviceInfo,
  checkStorageAvailability,
  getAppLocalStorage,
  resetOnboarding,
  addDebugLog,
  type DebugLog,
} from '@/lib/debug'

/**
 * Debug Panel Component
 * Shows debug information when ?debug=1 is in the URL
 * Displays: current route, user agent, session status, errors, logs
 */
export function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [deviceInfo, setDeviceInfo] = useState<Record<string, string>>({})
  const [storageInfo, setStorageInfo] = useState<Record<string, string>>({})
  const [appStorage, setAppStorage] = useState<Record<string, string>>({})

  useEffect(() => {
    // Only show in debug mode
    if (!isDebugMode()) return

    setIsVisible(true)

    // Setup global error capture
    setupGlobalErrorCapture()

    // Get device info
    setDeviceInfo(getDeviceInfo())
    setStorageInfo(checkStorageAvailability())
    setAppStorage(getAppLocalStorage())

    // Log initial page load
    addDebugLog('nav', 'Page loaded', {
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
    })

    // Subscribe to log updates
    const unsubscribe = subscribeToDebugLogs(() => {
      setLogs(getDebugLogs())
    })

    // Initial logs
    setLogs(getDebugLogs())

    return unsubscribe
  }, [])

  if (!isVisible) return null

  const handleClearLogs = () => {
    clearDebugLogs()
    addDebugLog('info', 'Logs cleared')
  }

  const handleResetOnboarding = () => {
    resetOnboarding()
    setAppStorage(getAppLocalStorage())
    // Reload the page to see the effect
    window.location.href = window.location.pathname
  }

  const refreshAppStorage = () => {
    setAppStorage(getAppLocalStorage())
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-700 bg-yellow-50'
      case 'nav':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] font-mono text-xs">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gray-900 text-white px-3 py-2 flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Debug Mode
          {logs.filter((l) => l.type === 'error').length > 0 && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px]">
              {logs.filter((l) => l.type === 'error').length} errors
            </span>
          )}
        </span>
        {isExpanded ? <AppIcon name="chevron-down" className="w-4 h-4" /> : <AppIcon name="chevron-up" className="w-4 h-4" />}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-gray-900 text-gray-100 max-h-[60vh] overflow-y-auto">
          {/* Device Info */}
          <div className="border-b border-gray-700 p-3">
            <h3 className="text-gray-400 uppercase text-[10px] mb-2">Device Info</h3>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(deviceInfo).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="text-gray-500">{key}: </span>
                  <span className="text-gray-300">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Info */}
          <div className="border-b border-gray-700 p-3">
            <h3 className="text-gray-400 uppercase text-[10px] mb-2">Storage</h3>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(storageInfo).map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="text-gray-500">{key}: </span>
                  <span
                    className={value.includes('Available') ? 'text-green-400' : 'text-red-400'}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* App State (localStorage) */}
          <div className="border-b border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 uppercase text-[10px]">App State</h3>
              <button
                onClick={refreshAppStorage}
                className="text-gray-500 hover:text-gray-300 text-[10px]"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-1">
              {Object.entries(appStorage).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-500 text-[11px]">{key}:</span>
                  <span className={`text-[11px] ${value === '(not set)' ? 'text-gray-600' : 'text-green-400'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleResetOnboarding}
              className="mt-3 w-full py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-medium"
            >
              Reset Onboarding & Reload
            </button>
          </div>

          {/* Current Route */}
          <div className="border-b border-gray-700 p-3">
            <h3 className="text-gray-400 uppercase text-[10px] mb-2">Current Route</h3>
            <p className="text-gray-300 break-all">
              {typeof window !== 'undefined' ? window.location.pathname : 'SSR'}
            </p>
          </div>

          {/* Logs */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-400 uppercase text-[10px]">
                Logs ({logs.length})
              </h3>
              <button
                onClick={handleClearLogs}
                className="text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <AppIcon name="trash" className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No logs yet</p>
              ) : (
                logs
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <div
                      key={`${log.timestamp}-${i}`}
                      className={`p-1.5 rounded ${getLogColor(log.type)}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] opacity-60 shrink-0">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className="uppercase text-[10px] font-bold shrink-0">
                          [{log.type}]
                        </span>
                        <span className="break-all">{log.message}</span>
                      </div>
                      {log.data !== undefined && log.data !== null ? (
                        <pre className="mt-1 text-[10px] opacity-70 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
