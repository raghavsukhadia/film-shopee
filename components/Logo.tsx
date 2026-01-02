'use client'

import Image from 'next/image'
import { useState } from 'react'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  variant?: 'light' | 'dark'
  className?: string
}

export default function Logo({ 
  size = 'medium', 
  showText = true, 
  variant = 'dark',
  className = '' 
}: LogoProps) {
  const [imageError, setImageError] = useState(false)
  
  // Size configurations for logo dimensions
  const sizes = {
    small: { width: 120, height: 60 },
    medium: { width: 180, height: 90 },
    large: { width: 240, height: 120 }
  }

  const config = sizes[size]

  // Fallback placeholder if image doesn't exist
  if (imageError) {
    return (
      <div 
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: config.width,
          height: config.height,
          backgroundColor: '#f3f4f6',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}
      >
        <span style={{
          fontSize: size === 'small' ? '0.75rem' : size === 'medium' ? '0.875rem' : '1rem',
          color: '#6b7280',
          fontWeight: 600
        }}>
          FILMSHOPPEÉ
        </span>
      </div>
    )
  }

  return (
    <div 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'auto',
        height: 'auto'
      }}
    >
      <Image
        src="/filmshoppee-logo.svg"
        alt="FILMSHOPPEÉ - Car Facelift Studio"
        width={config.width}
        height={config.height}
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
        priority={size === 'large'}
        onError={() => setImageError(true)}
      />
    </div>
  )
}
