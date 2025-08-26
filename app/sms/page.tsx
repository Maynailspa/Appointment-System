'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import CampaignForm from './components/CampaignForm'
import EditTemplateModal from './components/EditTemplateModal'
import MessagesView from './components/MessagesView'
import SMSSettingsModal from './components/SMSSettingsModal'

interface SMSMessage {
  id: string
  to: string
  from: string
  body: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  sentAt: Date
  messageType?: 'confirmation' | 'reminder' | 'custom'
}

export default function SMSPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'overview' | 'reminders' | 'campaigns' | 'messages'>('overview')
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today')
  const [messageFilter, setMessageFilter] = useState<'all' | 'questions' | 'replies' | 'threads'>('all')
  const [automationSettings, setAutomationSettings] = useState({
    confirmations: true,
    reminders: true,
    reminders24h: true,
    noShowFollowUps: false,
    birthdayMessages: false
  })
  const [customers, setCustomers] = useState<any[]>([])

  const [drafts, setDrafts] = useState<any[]>([])
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null)

  // Modal states
  const [campaignFormOpen, setCampaignFormOpen] = useState(false)
  const [editTemplateOpen, setEditTemplateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedTemplateType, setSelectedTemplateType] = useState('')
  const [selectedCurrentTemplate, setSelectedCurrentTemplate] = useState('')

  // Campaign templates
  const campaignTemplates = {
    promotions: {
      type: 'Promotions',
      subject: 'Special Offer - 20% Off!',
      body: 'Get 20% off your next visit at May Nails! Limited time offer. Book now!'
    },
    holiday: {
      type: 'Holiday greetings',
      subject: 'Happy Holidays from May Nails!',
      body: 'Happy [Holiday] from May Nails! We hope you have a wonderful celebration!'
    },
    newService: {
      type: 'New service announcements',
      subject: 'New Service Available!',
      body: 'We\'re excited to announce our new [Service] at May Nails! Book your appointment today!'
    },
    lastMinute: {
      type: 'Last-minute openings',
      subject: 'Last-Minute Opening Available!',
      body: 'We have a last-minute opening available today at [Time]. Call us to book!'
    }
  }

  // SMS templates
  const smsTemplates = {
    confirmation: 'Hi {customerName}! Your appointment for {serviceName} on {appointmentDate} at {appointmentTime} has been confirmed. See you soon!',
    reminder: 'Hi {customerName}! Reminder: Your appointment for {serviceName} is tomorrow at {appointmentTime}. See you there!',
    reminder24h: 'Hi {customerName}! Reminder: Your appointment for {serviceName} is in 24 hours at {appointmentTime}. See you there!',
    noShowFollowUp: 'Hi {customerName}! We missed you at your appointment for {serviceName}. Please call us to reschedule.',
    birthdayMessage: 'Happy Birthday {customerName}! 🎉 We hope you have a wonderful day. Come treat yourself to a special service!'
  }

  useEffect(() => {
    loadMessages()
    loadDrafts()
    loadCustomers()
  }, [])

  // Sync URL with tab state
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'overview' | 'reminders' | 'campaigns' | 'messages' | null
    if (tabFromUrl && ['overview', 'reminders', 'campaigns', 'messages'].includes(tabFromUrl)) {
      setFilter(tabFromUrl)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (newTab: 'overview' | 'reminders' | 'campaigns' | 'messages') => {
    setFilter(newTab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.push(`/sms?${params.toString()}`)
  }

  // Handle click outside to close delete confirmation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Check if click is outside any draft card
      const draftCards = document.querySelectorAll('[data-draft-card]')
      let clickedInsideCard = false
      
      draftCards.forEach(card => {
        if (card.contains(target)) {
          clickedInsideCard = true
        }
      })
      
      // If clicked outside all draft cards, close confirmation
      if (!clickedInsideCard && deleteConfirmIndex !== null) {
        setDeleteConfirmIndex(null)
      }
    }

    if (deleteConfirmIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [deleteConfirmIndex])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/sms')
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDrafts = () => {
    try {
      const savedDrafts = localStorage.getItem('smsDrafts')
      if (savedDrafts) {
        setDrafts(JSON.parse(savedDrafts))
      }
    } catch (error) {
      console.error('Failed to load drafts:', error)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Failed to load customers:', error)
    }
  }

  const saveAutomationSettings = async (settings: typeof automationSettings) => {
    try {
      // TODO: Save to database
      console.log('Saving automation settings:', settings)
      setAutomationSettings(settings)
    } catch (error) {
      console.error('Failed to save automation settings:', error)
    }
  }

  const getStatusColor = (status: SMSMessage['status']) => {
    switch (status) {
      case 'delivered': return '#10b981'
      case 'sent': return '#3b82f6'
      case 'failed': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getMessageIcon = (messageType: SMSMessage['messageType']) => {
    switch (messageType) {
      case 'confirmation': return '✅'
      case 'reminder': return '⏰'
      case 'custom': return '💬'
      default: return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
        </svg>
      )
    }
  }

  const getMessageTypeLabel = (messageType: SMSMessage['messageType']) => {
    switch (messageType) {
      case 'confirmation': return 'Confirmation'
      case 'reminder': return 'Reminder'
      case 'custom': return 'Message'
      default: return ''
    }
  }

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  // Helper function to normalize phone number for comparison
  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, '')
  }

  // Helper function to get customer name from phone number
  const getCustomerName = (phone: string) => {
    const normalizedPhone = normalizePhone(phone)
    
    // Try to find customer by exact phone match first
    let customer = customers.find(c => normalizePhone(c.phone) === normalizedPhone)
    
    // If not found, try with different formats
    if (!customer) {
      customer = customers.find(c => {
        const customerPhone = normalizePhone(c.phone)
        return customerPhone === normalizedPhone || 
               customerPhone === normalizedPhone.replace(/^1/, '') || // Remove leading 1
               `1${customerPhone}` === normalizedPhone // Add leading 1
      })
    }
    
    if (customer) {
      return `${customer.firstName} ${customer.lastName || ''}`.trim()
    }
    return null
  }

  // Helper function to display customer name or phone number
  const displayCustomerInfo = (phone: string) => {
    const customerName = getCustomerName(phone)
    if (customerName) {
      return customerName
    }
    return formatPhone(phone)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Get date range based on time filter
  const getDateRange = () => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (timeFilter) {
      case 'today':
        return { start: startOfDay, end: now }
      case 'week':
        const startOfWeek = new Date(startOfDay)
        startOfWeek.setDate(startOfDay.getDate() - 7)
        return { start: startOfWeek, end: now }
      case 'month':
        const startOfMonth = new Date(startOfDay)
        startOfMonth.setDate(startOfDay.getDate() - 30)
        return { start: startOfMonth, end: now }
      default:
        return { start: startOfDay, end: now }
    }
  }

  // Filter messages by time range
  const getTimeFilteredMessages = () => {
    const { start, end } = getDateRange()
    return messages.filter(msg => {
      const msgDate = new Date(msg.sentAt)
      return msgDate >= start && msgDate <= end
    })
  }

  const timeFilteredMessages = getTimeFilteredMessages()

  // Calculate statistics for filtered time period
  const getStats = () => {
    const confirmations = timeFilteredMessages.filter(msg => msg.messageType === 'confirmation').length
    const reminders = timeFilteredMessages.filter(msg => msg.messageType === 'reminder').length
    const custom = timeFilteredMessages.filter(msg => msg.messageType === 'custom').length
    const delivered = timeFilteredMessages.filter(msg => msg.status === 'delivered').length
    const failed = timeFilteredMessages.filter(msg => msg.status === 'failed').length
    const total = timeFilteredMessages.length

    return {
      confirmations,
      reminders,
      custom,
      delivered,
      failed,
      total,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
    }
  }

  const stats = getStats()

  // Filter messages based on current tab and message filter
  const getFilteredMessages = () => {
    let filtered = timeFilteredMessages

    switch (filter) {
      case 'overview':
        return filtered.slice(0, 10) // Show recent 10 messages
      case 'reminders':
        return filtered.filter(msg => msg.messageType === 'confirmation' || msg.messageType === 'reminder')
      case 'campaigns':
        return filtered.filter(msg => msg.messageType === 'confirmation')
      case 'messages':
        // Apply message filter for messages tab
        switch (messageFilter) {
          case 'questions':
            return filtered.filter(msg => msg.messageType === 'custom' && msg.body.includes('?'))
          case 'replies':
            return filtered.filter(msg => msg.messageType === 'custom' && !msg.body.includes('?'))
          case 'threads':
            // Group by customer for conversation threads
            const threads = new Map()
            filtered.filter(msg => msg.messageType === 'custom').forEach(msg => {
              if (!threads.has(msg.to)) {
                threads.set(msg.to, [])
              }
              threads.get(msg.to).push(msg)
            })
            return Array.from(threads.values()).flat()
          default:
            return filtered.filter(msg => msg.messageType === 'custom')
        }
      default:
        return filtered
    }
  }

  const filteredMessages = getFilteredMessages()

  const toggleAutomation = (key: keyof typeof automationSettings) => {
    const newSettings = {
      ...automationSettings,
      [key]: !automationSettings[key]
    }
    setAutomationSettings(newSettings)
    saveAutomationSettings(newSettings)
  }

  const openCampaignForm = (template?: any) => {
    setSelectedTemplate(template)
    setCampaignFormOpen(true)
  }

  const openEditTemplate = (templateType: string, currentTemplate: string) => {
    setSelectedTemplateType(templateType)
    setSelectedCurrentTemplate(currentTemplate)
    setEditTemplateOpen(true)
  }

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>
            SMS Messages
          </h1>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
              e.currentTarget.style.color = '#374151'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22l-1.92 3.32c-.12.2-.06.47.12.61l2.03 1.58c-.03.3-.09.63-.09.94s.06.64.09.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          {(['overview', 'reminders', 'campaigns', 'messages'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleTabChange(type)}
              style={{
                flex: 1,
                padding: '12px',
                background: filter === type ? '#f3f4f6' : 'transparent',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                color: filter === type ? '#111827' : '#6b7280',
                cursor: 'pointer',
                borderBottom: filter === type ? '2px solid #7c3aed' : 'none'
              }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>





        {/* Content based on selected tab */}
        {filter === 'overview' && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            {/* Header with Send New Campaign Button */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 32 
            }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#111827' }}>
                SMS Overview
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => openCampaignForm()}
                style={{
                  padding: '12px 20px',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Send New Campaign
              </button>
              </div>
            </div>

            {/* SMS Activity */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                SMS Activity ({timeFilter === 'today' ? 'Today' : `This ${timeFilter}`})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f3f4f6', borderRadius: 8 }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{stats.total}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Sent</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f3f4f6', borderRadius: 8 }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{stats.delivered}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Delivered ({stats.deliveryRate}%)</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f3f4f6', borderRadius: 8 }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{stats.custom}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Replies</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: '#f3f4f6', borderRadius: 8 }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{stats.failed}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Failed</div>
                </div>
              </div>
            </div>

            {/* Recent Messages */}
            <div>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Recent Messages
              </h3>
              {filteredMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#6b7280' }}>
                  No messages found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <div style={{ fontSize: '18px' }}>{getMessageIcon(message.messageType)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {formatTime(message.sentAt)}
                          </span>
                          {getMessageTypeLabel(message.messageType) && (
                            <>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>|</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {getMessageTypeLabel(message.messageType)}
                          </span>
                            </>
                          )}
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>|</span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {displayCustomerInfo(message.to)}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#111827', lineHeight: 1.4 }}>
                          {message.body.length > 60 ? `${message.body.substring(0, 60)}...` : message.body}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 500,
                          background: getStatusColor(message.status) + '20',
                          color: getStatusColor(message.status)
                        }}
                      >
                        {message.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {filter === 'reminders' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            {/* Left Panel */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Recent Reminder Activity
              </h2>
              <div style={{ 
                padding: '20px', 
                border: '1px solid #e5e7eb', 
                borderRadius: 8, 
                background: 'white'
              }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    Reminders Sent Today
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>
                    {stats.reminders}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, padding: '12px', background: '#f9fafb', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>1-hour</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{stats.reminders}</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', background: '#f9fafb', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>24-hour</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>0</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', background: '#f9fafb', borderRadius: 6, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Confirmations</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{stats.confirmations}</div>
                  </div>
                </div>
                
                <div style={{ 
                  padding: '12px', 
                  background: '#f0f9ff', 
                  border: '1px solid #bae6fd', 
                  borderRadius: 6,
                  fontSize: 14,
                  color: '#0369a1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <span style={{ fontWeight: 500 }}>Tip:</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                    Reminders are automatically sent based on your settings. Use the settings icon to configure timing and templates.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  Loading messages...
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {filteredMessages.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      No messages found
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        style={{
                          padding: 16,
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, color: '#6b7280' }}>
                                To: {displayCustomerInfo(message.to)}
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: getStatusColor(message.status) + '20',
                                  color: getStatusColor(message.status)
                                }}
                              >
                                {message.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.4 }}>
                              {message.body}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                            {formatDate(message.sentAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {filter === 'campaigns' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
            {/* Left Panel */}
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
                Campaign Drafts
              </h2>
              
              {/* Send New Campaign Button */}
              <button
                onClick={() => openCampaignForm()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: 16
                }}
              >
                Send New Campaign
              </button>

              {drafts.length === 0 ? (
                <div style={{ 
                  padding: '24px', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 8, 
                  background: '#f9fafb',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
                    No drafts saved yet
                  </div>
                  <div style={{ fontSize: 14, color: '#9ca3af' }}>
                    Your saved campaign drafts will appear here
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {drafts.map((draft, index) => (
                    <div 
                      key={draft.id || index}
                      data-draft-card
                      style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: 6, background: 'white' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                            {draft.campaignName || 'Untitled Campaign'}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            {draft.message?.substring(0, 60) || 'No message content'}...
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            Saved {draft.savedAt ? new Date(draft.savedAt).toLocaleDateString() : 'recently'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            onClick={() => openCampaignForm(draft)}
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: 12, 
                              background: '#7c3aed', 
                              color: 'white',
                              border: 'none',
                              borderRadius: 4, 
                              cursor: 'pointer' 
                            }}
                          >
                            Continue
                          </button>
                          {deleteConfirmIndex === index ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button 
                                onClick={() => {
                                  const newDrafts = drafts.filter((_, i) => i !== index)
                                  setDrafts(newDrafts)
                                  localStorage.setItem('smsDrafts', JSON.stringify(newDrafts))
                                  setDeleteConfirmIndex(null)
                                }}
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: 12, 
                                  background: '#ef4444', 
                                  color: 'white',
                                  border: 'none', 
                                  borderRadius: 4, 
                                  cursor: 'pointer' 
                                }}
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmIndex(null)}
                                style={{ 
                                  padding: '4px 8px', 
                                  fontSize: 12, 
                                  background: 'transparent', 
                                  color: '#6b7280',
                                  border: '1px solid #d1d5db', 
                                  borderRadius: 4, 
                                  cursor: 'pointer' 
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteConfirmIndex(index)}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: 12, 
                                background: 'transparent', 
                                color: '#ef4444',
                                border: '1px solid #ef4444', 
                                borderRadius: 4, 
                                cursor: 'pointer' 
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  Loading messages...
                </div>
              ) : (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {filteredMessages.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      No messages found
                    </div>
                  ) : (
                    filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        style={{
                          padding: 16,
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, color: '#6b7280' }}>
                                To: {displayCustomerInfo(message.to)}
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: getStatusColor(message.status) + '20',
                                  color: getStatusColor(message.status)
                                }}
                              >
                                {message.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 14, color: '#111827', lineHeight: 1.4 }}>
                              {message.body}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
                            {formatDate(message.sentAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {filter === 'messages' && (
          <MessagesView />
        )}
      </div>

      {/* Modals */}
      <CampaignForm 
        isOpen={campaignFormOpen}
        onClose={() => setCampaignFormOpen(false)}
        onDraftSaved={loadDrafts}
        template={selectedTemplate}
      />
      
      <EditTemplateModal
        isOpen={editTemplateOpen}
        onClose={() => setEditTemplateOpen(false)}
        templateType={selectedTemplateType}
        currentTemplate={selectedCurrentTemplate}
        messageCount={
          selectedTemplateType === 'confirmation' ? stats.confirmations :
          selectedTemplateType === 'reminder' ? stats.reminders :
          selectedTemplateType === 'reminder24h' ? 0 :
          selectedTemplateType === 'noShowFollowUp' ? 0 :
          selectedTemplateType === 'birthdayMessage' ? 0 :
          stats.confirmations
        }
      />

      

      {/* SMS Settings Modal */}
      <SMSSettingsModal 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </div>
  )
} 

 