// Design System Constants
// Professional color palette and design tokens
// Filmshoppee Brand Colors - Yellow/Orange Theme

export const COLORS = {
  // Primary colors - Filmshoppee Yellow/Orange
  primary: '#f59e0b', // Amber-500 (main brand color)
  primaryDark: '#d97706', // Amber-600 (darker shade)
  primaryLight: '#fbbf24', // Amber-400 (lighter shade)
  primaryAccent: '#f97316', // Orange-500 (accent color)
  
  // Secondary colors - Complementary
  secondary: '#1f2937', // Gray-800 (dark text/backgrounds)
  secondaryLight: '#374151', // Gray-700
  secondaryDark: '#111827', // Gray-900
  
  // Background colors
  bgPrimary: '#fefbf3', // Warm off-white
  bgSecondary: '#ffffff', // Pure white
  bgTertiary: '#fef3c7', // Amber-100 (light warm background)
  bgDark: '#1f2937', // Dark backgrounds
  
  // Text colors
  textPrimary: '#1f2937', // Gray-800
  textSecondary: '#6b7280', // Gray-500
  textTertiary: '#9ca3af', // Gray-400
  textLight: '#ffffff', // White text
  
  // Border colors
  border: '#f3f4f6', // Gray-100
  borderLight: '#f9fafb', // Gray-50
  borderDark: '#e5e7eb', // Gray-200
  borderAccent: '#fbbf24', // Amber-400
  
  // Status colors (keeping functional colors)
  success: '#059669', // Green-600
  successLight: '#10b981', // Green-500
  warning: '#d97706', // Amber-600
  warningLight: '#f59e0b', // Amber-500
  error: '#dc2626', // Red-600
  errorLight: '#ef4444', // Red-500
  info: '#0284c7', // Blue-600
  infoLight: '#0ea5e9', // Blue-500
  
  // Status backgrounds
  successBg: '#dcfce7', // Green-100
  warningBg: '#fef3c7', // Amber-100
  errorBg: '#fee2e2', // Red-100
  infoBg: '#dbeafe', // Blue-100
  
  // Hover states
  hover: '#fef3c7', // Amber-100
  active: '#fde68a', // Amber-200
  hoverDark: '#374151', // Gray-700
  
  // Gradient combinations
  gradientPrimary: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  gradientSecondary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  gradientDark: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
}

export const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
}

export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  // Brand-specific shadows with amber tint
  brand: '0 4px 12px rgba(245, 158, 11, 0.15)',
  brandHover: '0 8px 20px rgba(245, 158, 11, 0.25)',
}

export const BORDER_RADIUS = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
}

// Export utility functions
export function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': 
    case 'active':
    case 'paid': return { bg: COLORS.successBg, color: COLORS.success, icon: '✓' }
    case 'in_progress': 
    case 'in progress':
    case 'pending': return { bg: COLORS.infoBg, color: COLORS.info, icon: '⟳' }
    case 'overdue': 
    case 'inactive':
    case 'cancelled': return { bg: COLORS.errorBg, color: COLORS.error, icon: '✕' }
    case 'high priority': return { bg: COLORS.errorBg, color: COLORS.error, icon: '↑' }
    case 'medium priority': return { bg: COLORS.warningBg, color: COLORS.warning, icon: '→' }
    case 'low priority': return { bg: COLORS.infoBg, color: COLORS.info, icon: '↓' }
    default: return { bg: COLORS.bgTertiary, color: COLORS.textSecondary, icon: '' }
  }
}

export function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high': return { bg: COLORS.errorBg, color: COLORS.error }
    case 'medium': return { bg: COLORS.warningBg, color: COLORS.warning }
    case 'low': return { bg: COLORS.infoBg, color: COLORS.info }
    default: return { bg: COLORS.bgTertiary, color: COLORS.textSecondary }
  }
}
