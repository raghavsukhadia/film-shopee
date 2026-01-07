'use client'

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'md', 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem'
  }

  const spinner = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      padding: fullScreen ? '2rem' : '1rem'
    }}>
      <Loader2 
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          color: '#3b82f6',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && (
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          margin: 0
        }}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {spinner}
      </div>
    )
  }

  return spinner
}

