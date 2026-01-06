'use client'

import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  // Navigation
  faChevronLeft,
  faChevronRight,
  faChevronDown,
  faChevronUp,
  faBars,
  faGlobe,
  faCalendarDays,
  faChartLine,
  // Actions
  faPlus,
  faPen,
  faTrash,
  faDownload,
  faShareNodes,
  faRightFromBracket,
  faGear,
  // Status
  faSpinner,
  faCheck,
  faCircleCheck,
  faCircleExclamation,
  faEye,
  faEyeSlash,
  // UI Elements
  faXmark,
  faChartColumn,
  faStar,
  faHeart,
  faCamera,
  faFilePdf,
  faFile,
  faBug,
  faLock,
  faEnvelope,
  faUser,
  faTriangleExclamation,
  faFire,
} from '@fortawesome/free-solid-svg-icons'

// Icon name to FontAwesome icon mapping
const iconMap: Record<string, IconDefinition> = {
  // Navigation
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  'chevron-down': faChevronDown,
  'chevron-up': faChevronUp,
  'menu': faBars,
  'globe': faGlobe,
  'calendar': faCalendarDays,
  'trending-up': faChartLine,
  // Actions
  'plus': faPlus,
  'edit': faPen,
  'trash': faTrash,
  'download': faDownload,
  'share': faShareNodes,
  'logout': faRightFromBracket,
  'settings': faGear,
  // Status
  'spinner': faSpinner,
  'check': faCheck,
  'check-circle': faCircleCheck,
  'alert-circle': faCircleExclamation,
  'eye': faEye,
  'eye-off': faEyeSlash,
  // UI Elements
  'x': faXmark,
  'close': faXmark,
  'bar-chart': faChartColumn,
  'star': faStar,
  'heart': faHeart,
  'camera': faCamera,
  'file-pdf': faFilePdf,
  'file-text': faFile,
  'bug': faBug,
  'lock': faLock,
  'mail': faEnvelope,
  'user': faUser,
  'construction': faTriangleExclamation,
  'flame': faFire,
}

export type IconName = keyof typeof iconMap

interface AppIconProps extends Omit<FontAwesomeIconProps, 'icon'> {
  name: IconName
  className?: string
}

/**
 * Centralized icon component using Font Awesome
 * Standardizes sizing and styling across the app
 */
export function AppIcon({ name, className = '', ...props }: AppIconProps) {
  const icon = iconMap[name]

  if (!icon) {
    console.warn(`AppIcon: Unknown icon name "${name}"`)
    return null
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      {...props}
    />
  )
}

// Export icon definitions for direct use if needed
export { iconMap }
