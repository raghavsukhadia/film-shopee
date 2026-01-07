'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
  options: Array<{ value: string; label: string }>
  containerStyle?: React.CSSProperties
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helperText, required, options, containerStyle, className, ...props }, ref) => {
    return (
      <div style={{ ...containerStyle, marginBottom: '1rem' }}>
        {label && (
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            {label}
            {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          <select
            ref={ref}
            {...props}
            style={{
              width: '100%',
              padding: '0.625rem 2.5rem 0.625rem 0.875rem',
              border: `1px solid ${error ? '#ef4444' : '#e5e7eb'}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: props.disabled ? '#f9fafb' : 'white',
              appearance: 'none',
              cursor: props.disabled ? 'not-allowed' : 'pointer',
              ...(error && {
                borderColor: '#ef4444',
                boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
              })
            }}
            className={className}
            onFocus={(e) => {
              if (!error) {
                e.target.style.borderColor = '#3b82f6'
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }
            }}
            onBlur={(e) => {
              if (!error) {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}>
            <ChevronDown style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
          </div>
          {error && (
            <div style={{
              position: 'absolute',
              right: '2.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <AlertCircle style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />
            </div>
          )}
        </div>
        {error && (
          <p style={{
            fontSize: '0.75rem',
            color: '#ef4444',
            margin: '0.25rem 0 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} />
            {error}
          </p>
        )}
        {helperText && !error && (
          <p style={{
            fontSize: '0.75rem',
            color: '#64748b',
            margin: '0.25rem 0 0 0'
          }}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'

export default FormSelect

