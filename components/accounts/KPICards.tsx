'use client'

import { DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/services/excel-export'
import type { BillingStats } from '@/types/billing'

interface KPICardsProps {
  stats: BillingStats
  loading?: boolean
}

export default function KPICards({ stats, loading = false }: KPICardsProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ height: '1rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.5rem' }} />
            <div style={{ height: '2rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', width: '60%' }} />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Receivable',
      value: formatCurrency(stats.totalReceivable),
      icon: DollarSign,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: 'Outstanding Amount',
      value: formatCurrency(stats.outstandingAmount),
      icon: AlertCircle,
      color: '#ef4444',
      bgColor: '#fef2f2'
    },
    {
      title: 'Partial Payments',
      value: stats.partialPaymentsCount.toString(),
      icon: Clock,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'Overdue Entries',
      value: stats.overdueEntries.toString(),
      icon: TrendingUp,
      color: '#dc2626',
      bgColor: '#fee2e2'
    }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <div
            key={index}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                backgroundColor: card.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon style={{ width: '1.5rem', height: '1.5rem', color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
              {card.title}
            </div>
          </div>
        )
      })}
    </div>
  )
}

