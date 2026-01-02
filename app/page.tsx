'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Car, 
  Wrench, 
  Users, 
  BarChart3, 
  Shield, 
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Settings,
  FileText,
  X,
  AlertCircle,
  Briefcase,
  User,
  HelpCircle,
  Mail,
  Play,
  Linkedin,
  Instagram,
  Youtube,
  Zap,
  Target,
  Building2,
  Facebook,
  MapPin,
  Code,
  Phone
} from 'lucide-react'
import Logo from '@/components/Logo'

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [animatedStats, setAnimatedStats] = useState({
    vehicles: 0,
    customers: 0,
    services: 0,
    team: 0
  })

  // Check for createAccount query parameter
  useEffect(() => {
    const createAccount = searchParams.get('createAccount')
    if (createAccount === 'true') {
      setShowCreateAccount(true)
      // Remove query parameter from URL
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animated counters for stats
  useEffect(() => {
    const targets = { vehicles: 2500, customers: 1800, services: 5200, team: 50 }
    const duration = 2000
    const steps = 60
    const increment = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      
      setAnimatedStats({
        vehicles: Math.floor(targets.vehicles * progress),
        customers: Math.floor(targets.customers * progress),
        services: Math.floor(targets.services * progress),
        team: Math.floor(targets.team * progress)
      })

      if (currentStep >= steps) {
        clearInterval(timer)
        setAnimatedStats(targets)
      }
    }, increment)

    return () => clearInterval(timer)
  }, [])


  // Features organized in 3 tiers
  const coreModules = [
    {
      icon: Car,
      title: 'Track Every Vehicle. Every Time.',
      description: 'Complete vehicle lifecycle management from intake to delivery with real-time status tracking and detailed history.',
      tier: 'core'
    },
    {
      icon: Wrench,
      title: 'Service Tracking Made Simple',
      description: 'Real-time work order management with installer assignments, progress monitoring, and automated notifications.',
      tier: 'core'
    },
    {
      icon: FileText,
      title: 'Automated Invoicing & Payments',
      description: 'Streamlined invoicing system with payment tracking, automated reminders, and financial reporting.',
      tier: 'core'
    }
  ]

  const growthTools = [
    {
      icon: BarChart3,
      title: 'Analytics That Drive Decisions',
      description: 'Powerful insights into business performance with customizable reports, KPIs, and revenue analytics.',
      tier: 'growth'
    },
    {
      icon: Users,
      title: 'Customer Relationship Management',
      description: 'Comprehensive customer database with service history, communication tracking, and follow-up automation.',
      tier: 'growth'
    },
    {
      icon: Zap,
      title: 'Workflow Automation',
      description: 'Automate repetitive tasks, send daily reports, and streamline operations with smart notifications.',
      tier: 'growth'
    }
  ]

  const teamTools = [
    {
      icon: Shield,
      title: 'Role-Based Access Control',
      description: 'Secure multi-role system with granular permissions for admins, managers, coordinators, and installers.',
      tier: 'team'
    },
    {
      icon: Building2,
      title: 'Multi-Tenant Franchise Support',
      description: 'Manage multiple locations and franchises with complete data isolation and centralized oversight.',
      tier: 'team'
    },
    {
      icon: Clock,
      title: 'Real-Time Collaboration',
      description: 'Live status updates, instant notifications, and seamless team communication across all devices.',
      tier: 'team'
    }
  ]

  const stats = [
    { 
      label: 'Vehicles Processed', 
      value: animatedStats.vehicles, 
      icon: Car,
      context: 'across 40+ workshops nationwide'
    },
    { 
      label: 'Happy Customers', 
      value: animatedStats.customers, 
      icon: Users,
      context: 'trusting us with their business'
    },
    { 
      label: 'Services Completed', 
      value: animatedStats.services, 
      icon: CheckCircle,
      context: 'with 98% customer satisfaction'
    },
    { 
      label: 'Team Members', 
      value: animatedStats.team, 
      icon: Settings,
      context: 'serving businesses of every scale'
    }
  ]

  return (
    <div style={{ 
      fontFamily: 'Inter, system-ui, sans-serif',
      width: '100%',
      overflowX: 'hidden',
      minHeight: '100vh'
    }}>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        /* Responsive Styles */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .hero-content {
            text-align: left !important;
          }
          .dashboard-preview {
            max-width: 100% !important;
            order: -1 !important;
          }
        }
        
        @media (max-width: 640px) {
          .hero-content {
            text-align: center !important;
          }
          .hero-content > div:first-child {
            justify-content: center !important;
            align-items: center !important;
          }
        }
        
        @media (max-width: 768px) {
          nav > div {
            padding: 0 1rem !important;
            flex-wrap: wrap !important;
          }
          nav .nav-buttons {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            margin-top: 0.5rem !important;
          }
          nav .nav-buttons button,
          nav .nav-buttons a {
            min-width: auto !important;
            padding: 0.5rem 1rem !important;
            font-size: 0.75rem !important;
          }
          .hero-section {
            padding-top: 8rem !important;
            min-height: auto !important;
            padding-bottom: 3rem !important;
          }
          .hero-grid {
            padding: 0 1rem !important;
            gap: 2rem !important;
          }
          .hero-content h1 {
            font-size: 2rem !important;
            line-height: 1.2 !important;
          }
          .hero-content p {
            font-size: 1rem !important;
          }
          .dashboard-preview {
            padding: 1.5rem !important;
          }
          .dashboard-preview > div > div {
            grid-template-columns: 1fr !important;
          }
          .hero-content button {
            width: 100% !important;
            max-width: 100% !important;
          }
          .hero-content > div:first-child {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.5rem !important;
          }
          section {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
          h2 {
            font-size: 2rem !important;
          }
          h3 {
            font-size: 1.25rem !important;
          }
          footer > div > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          footer > div > div:first-child > div {
            align-items: center !important;
            text-align: center !important;
          }
          footer > div > div:last-child {
            flex-direction: column !important;
            text-align: center !important;
            gap: 1rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          nav .logo-container {
            flex-direction: row !important;
            align-items: center !important;
          }
          nav .logo-container > div:first-child {
            margin-right: 0.5rem !important;
          }
        }
      `}</style>
      {/* Sticky Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : '#ffffff',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        borderBottom: '1px solid #e5e7eb',
        padding: isScrolled ? '0.75rem 0' : '1rem 0',
        boxShadow: isScrolled ? '0 4px 6px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        width: '100%'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div className="logo-container" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            gap: '0.25rem',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <Logo size="medium" showText={true} variant="dark" />
            </div>
            <div style={{
              fontSize: '0.6875rem',
              color: '#6b7280',
              letterSpacing: '0.02em',
              marginTop: '0.125rem',
              textAlign: 'left'
            }}>
              <span style={{ fontWeight: 400 }}>Co-Powered by </span>
              <span style={{ fontWeight: 700 }}>Zoravo</span>
            </div>
          </div>
          
          <div className="nav-buttons" style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#f59e0b',
                border: '1.5px solid #f59e0b',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#fef3c7'
                e.currentTarget.style.borderColor = '#d97706'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#f59e0b'
              }}
            >
              Login
            </button>
            <button
              onClick={() => setShowCreateAccount(true)}
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 1px 2px rgba(245, 158, 11, 0.2)',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#d97706'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#f59e0b'
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(245, 158, 11, 0.2)'
              }}
            >
              Register
            </button>
            <a
              href="mailto:info@filmshoppee.com"
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9'
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.color = '#475569'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              <HelpCircle style={{ width: '1rem', height: '1rem' }} />
              Contact Us
            </a>
            <button
              onClick={() => router.push('/about')}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9'
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.color = '#475569'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '7rem',
        paddingBottom: '3rem',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
      }}>
        {/* Enhanced Background with Gradient and Animated Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.02) 50%, rgba(245, 158, 11, 0.03) 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 15s ease infinite',
          zIndex: 0
        }}></div>
        {/* Floating Icons Background */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '100px',
          height: '100px',
          opacity: 0.1,
          zIndex: 0,
          animation: 'float 20s ease-in-out infinite'
        }}>
          <Car style={{ width: '100%', height: '100%', color: '#f59e0b' }} />
        </div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          width: '80px',
          height: '80px',
          opacity: 0.1,
          zIndex: 0,
          animation: 'float 25s ease-in-out infinite',
          animationDelay: '2s'
        }}>
          <BarChart3 style={{ width: '100%', height: '100%', color: '#f97316' }} />
        </div>
        <div className="hero-grid" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          width: '100%'
        }}>
          {/* Left Content */}
          <div className="hero-content" style={{ 
            animation: 'fadeInUp 0.8s ease-out',
            width: '100%'
          }}>
            {/* Social Proof with Partner Logos */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#fef3c7',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#f59e0b',
                fontWeight: '600',
                border: '1px solid #fde68a'
              }}>
                <Star style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
                Trusted by 200+ Businesses
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <span>Partners:</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {['AutoHub', 'CarCare', 'PremiumAuto', 'FastTrack'].map((name, i) => (
                    <div key={i} style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#4b5563',
                      border: '1px solid #e5e7eb'
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.75rem)',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 1.5rem 0',
              lineHeight: '1.1',
              letterSpacing: '-0.03em',
              width: '100%'
            }}>
              Zoravo OMS — The Complete
              <br />
              <span style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Car Accessories Business Suite
              </span>
            </h1>
            <p style={{
              fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
              color: '#475569',
              margin: '0 0 1rem 0',
              lineHeight: '1.7',
              fontWeight: '500',
              width: '100%'
            }}>
              Streamline Your Car Accessories Business — From Job Intake to Delivery, Seamlessly.
            </p>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#64748b',
              margin: '0 0 2rem 0',
              lineHeight: '1.7',
              fontWeight: '400',
              width: '100%'
            }}>
              Manage jobs, track vehicles, and get paid faster with one powerful system. Run your operations with <strong style={{ color: '#1e293b' }}>speed, clarity, and complete control</strong>.
            </p>
            
            {/* Key Benefits */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              {[
                { icon: '✓', text: 'Complete vehicle lifecycle management' },
                { icon: '✓', text: 'Real-time installation tracking' },
                { icon: '✓', text: 'Automated invoicing & payments' },
                { icon: '✓', text: 'Multi-tenant support for franchises' }
              ].map((benefit, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#475569',
                  fontSize: '1rem'
                }}>
                  <span style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}>{benefit.icon}</span>
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '2rem', 
              flexWrap: 'wrap',
              width: '100%'
            }}>
              <button
                onClick={() => setShowCreateAccount(true)}
                style={{
                  padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2.5rem)',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: '700',
                  fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                  width: '100%',
                  maxWidth: '300px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.5)'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
                }}
              >
                🚀 Start Free Trial
                <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              
              <button
                onClick={() => {
                  // Scroll to dashboard preview or show demo
                  const dashboardSection = document.getElementById('dashboard-preview')
                  if (dashboardSection) {
                    dashboardSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                style={{
                  padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
                  backgroundColor: 'white',
                  color: '#f59e0b',
                  border: '1.5px solid #f59e0b',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  maxWidth: '300px',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#fef3c7'
                  e.currentTarget.style.borderColor = '#d97706'
                  e.currentTarget.style.color = '#d97706'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#f59e0b'
                  e.currentTarget.style.color = '#f59e0b'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Play style={{ width: '1.25rem', height: '1.25rem', fill: '#f59e0b' }} />
                Watch Demo
              </button>
            </div>

          </div>

          {/* Right Content - Dashboard Preview */}
          <div 
            id="dashboard-preview"
            className="dashboard-preview"
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              animation: 'fadeInUp 1s ease-out 0.3s both',
              transition: 'all 0.3s ease',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              backgroundColor: 'transparent',
              borderRadius: '0.5rem',
              padding: '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '1rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}>
                    <BarChart3 style={{ color: 'white', width: '1.5rem', height: '1.5rem' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827', letterSpacing: '-0.02em' }}>
                      Dashboard Overview
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                      Real-time business insights at a glance
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '1.25rem', 
                marginBottom: '2rem',
                width: '100%'
              }}>
                {[
                  { label: 'Vehicles in Workshop', value: '12', color: '#f59e0b', icon: Car, bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' },
                  { label: 'Jobs in Progress', value: '8', color: '#059669', icon: Wrench, bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' },
                  { label: "Today's Intakes", value: '5', color: '#dc2626', icon: Clock, bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
                  { label: 'Monthly Revenue', value: '₹2.4L', color: '#7c3aed', icon: TrendingUp, bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }
                ].map((stat, index) => {
                  const IconComponent = stat.icon
                  return (
                    <div key={index} style={{
                      padding: '1.5rem',
                      background: stat.bgGradient,
                      borderRadius: '1rem',
                      border: `2px solid ${stat.color}20`,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = `0 12px 24px ${stat.color}30`
                      e.currentTarget.style.borderColor = `${stat.color}40`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = `${stat.color}20`
                    }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '0.75rem',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <IconComponent style={{ width: '1.25rem', height: '1.25rem', color: stat.color }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '2.25rem', fontWeight: '800', color: stat.color, marginBottom: '0.5rem', lineHeight: '1' }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '600' }}>
                        {stat.label}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Enhanced Revenue Chart with Mini Visualization */}
              <div style={{
                height: '180px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '2px solid #e5e7eb',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-end', 
                  height: 'calc(100% - 2rem)', 
                  gap: '0.75rem',
                  paddingBottom: '1.5rem'
                }}>
                  {[65, 80, 55, 90, 75, 85, 70].map((height, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '0.5rem 0.5rem 0 0',
                        minWidth: '24px',
                        animation: `fadeInUp 0.6s ease-out ${i * 0.1}s both`,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9'
                        e.currentTarget.style.transform = 'scaleY(1.05) translateY(-4px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.transform = 'scaleY(1) translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.2)'
                      }}
                      title={`Revenue: ₹${(height * 1000).toLocaleString()}`}
                    />
                  ))}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '0.75rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <TrendingUp style={{ width: '1rem', height: '1rem', color: '#f59e0b' }} />
                  Revenue Trend → View more details
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Reorganized into 3 Tiers */}
      <section id="features" style={{
        padding: '4rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 0.75rem 0',
              letterSpacing: '-0.02em',
              padding: '0 1rem'
            }}>
              Everything You Need to Manage Your Business
            </h2>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#64748b',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6',
              padding: '0 1rem'
            }}>
              Our comprehensive platform provides all the tools you need to efficiently manage 
              your car accessories business from start to finish.
            </p>
          </div>

          {/* Core Modules */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <Target style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
              <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Core Modules
              </h3>
            </div>
            <div className="features-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {coreModules.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.15)'
                  e.currentTarget.style.borderColor = '#f59e0b'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Tools */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Growth Tools
              </h3>
            </div>
            <div className="features-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {growthTools.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(5, 150, 105, 0.15)'
                  e.currentTarget.style.borderColor = '#059669'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Tools */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <Users style={{ width: '1.5rem', height: '1.5rem', color: '#7c3aed' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Team Tools
              </h3>
            </div>
            <div className="features-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {teamTools.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.15)'
                  e.currentTarget.style.borderColor = '#7c3aed'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#f8fafc'
      }}>
        <div className="stats-grid" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              textAlign: 'center',
              padding: '2.5rem 2rem',
              backgroundColor: 'white',
              borderRadius: '1.25rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              transition: 'all 0.3s ease',
              animation: `fadeInUp 0.8s ease-out ${index * 0.1}s both`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
            >
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                margin: '0 auto 1.25rem auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <stat.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
              </div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                color: '#1f2937', 
                marginBottom: '0.5rem',
                lineHeight: '1.2'
              }}>
                {stat.value.toLocaleString()}+
              </div>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.375rem'
              }}>
                {stat.label}
              </div>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                {stat.context}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filmshoppee Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '2rem',
              marginBottom: '1rem'
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#f59e0b',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Co-Powered By
              </span>
            </div>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.02em'
            }}>
              Filmshoppee – The Car Facelift Studio
            </h2>
            <p style={{
              fontSize: '1.25rem',
              color: '#64748b',
              maxWidth: '800px',
              margin: '0 auto 0.5rem',
              lineHeight: '1.6',
              fontWeight: '600'
            }}>
              We Don't Modify Cars, We Facelift Cars
            </p>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '900px',
              margin: '0 auto',
              lineHeight: '1.7'
            }}>
              We at Filmshoppee have a solution that is safe & affordable. We give your car a facelift providing 
              a flawless minor model update makeover without disturbing the core of the automobile. Our professional 
              team helps you choose the best parts available based on your specific requirements.
            </p>
          </div>

          {/* Contact Information */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            width: '100%'
          }}>
            <div style={{
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MapPin style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
                </div>
                <div>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: '0 0 0.25rem 0'
                  }}>
                    Head Branch
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    margin: 0
                  }}>
                    Location
                  </p>
                </div>
              </div>
              <p style={{
                fontSize: '1rem',
                color: '#475569',
                lineHeight: '1.7',
                margin: 0
              }}>
                Filmshoppee, VIP Road, near Vijay Sales, Vesu, Surat, Gujarat 395007
              </p>
            </div>

            <div style={{
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Phone style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
                </div>
                <div>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: '0 0 0.25rem 0'
                  }}>
                    Contact Us
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    margin: 0
                  }}>
                    Phone & Email
                  </p>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <a
                  href="tel:+919574986667"
                  style={{
                    fontSize: '1rem',
                    color: '#f59e0b',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'block',
                    marginBottom: '0.5rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#d97706'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#f59e0b'
                  }}
                >
                  +91 95749 86667
                </a>
                <a
                  href="mailto:info@filmshoppee.com"
                  style={{
                    fontSize: '1rem',
                    color: '#f59e0b',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#d97706'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#f59e0b'
                  }}
                >
                  info@filmshoppee.com
                </a>
              </div>
            </div>

            <div style={{
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Building2 style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
                </div>
                <div>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: '0 0 0.25rem 0'
                  }}>
                    Visit Our Website
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    margin: 0
                  }}>
                    Learn More
                  </p>
                </div>
              </div>
              <a
                href="https://filmshoppee.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '1rem',
                  color: '#f59e0b',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#d97706'
                  e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#f59e0b'
                  e.currentTarget.style.textDecoration = 'none'
                }}
              >
                filmshoppee.com
                <ArrowRight style={{ width: '1rem', height: '1rem' }} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#0f172a',
        color: 'white',
        width: '100%',
        overflow: 'hidden'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          width: '100%'
        }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            fontWeight: 'bold',
            margin: '0 0 1rem 0',
            padding: '0 1rem'
          }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{
            fontSize: 'clamp(0.9375rem, 2vw, 1rem)',
            color: 'rgba(255,255,255,0.9)',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.6',
            padding: '0 1rem'
          }}>
            Join hundreds of car accessories businesses already using Zoravo OMS 
            to streamline their operations and grow their revenue.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            width: '100%',
            padding: '0 1rem'
          }}>
            <button
              onClick={() => setShowCreateAccount(true)}
              style={{
                padding: '1.125rem 2.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(245, 158, 11, 0.5)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.4)'
              }}
            >
              Start Your Business
              <ArrowRight style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '1.125rem 2.5rem',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '0.75rem',
                fontWeight: '600',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer style={{
        padding: '4rem 2rem 2rem',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
            paddingBottom: '3rem',
            alignItems: 'flex-start'
          }}>
            {/* Brand Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              minWidth: '250px'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <Logo size="medium" showText={true} variant="light" />
              </div>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.9375rem',
                color: '#9ca3af',
                lineHeight: '1.7',
                maxWidth: '100%',
                textAlign: 'left'
              }}>
                Zoravo OMS – Empowering Car Accessories Businesses Since 2024.
              </p>
              
              {/* Co-Powered by Zoravo */}
              <div style={{
                marginBottom: '1.5rem',
                fontSize: '0.75rem',
                color: '#6b7280',
                letterSpacing: '0.02em',
                textAlign: 'left'
              }}>
                <span style={{ fontWeight: 400 }}>Co-Powered by </span>
                <span style={{ fontWeight: 600, color: '#9ca3af' }}>Zoravo</span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <a
                  href="https://www.instagram.com/filmshoppee"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E4405F'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Instagram style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
                <a
                  href="https://www.facebook.com/filmshoppee"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1877F2'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Facebook style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
                <a
                  href="https://www.youtube.com/@filmshoppee"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FF0000'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Youtube style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
              </div>
            </div>

            {/* Company Links */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0',
                textAlign: 'left'
              }}>
                Company
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                alignItems: 'flex-start',
                width: '100%'
              }}>
                <a
                  href="/about"
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  About
                </a>
                <a
                  href="/pricing"
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Pricing
                </a>
                <a
                  href="mailto:info@zoravo.in?subject=Support Request&body=Hello,%0D%0A%0D%0AI need assistance with Zoravo OMS.%0D%0A%0D%0AThank you."
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Support
                </a>
                <a
                  href="mailto:info@zoravo.in?subject=Contact Request&body=Hello,%0D%0A%0D%0AI would like to get in touch regarding Zoravo OMS.%0D%0A%0D%0AThank you."
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Contact
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0',
                textAlign: 'left'
              }}>
                Product
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                alignItems: 'flex-start',
                width: '100%'
              }}>
                {['Features', 'Modules', 'Integrations', 'API', 'Roadmap'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      fontSize: '0.875rem',
                      color: '#9ca3af',
                      textDecoration: 'none',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af'
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* Resources Links */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0',
                textAlign: 'left'
              }}>
                Resources
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                alignItems: 'flex-start',
                width: '100%'
              }}>
                {['Blog', 'Case Studies', 'Help Center', 'Community', 'Status'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      fontSize: '0.875rem',
                      color: '#9ca3af',
                      textDecoration: 'none',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af'
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'left',
              flex: '1 1 auto',
              minWidth: '200px'
            }}>
              © 2025 Zoravo OMS. All rights reserved.
            </p>
            <div style={{
              display: 'flex',
              gap: '2rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <a href="#" style={{ color: '#6b7280', textDecoration: 'none', whiteSpace: 'nowrap' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#6b7280', textDecoration: 'none', whiteSpace: 'nowrap' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Account Modal */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} />}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  )
}

// Create Account Modal Component
function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    organizationName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone,
          adminPassword: formData.adminPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.push(`/login?tenant=${data.tenant_code}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-in'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .modal-container {
            grid-template-columns: 1fr !important;
          }
          .marketing-side {
            display: none !important;
          }
        }
      `}</style>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        maxWidth: '1100px',
        width: '100%',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        animation: 'slideUp 0.3s ease-out'
      }}
      className="modal-container"
      onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side - Marketing Content */}
        <div className="marketing-side" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '-1rem',
                right: '-1rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '2.5rem',
                height: '2.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '1rem' }}>
                Start Your Business Journey
              </div>
              <div style={{ fontSize: '1.125rem', opacity: 0.95, lineHeight: '1.6' }}>
                Join hundreds of car accessories businesses already using Zoravo OMS to streamline operations and grow revenue.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { icon: '🚀', title: 'Get Started in Minutes', desc: 'Quick setup, no technical knowledge required' },
                { icon: '📊', title: 'Complete Business Management', desc: 'All tools in one place' },
                { icon: '💰', title: 'Affordable Pricing', desc: '₹12,000/year - Best value in the market' },
                { icon: '🛡️', title: '24-Hour Free Trial', desc: 'Try before you commit' }
              ].map((feature, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '2rem', flexShrink: 0 }}>{feature.icon}</div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{feature.title}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.15)', borderRadius: '1rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.95, marginBottom: '0.5rem' }}>✨ Trusted by 200+ Businesses</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>₹12,000<span style={{ fontSize: '1rem', fontWeight: '400' }}>/year</span></div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>Just ₹1,000/month • No hidden fees</div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          padding: '3.5rem',
          overflowY: 'auto',
          maxHeight: '95vh',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            marginBottom: '3rem'
          }}>
            <h2 style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              color: '#111827',
              margin: '0 0 0.75rem 0',
              letterSpacing: '-0.02em'
            }}>
              Create Your Account
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.6'
            }}>
              Fill in your details to get started with Zoravo OMS
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle style={{ width: '3rem', height: '3rem', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1f2937' }}>
                Account Created Successfully! 🎉
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '1rem' }}>
                Your account is under review. You'll receive your tenant number shortly.
              </p>
              <div style={{
                padding: '1rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '0.75rem',
                marginTop: '1.5rem'
              }}>
                <p style={{ color: '#059669', fontWeight: '600', fontSize: '0.875rem', margin: 0 }}>
                  ⏰ Your account will be active for 24 hours. Please submit payment proof to continue.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Company Information Section */}
              <div style={{
                marginBottom: '2rem'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.75rem'
                }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="e.g., ABC Car Accessories"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    backgroundColor: '#fafafa'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f59e0b'
                    e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                    e.target.style.backgroundColor = '#ffffff'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                    e.target.style.backgroundColor = '#fafafa'
                  }}
                />
              </div>

              {/* Admin Account Section */}
              <div style={{
                marginBottom: '2rem'
              }}>
                <h3 style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '700', 
                  color: '#111827', 
                  margin: '0 0 1.5rem 0',
                  paddingBottom: '0.75rem',
                  borderBottom: '2px solid #f3f4f6'
                }}>
                  Admin Account Details
                </h3>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="John Doe"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b'
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                        e.target.style.backgroundColor = '#ffffff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = '#fafafa'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Email Address <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="admin@yourcompany.com"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b'
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                        e.target.style.backgroundColor = '#ffffff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = '#fafafa'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.adminPhone}
                      onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                      placeholder="+91 9876543210"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b'
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                        e.target.style.backgroundColor = '#ffffff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = '#fafafa'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="At least 8 characters"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b'
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                        e.target.style.backgroundColor = '#ffffff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = '#fafafa'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9375rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter your password"
                      style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '0.75rem',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        outline: 'none',
                        backgroundColor: '#fafafa'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b'
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                        e.target.style.backgroundColor = '#ffffff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb'
                        e.target.style.boxShadow = 'none'
                        e.target.style.backgroundColor = '#fafafa'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Info Cards */}
              <div style={{
                display: 'grid',
                gap: '1rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  color: 'white',
                  boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'
                }}>
                  <div style={{ fontSize: '0.8125rem', opacity: 0.95, marginBottom: '0.5rem', fontWeight: '500' }}>
                    Special Launch Price
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '800', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.5rem'
                  }}>
                    ₹12,000<span style={{ fontSize: '1rem', fontWeight: '400', opacity: 0.9 }}>/year</span>
                  </div>
                  <div style={{ fontSize: '0.9375rem', opacity: 0.95, fontWeight: '500' }}>
                    Just ₹1,000/month • No hidden fees
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  fontSize: '0.875rem',
                  color: '#78350f',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.875rem'
                }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '0.9375rem' }}>
                      24-Hour Free Trial
                    </div>
                    <div style={{ lineHeight: '1.6', color: '#92400e' }}>
                      Your account will be active for 24 hours. Submit payment proof in settings to activate permanently.
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1.125rem 1.5rem',
                  background: loading 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                    : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.875rem',
                  fontWeight: '700',
                  fontSize: '1.0625rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: loading ? 'none' : '0 10px 25px rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(245, 158, 11, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.3)'
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '1.25rem',
                      height: '1.25rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Get Started Now
                    <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
                  </>
                )}
              </button>

              <p style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                textAlign: 'center',
                margin: 0
              }}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
