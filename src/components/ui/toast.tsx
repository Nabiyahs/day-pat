'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { AppIcon } from './app-icon'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade animation
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'check-circle'
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-500' : 'bg-gray-800'

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-white text-sm font-medium transition-all duration-300',
        bgColor,
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <AppIcon name={iconName as 'check-circle' | 'alert-circle'} className="w-4 h-4" />
      <span>{message}</span>
    </div>
  )
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
