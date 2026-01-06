'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppIcon } from '@/components/ui/app-icon'
import { format } from 'date-fns'
import type { Praise } from '@/types/database'
import { cn } from '@/lib/utils'

interface PraiseListProps {
  praises: Praise[]
  onAdd: (content: string) => Promise<Praise | null>
  onUpdate: (id: number, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  loading?: boolean
}

export function PraiseList({
  praises,
  onAdd,
  onUpdate,
  onDelete,
  loading,
}: PraiseListProps) {
  const [newPraise, setNewPraise] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleAdd = async () => {
    if (!newPraise.trim()) return

    setAdding(true)
    await onAdd(newPraise.trim())
    setNewPraise('')
    setAdding(false)
  }

  const handleEdit = async (id: number) => {
    if (!editContent.trim()) return

    await onUpdate(id, editContent.trim())
    setEditingId(null)
    setEditContent('')
  }

  const startEdit = (praise: Praise) => {
    setEditingId(praise.id)
    setEditContent(praise.content)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        Today&apos;s Wins
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
          {praises.length}
        </span>
      </h3>

      {/* Add new praise */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPraise}
          onChange={(e) => setNewPraise(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Write something you're proud of..."
          className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-amber-300 focus:ring-2 focus:ring-amber-100 outline-none transition-all text-sm"
          disabled={adding}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newPraise.trim()}
          className={cn(
            'px-4 py-3 rounded-xl transition-all flex items-center gap-2',
            newPraise.trim()
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500'
              : 'bg-gray-100 text-gray-400'
          )}
        >
          {adding ? (
            <AppIcon name="spinner" className="w-5 h-5 animate-spin" />
          ) : (
            <AppIcon name="plus" className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Praise list */}
      <div className="space-y-2">
        {loading && praises.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <AppIcon name="spinner" className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : praises.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No wins recorded yet. Add your first one!
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {praises.map((praise) => (
              <motion.div
                key={praise.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-amber-200 transition-colors"
              >
                {editingId === praise.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit(praise.id)}
                      autoFocus
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 focus:border-amber-300 outline-none text-sm"
                    />
                    <button
                      onClick={() => handleEdit(praise.id)}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <AppIcon name="check" className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                      className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <AppIcon name="x" className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {praise.content}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {format(new Date(praise.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(praise)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <AppIcon name="edit" className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(praise.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <AppIcon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
