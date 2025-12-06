'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FilmshoppeeLogoProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function FilmshoppeeLogo({ 
  size = 'medium', 
  className = '' 
}: FilmshoppeeLogoProps) {
  const [imageError, setImageError] = useState(false)
  
  // Size configurations for logo dimensions
  const sizes = {
    small: { width: 80, height: 40 },
    medium: { width: 120, height: 60 },
    large: { width: 180, height: 90 }
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
          fontSize: size === 'small' ? '0.625rem' : size === 'medium' ? '0.75rem' : '0.875rem',
          color: '#6b7280',
          fontWeight: 600
        }}>
          Filmshoppee
        </span>
      </div>
    )
  }

  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Image
        src="/filmshoppee-logo.png"
        alt="Filmshoppee-Car Facelift Studio"
        width={config.width}
        height={config.height}
        style={{
          objectFit: 'contain',
          maxWidth: '100%',
          height: 'auto'
        }}
        priority={size === 'large'}
        onError={() => setImageError(true)}
      />
    </div>
  )
}

