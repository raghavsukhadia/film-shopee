'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckCircle, Zap, Users, BarChart3, Shield, HeadphonesIcon, ArrowRight, Clock, Star, TrendingUp, Lock, Sparkles } from 'lucide-react'

interface SubscriptionPlan {
  plan_name: string
  plan_display_name: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'annual' | 'quarterly'
  trial_days: number
  is_active: boolean
  features?: string[]
}

export default function PricingPageClient() {
  const router = useRouter()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionPlan()
  }, [])

  const fetchSubscriptionPlan = async () => {
    try {
      const response = await fetch('/api/public/subscription-plans')
      const data = await response.json()
      
      if (data.plans && data.plans.length > 0) {
        // Get the annual plan or the first active plan
        const annualPlan = data.plans.find((p: SubscriptionPlan) => 
          p.billing_cycle === 'annual' && p.is_active
        ) || data.plans.find((p: SubscriptionPlan) => p.is_active) || data.plans[0]
        
        setPlan(annualPlan)
      } else {
        // Default fallback plan
        setPlan({
          plan_name: 'annual',
          plan_display_name: 'Annual Plan',
          amount: 12000,
          currency: 'INR',
          billing_cycle: 'annual',
          trial_days: 1, // 1 day = 24 hours
          is_active: true,
          features: []
        })
      }
    } catch (error) {
      console.error('Error fetching subscription plan:', error)
      // Default fallback plan
      setPlan({
        plan_name: 'annual',
        plan_display_name: 'Annual Plan',
        amount: 12000,
        currency: 'INR',
        billing_cycle: 'annual',
        trial_days: 1, // 1 day = 24 hours
        is_active: true,
        features: []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US')}`
    }
    return `${amount.toLocaleString()}`
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      backgroundImage: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)'
    }}>
      {/* Header */}
      <header style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(to bottom, #ffffff, #fffbef)',
        borderBottom: '2px solid rgba(245, 158, 11, 0.08)',
        boxShadow: '0 1px 3px rgba(245, 158, 11, 0.05)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          gap: '0.375rem',
          justifyContent: 'center',
          flexShrink: 0,
          width: '180px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            width: '100%',
            height: '50px',
            flexShrink: 0
          }}>
            <Image
              src="/logo-nav.jpg"
              alt="FILMSHOPPEÉ - Car Facelift Studio"
              width={180}
              height={50}
              style={{
                objectFit: 'contain',
                width: '100%',
                height: 'auto',
                maxHeight: '50px',
                display: 'block'
              }}
              priority
            />
          </div>
          <div style={{
            fontSize: '0.8125rem',
            color: '#78716c',
            letterSpacing: '0.03em',
            marginTop: '0',
            textAlign: 'left',
            lineHeight: '1.5',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <span style={{ fontWeight: 500 }}>Co-Powered by </span>
            <span style={{ fontWeight: 700, color: '#d97706' }}>Zoravo</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#f59e0b',
              border: '1.5px solid #f59e0b',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff'
              e.currentTarget.style.borderColor = '#d97706'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#f59e0b'
            }}
          >
            Home
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(245, 158, 11, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d97706'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f59e0b'
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(245, 158, 11, 0.2)'
            }}
          >
            Login
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '4rem 2rem' }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '5rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '9999px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#d97706'
          }}>
            <Sparkles style={{ width: '1rem', height: '1rem' }} />
            Simple, Transparent Pricing
          </div>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 900,
            color: '#111827',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.1',
            letterSpacing: '-0.02em'
          }}>
            Choose the Perfect Plan
            <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              for Your Business
            </span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            margin: '0',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6'
          }}>
            One plan. All features. No hidden costs. Start with a 24-hour free trial and explore everything risk-free.
          </p>
        </div>

        {/* Pricing Card */}
        <div style={{
          maxWidth: '900px',
          margin: '0 auto 5rem',
          position: 'relative'
        }}>
          {/* Recommended Badge */}
          <div style={{
            position: 'absolute',
            top: '-1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            color: 'white',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '700',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)'
          }}>
            <Star style={{ width: '1rem', height: '1rem', fill: 'white' }} />
            RECOMMENDED PLAN
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '2rem',
            border: '2px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            {/* Gradient Top Border */}
            <div style={{
              height: '6px',
              background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #7c3aed 100%)'
            }} />

            {/* Pricing Content */}
            <div style={{ padding: '4rem 3rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{
                    display: 'inline-block',
                    width: '2rem',
                    height: '2rem',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #f59e0b',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p style={{ color: '#6b7280', marginTop: '1rem' }}>Loading pricing information...</p>
                </div>
              ) : plan ? (
                <>
                  {/* Price Display */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '2rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <span style={{
                        fontSize: '4.5rem',
                        fontWeight: 900,
                        color: '#111827',
                        lineHeight: '1'
                      }}>
                        {formatPrice(plan.amount, plan.currency)}
                      </span>
                      <span style={{
                        fontSize: '1.5rem',
                        color: '#6b7280',
                        fontWeight: '500'
                      }}>
                        /{plan.billing_cycle === 'annual' ? 'year' : plan.billing_cycle === 'monthly' ? 'month' : 'quarter'}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '1.125rem',
                      color: '#6b7280',
                      margin: '0 0 1.5rem 0',
                      fontWeight: '500'
                    }}>
                      {plan.plan_display_name || `${plan.billing_cycle.charAt(0).toUpperCase() + plan.billing_cycle.slice(1)} Subscription Plan`}
                    </p>
                    
                    {/* 24 Hours Free Trial Badge */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1.5rem',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                      borderRadius: '9999px',
                      border: '2px solid #fbbf24',
                      fontSize: '1rem',
                      color: '#d97706',
                      fontWeight: '700',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                    }}>
                      <Clock style={{ width: '1.25rem', height: '1.25rem' }} />
                      24 Hours Free Trial
                    </div>
                  </div>

                  {/* Features List */}
                  <div style={{
                    marginBottom: '3rem',
                    paddingTop: '2.5rem',
                    borderTop: '2px solid #f3f4f6'
                  }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '2rem',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <Zap style={{ width: '1.5rem', height: '1.5rem', color: '#fbbf24' }} />
                      Everything You Need
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1rem'
                    }}>
                      {[
                        { icon: <Users style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Unlimited Users', highlight: true },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Vehicle Inward Management' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Vehicle & Customer Management' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Service Tracking & Work Orders' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Invoice & Payment Management' },
                        { icon: <BarChart3 style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Financial Reports & Analytics' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'WhatsApp Notifications' },
                        { icon: <TrendingUp style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Daily Reports & KPIs' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Call Follow-up Tracking' },
                        { icon: <CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Customer Requirements Management' },
                        { icon: <Lock style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Role-based Access Control' },
                        { icon: <Shield style={{ width: '1.5rem', height: '1.5rem' }} />, text: 'Priority Support', highlight: true }
                      ].map((feature, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem',
                            backgroundColor: feature.highlight ? '#eff6ff' : '#f9fafb',
                            borderRadius: '0.75rem',
                            border: feature.highlight ? '2px solid #fbbf24' : '1px solid #e5e7eb',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!feature.highlight) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                              e.currentTarget.style.borderColor = '#d1d5db'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!feature.highlight) {
                              e.currentTarget.style.backgroundColor = '#f9fafb'
                              e.currentTarget.style.borderColor = '#e5e7eb'
                            }
                          }}
                        >
                          <div style={{ 
                            color: feature.highlight ? '#f59e0b' : '#10b981', 
                            flexShrink: 0 
                          }}>
                            {feature.icon}
                          </div>
                          <span style={{
                            fontSize: '1rem',
                            color: '#374151',
                            fontWeight: feature.highlight ? '600' : '500',
                            lineHeight: '1.5'
                          }}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => router.push('/')}
                    style={{
                      width: '100%',
                      padding: '1.25rem 2rem',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '1rem',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 15px 35px rgba(245, 158, 11, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <span>Get Started Now</span>
                    <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ color: '#dc2626', fontSize: '1.125rem' }}>Unable to load pricing information. Please try again later.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          marginBottom: '5rem'
        }}>
          {/* Payment Process */}
          <div style={{
            backgroundColor: 'white',
            padding: '2.5rem',
            borderRadius: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
          >
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Shield style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              Payment Process
            </h3>
            <ol style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: '#6b7280',
              lineHeight: '2',
              fontSize: '0.9375rem'
            }}>
              <li>Start your 24-hour free trial</li>
              <li>Submit payment proof in Settings</li>
              <li>Get activated within 24 hours</li>
              <li>Enjoy full access to all features</li>
            </ol>
          </div>

          {/* Support */}
          <div style={{
            backgroundColor: 'white',
            padding: '2.5rem',
            borderRadius: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
          >
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <HeadphonesIcon style={{ width: '1.5rem', height: '1.5rem', color: '#d97706' }} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              Support & Help
            </h3>
            <p style={{
              color: '#6b7280',
              lineHeight: '1.8',
              margin: '0 0 1.5rem 0',
              fontSize: '0.9375rem'
            }}>
              Need assistance? Our support team is here to help you with any questions or issues.
            </p>
            <a
              href="mailto:info@zoravo.in?subject=Pricing Inquiry&body=Hello,%0D%0A%0D%0AI have a question about Zoravo OMS pricing.%0D%0A%0D%0AThank you."
              style={{
                color: '#f59e0b',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Contact Support
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
            </a>
          </div>

          {/* Free Trial */}
          <div style={{
            backgroundColor: 'white',
            padding: '2.5rem',
            borderRadius: '1.5rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform = 'translateY(-4px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
          >
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#16a34a' }} />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem'
            }}>
              24 Hours Free Trial
            </h3>
            <p style={{
              color: '#6b7280',
              lineHeight: '1.8',
              margin: 0,
              fontSize: '0.9375rem'
            }}>
              Start with a 24-hour free trial. No credit card required. Explore all features risk-free before committing to the annual plan.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '4rem 3rem',
          borderRadius: '2rem',
          border: '1px solid #e5e7eb',
          marginBottom: '5rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '3rem',
            textAlign: 'center'
          }}>
            Frequently Asked Questions
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {[
              {
                q: 'What is included in the annual plan?',
                a: 'The annual plan includes all features: unlimited users, vehicle inward management, vehicle & customer management, service tracking & work orders, invoice & payment management, financial reports & analytics, WhatsApp notifications, daily reports & KPIs, call follow-up tracking, customer requirements management, role-based access control (Admin, Manager, Coordinator, Installer, Accountant), and priority support.'
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, you can cancel your subscription at any time. However, you will continue to have access until the end of your billing period.'
              },
              {
                q: 'Is there a setup fee?',
                a: 'No, there are no setup fees or hidden costs. The ₹12,000 annual fee is all-inclusive.'
              },
              {
                q: 'What happens after the free trial?',
                a: 'After your 24-hour free trial, you can continue using Zoravo OMS by submitting payment proof. Your account will be activated within 24 hours of payment verification.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a satisfaction guarantee. If you are not happy with the service within the first 30 days, contact our support team for assistance.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <h4 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  {faq.q}
                </h4>
                <p style={{
                  color: '#6b7280',
                  lineHeight: '1.8',
                  margin: 0,
                  fontSize: '1rem'
                }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          textAlign: 'center',
          padding: '5rem 3rem',
          background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          borderRadius: '2rem',
          color: 'white',
          boxShadow: '0 20px 60px rgba(245, 158, 11, 0.3)'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            marginBottom: '1rem',
            color: 'white'
          }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{
            fontSize: '1.25rem',
            marginBottom: '2.5rem',
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Join hundreds of businesses already using Zoravo OMS to streamline their operations
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '1.25rem 3rem',
              backgroundColor: 'white',
              color: '#f59e0b',
              border: 'none',
              borderRadius: '1rem',
              fontSize: '1.125rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            Start Your Free Trial
            <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
