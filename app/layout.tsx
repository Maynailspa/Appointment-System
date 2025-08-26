// app/layout.tsx
'use client'

import './globals.css'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import MobileHeaderWorkerSelector from '../components/MobileHeaderWorkerSelector'
import { WorkerSelectionProvider, useWorkerSelection } from '../contexts/WorkerSelectionContext'

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // Use worker selection context
  const { selectedWorkerId, setSelectedWorkerId } = useWorkerSelection()
  
  // Force sidebar to always be collapsed (minimized)
  const getSavedSidebarState = () => {
    return true // Always return true to keep sidebar minimized
  }
  
  const [isCollapsed, setIsCollapsed] = useState(true) // Always start collapsed
  
  // Load saved state on mount and check mobile
  useEffect(() => {
    setIsCollapsed(true) // Force collapsed state
    
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(true) // Auto-collapse on mobile
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Add viewport meta tag for safe area support
    const existingViewport = document.querySelector('meta[name="viewport"]')
    if (existingViewport) {
      existingViewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
    } else {
      const viewportMeta = document.createElement('meta')
      viewportMeta.name = 'viewport'
      viewportMeta.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
      document.head.appendChild(viewportMeta)
    }
    
    // Clear any saved sidebar state to prevent expansion
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sidebarCollapsed')
    }
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  


  // Get active page for sidebar highlighting
  const getActivePage = () => {
    if (pathname === '/') return 'home'
    if (pathname.startsWith('/calendar')) return 'calendar'
    if (pathname.startsWith('/customers')) return 'customers'
    if (pathname.startsWith('/staff')) return 'staff'
    if (pathname.startsWith('/check-in')) return 'checkin'
    if (pathname.startsWith('/sms')) return 'sms'
    if (pathname.startsWith('/appointments')) return 'calendar' // Appointments are part of calendar
    if (pathname.startsWith('/reports')) return 'reports'
    if (pathname.startsWith('/settings')) return 'settings'
    return 'home'
  }

  const activePage = getActivePage()

  // Kiosk route renders without sidebar/navigation
  const isKiosk = pathname?.startsWith('/check-in/kiosk')
  if (isKiosk) {
    return (
      <html lang="en">
        <body style={{ margin: 0, padding: 0, fontFamily: "'Roboto', 'Helvetica Neue', sans-serif", background: '#0f172a' }}>
          <div style={{ minHeight: '100vh' }}>{children}</div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Roboto', 'Helvetica Neue', sans-serif" }}>
        {/* Mobile Menu Overlay */}
        {isMobile && showMobileMenu && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setShowMobileMenu(false)}
          />
        )}
        
        <div style={{ 
          display: 'flex', 
          height: '100vh', 
          overflow: 'hidden', 
          background: '#f5f7fa',
          position: 'relative'
        }}>
          {/* 🔥 PERSISTENT GLASSMORPHISM SIDEBAR */}
          <div data-sidebar="manager" style={{
            width: isMobile ? (showMobileMenu ? '280px' : '0px') : (isCollapsed ? '60px' : '200px'),
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
            height: '100%',
            boxShadow: isMobile ? '0 4px 20px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.06)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: isMobile ? '16px 0' : '20px 0',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(224, 230, 237, 0.3)',
            transition: 'all 0.3s ease-in-out',
            fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
            position: isMobile ? 'fixed' : 'relative',
            zIndex: isMobile ? 1000 : 1000,
            left: 0,
            top: 0,
            overflow: isMobile ? 'auto' : 'hidden'
          }}>
            {/* Sidebar Header */}
            <div style={{ 
              padding: '0 16px', 
              marginBottom: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center' 
            }}>
              {!isCollapsed && (
                <>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    marginBottom: '20px' 
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      background: '#4c6ef5', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 'bold', 
                      fontSize: '18px' 
                    }}>
                      M
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '600', 
                      color: '#1a202c' 
                    }}>
                      May Nails & Spa
                    </div>
                  </div>

                  {/* New Booking Button */}
                  <button
                    style={{
                      margin: '0 auto 20px',
                      padding: '10px 20px',
                      background: 'linear-gradient(90deg, #4c6ef5, #6366f1)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(76, 110, 245, 0.3)',
                      transition: 'background 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      width: '160px',
                      height: '42px',
                      fontWeight: '500',
                      textAlign: 'center',
                      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
                    }}
                    onClick={() => router.push('/calendar')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #3c5ce5, #4c6ef5)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 110, 245, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #4c6ef5, #6366f1)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 110, 245, 0.3)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ marginRight: '8px', width: '16px', height: '16px', fill: '#fff' }}>
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    New Booking
                  </button>
                </>
              )}

              {isCollapsed && (
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: '#4c6ef5', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  marginBottom: '20px'
                }}>
                  M
                </div>
              )}


            </div>

            {/* Navigation */}
            <nav style={{ 
              flex: 1, 
              padding: '0 0 20px', 
              overflowY: 'auto',
              fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
            }}>
              {/* Mobile Close Button */}
              {isMobile && (
                <div style={{
                  padding: '0 16px 16px',
                  borderBottom: '1px solid rgba(224, 230, 237, 0.3)',
                  marginBottom: '16px'
                }}>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              )}
              {/* Home */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'home' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'home' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'home' ? '500' : '400',
                  boxShadow: activePage === 'home' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'home') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'home') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Home'}
              </a>

              {/* Calendar */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'calendar' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'calendar' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'calendar' ? '500' : '400',
                  boxShadow: activePage === 'calendar' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/calendar'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'calendar') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'calendar') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Calendar'}
              </a>

              {/* Customers */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'customers' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'customers' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'customers' ? '500' : '400',
                  boxShadow: activePage === 'customers' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/customers'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'customers') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'customers') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Customers'}
              </a>

              {/* Team (formerly Staff) */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'staff' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'staff' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'staff' ? '500' : '400',
                  boxShadow: activePage === 'staff' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/staff'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'staff') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'staff') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <circle cx="7" cy="8" r="3"/>
                    <path d="M7 12c-3.31 0-6 2.69-6 6v2c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-2c0-3.31-2.69-6-6-6z"/>
                    <circle cx="17" cy="8" r="3"/>
                    <path d="M17 12c-3.31 0-6 2.69-6 6v2c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-2c0-3.31-2.69-6-6-6z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Team'}
              </a>

              {/* Check In */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'checkin' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'checkin' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'checkin' ? '500' : '400',
                  boxShadow: activePage === 'checkin' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/check-in'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'checkin') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'checkin') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M9 16.17l-3.88-3.88L3.7 13.71l5.3 5.3 11-11-1.41-1.41z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Check In'}
              </a>



              {/* SMS */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'sms' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'sms' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'sms' ? '500' : '400',
                  boxShadow: activePage === 'sms' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/sms'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'sms') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'sms') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
                  </svg>
                </div>
                {!isCollapsed && 'SMS'}
              </a>

              {/* Reports */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'reports' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'reports' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'reports' ? '500' : '400',
                  boxShadow: activePage === 'reports' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/reports'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'reports') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'reports') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Reports'}
              </a>

              {/* Settings */}
              <a 
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isCollapsed ? '0' : '12px',
                  padding: isCollapsed ? '10px' : '10px 16px',
                  color: activePage === 'settings' ? '#2b6cb0' : '#4a5568',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '0 4px 4px 0',
                  position: 'relative',
                  background: activePage === 'settings' ? 'rgba(237, 242, 247, 0.7)' : 'transparent',
                  fontWeight: activePage === 'settings' ? '500' : '400',
                  boxShadow: activePage === 'settings' ? 'inset 4px 0 0 #4c6ef5' : 'none',
                  fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  router.push('/settings'); 
                  if (isMobile) setShowMobileMenu(false);
                }}
                onMouseEnter={(e) => {
                  if (activePage !== 'settings') {
                    e.currentTarget.style.background = 'rgba(230, 239, 249, 0.6)'
                    e.currentTarget.style.color = '#2b6cb0'
                    e.currentTarget.style.transform = isCollapsed ? 'scale(1.1)' : 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== 'settings') {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#4a5568'
                    e.currentTarget.style.transform = 'translateX(0) scale(1)'
                  }
                }}
              >
                <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.2-.06.47.12.61l2.03 1.58c-.03.3-.09.63-.09.94s.06.64.09.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                </div>
                {!isCollapsed && 'Settings'}
              </a>
            </nav>


          </div>

          {/* 🔥 MAIN CONTENT AREA */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100vh', 
            overflowY: 'auto',
            overflowX: 'hidden',
            background: '#f5f7fa',
            width: '100%',
            minWidth: 0,
            position: 'relative'
          }}>
            {/* Mobile Header with Hamburger Menu */}
            {isMobile && (
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                  </svg>
                </button>
                
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {activePage === 'home' && 'Dashboard'}
                  {activePage === 'calendar' && 'Calendar'}
                  {activePage === 'customers' && 'Customers'}
                  {activePage === 'staff' && 'Team'}
                  {activePage === 'checkin' && 'Check In'}
                  {activePage === 'sms' && 'SMS'}
                  {activePage === 'reports' && 'Reports'}
                  {activePage === 'settings' && 'Settings'}
                </div>
                
                {activePage === 'calendar' ? (
                  <MobileHeaderWorkerSelector
                    selectedWorkerId={selectedWorkerId}
                    onWorkerSelect={setSelectedWorkerId}
                  />
                ) : (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#374151',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    N
                  </div>
                )}
              </div>
            )}
            
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkerSelectionProvider>
      <LayoutContent>{children}</LayoutContent>
    </WorkerSelectionProvider>
  )
}
