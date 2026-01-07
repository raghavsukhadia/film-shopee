'use client'

import { Clock, FileText, DollarSign, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/services/excel-export'

interface TimelineEvent {
  event_type: 'entry_created' | 'invoice_linked' | 'payment' | 'entry_closed'
  event_date: string
  amount?: number
  payment_method?: string
  reference_number?: string
  notes?: string
}

interface PaymentTimelineProps {
  entryId: string
  entryCreatedAt: string
  invoiceNumber?: string
  invoiceDate?: string
  payments: Array<{
    id: string
    amount: number
    payment_method: string
    payment_date: string
    reference_number?: string
    notes?: string
  }>
  isClosed: boolean
  closedAt?: string
}

export default function PaymentTimeline({
  entryId,
  entryCreatedAt,
  invoiceNumber,
  invoiceDate,
  payments,
  isClosed,
  closedAt
}: PaymentTimelineProps) {
  const events: TimelineEvent[] = []

  // Entry created
  events.push({
    event_type: 'entry_created',
    event_date: entryCreatedAt
  })

  // Invoice linked
  if (invoiceNumber && invoiceDate) {
    events.push({
      event_type: 'invoice_linked',
      event_date: invoiceDate,
      reference_number: invoiceNumber
    })
  }

  // Payments
  payments.forEach(payment => {
    events.push({
      event_type: 'payment',
      event_date: payment.payment_date,
      amount: payment.amount,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      notes: payment.notes
    })
  })

  // Entry closed
  if (isClosed && closedAt) {
    events.push({
      event_type: 'entry_closed',
      event_date: closedAt
    })
  }

  // Sort by date
  events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'entry_created':
        return <Clock style={{ width: '1rem', height: '1rem' }} />
      case 'invoice_linked':
        return <FileText style={{ width: '1rem', height: '1rem' }} />
      case 'payment':
        return <DollarSign style={{ width: '1rem', height: '1rem' }} />
      case 'entry_closed':
        return <CheckCircle style={{ width: '1rem', height: '1rem' }} />
      default:
        return <Clock style={{ width: '1rem', height: '1rem' }} />
    }
  }

  const getEventLabel = (event: TimelineEvent) => {
    switch (event.event_type) {
      case 'entry_created':
        return 'Entry Created'
      case 'invoice_linked':
        return 'Invoice Linked'
      case 'payment':
        return `Payment: ₹${event.amount?.toFixed(2)} (${event.payment_method})`
      case 'entry_closed':
        return 'Entry Closed'
      default:
        return 'Event'
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'entry_created':
        return '#3b82f6' // blue
      case 'invoice_linked':
        return '#8b5cf6' // purple
      case 'payment':
        return '#059669' // green
      case 'entry_closed':
        return '#10b981' // emerald
      default:
        return '#6b7280' // gray
    }
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
        No timeline events available
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '0',
            bottom: '0',
            width: '2px',
            backgroundColor: '#e5e7eb'
          }}
        />

        {/* Timeline events */}
        {events.map((event, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              paddingLeft: '2.5rem',
              paddingBottom: index < events.length - 1 ? '1.5rem' : '0',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Icon */}
            <div
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                backgroundColor: getEventColor(event.event_type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                zIndex: 1
              }}
            >
              {getEventIcon(event.event_type)}
            </div>

            {/* Event content */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '0.25rem'
              }}>
                {getEventLabel(event)}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginBottom: '0.25rem'
              }}>
                {formatDate(event.event_date)}
              </div>
              {event.reference_number && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  Ref: {event.reference_number}
                </div>
              )}
              {event.notes && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                  marginTop: '0.25rem'
                }}>
                  {event.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

