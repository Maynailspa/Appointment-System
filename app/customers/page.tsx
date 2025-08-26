'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Customer data structure
interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth?: string
  notes?: string
  createdAt: string
  lastVisit?: string
  totalVisits: number
  preferredStaff?: string
  tags: string[]
}

// Mock data - in production this would come from an API
const mockCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Emma',
    lastName: 'Thompson',
    email: 'emma.thompson@email.com',
    phone: '123-456-7890',
    dateOfBirth: '1990-05-15',
    notes: 'Prefers morning appointments, allergic to certain nail polishes',
    createdAt: '2024-01-15T10:00:00Z',
    lastVisit: '2025-08-01T14:30:00Z',
    totalVisits: 12,
    preferredStaff: 'staff-1',
    tags: ['VIP', 'Regular']
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    phone: '234-567-8901',
    createdAt: '2024-02-20T09:00:00Z',
    lastVisit: '2025-07-28T16:00:00Z',
    totalVisits: 8,
    tags: ['Regular']
  },
  {
    id: '3',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@email.com',
    phone: '345-678-9012',
    dateOfBirth: '1985-12-03',
    notes: 'Loves gel manicures, always tips well',
    createdAt: '2024-03-10T11:00:00Z',
    lastVisit: '2025-08-02T13:00:00Z',
    totalVisits: 5,
    preferredStaff: 'staff-2',
    tags: ['New', 'VIP']
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Rodriguez',
    email: 'david.rodriguez@email.com',
    phone: '456-789-0123',
    createdAt: '2024-04-05T15:00:00Z',
    lastVisit: '2025-07-25T10:00:00Z',
    totalVisits: 3,
    tags: ['New']
  },
  {
    id: '5',
    firstName: 'Jennifer',
    lastName: 'Kim',
    email: 'jennifer.kim@email.com',
    phone: '567-890-1234',
    dateOfBirth: '1992-08-22',
    notes: 'Prefers natural nail care, interested in organic products',
    createdAt: '2024-01-08T14:00:00Z',
    lastVisit: '2025-07-30T15:30:00Z',
    totalVisits: 15,
    preferredStaff: 'staff-1',
    tags: ['VIP', 'Regular']
  },
  {
    id: '6',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@email.com',
    phone: '678-901-2345',
    createdAt: '2024-05-12T12:00:00Z',
    lastVisit: '2025-07-20T11:00:00Z',
    totalVisits: 2,
    tags: ['New']
  },
  {
    id: '7',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com',
    phone: '789-012-3456',
    dateOfBirth: '1988-03-18',
    notes: 'Prefers afternoon appointments',
    createdAt: '2024-06-01T09:00:00Z',
    lastVisit: '2025-07-15T14:00:00Z',
    totalVisits: 7,
    tags: ['Regular']
  },
  {
    id: '8',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@email.com',
    phone: '890-123-4567',
    createdAt: '2024-06-15T16:00:00Z',
    lastVisit: '2025-07-10T13:30:00Z',
    totalVisits: 4,
    tags: ['Regular']
  },
  {
    id: '9',
    firstName: 'Lisa',
    lastName: 'Brown',
    email: 'lisa.brown@email.com',
    phone: '901-234-5678',
    dateOfBirth: '1995-11-25',
    notes: 'Loves bright colors and nail art',
    createdAt: '2024-07-01T10:00:00Z',
    lastVisit: '2025-07-05T15:00:00Z',
    totalVisits: 9,
    tags: ['VIP']
  },
  {
    id: '10',
    firstName: 'Robert',
    lastName: 'Davis',
    email: 'robert.davis@email.com',
    phone: '012-345-6789',
    createdAt: '2024-07-10T14:00:00Z',
    lastVisit: '2025-07-01T12:00:00Z',
    totalVisits: 1,
    tags: ['New']
  },
  {
    id: '11',
    firstName: 'Amanda',
    lastName: 'Miller',
    email: 'amanda.miller@email.com',
    phone: '123-456-7891',
    dateOfBirth: '1991-07-14',
    notes: 'Prefers natural nail care',
    createdAt: '2024-07-20T11:00:00Z',
    lastVisit: '2025-06-28T16:30:00Z',
    totalVisits: 6,
    tags: ['Regular']
  },
  {
    id: '12',
    firstName: 'Christopher',
    lastName: 'Taylor',
    email: 'christopher.taylor@email.com',
    phone: '234-567-8902',
    createdAt: '2024-08-01T13:00:00Z',
    lastVisit: '2025-06-25T10:00:00Z',
    totalVisits: 3,
    tags: ['New']
  }
]

// localStorage utilities for customers
const saveCustomers = (customers: Customer[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('customers', JSON.stringify(customers))
  }
}

const loadCustomers = (): Customer[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('customers')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.error('Error loading customers from localStorage:', error)
      }
    }
  }
  return mockCustomers
}

export default function CustomersPage() {
  const router = useRouter()
  
  // State for passcode authentication
  const [showPasscodeModal, setShowPasscodeModal] = useState(true)
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Check if user is coming from customer edit page to bypass passcode
  useEffect(() => {
    const checkBypassFlag = () => {
      if (typeof window !== 'undefined') {
        const bypassFlag = sessionStorage.getItem('bypassPasscode')
        if (bypassFlag === 'true') {
          setIsAuthenticated(true)
          setShowPasscodeModal(false)
          // Clear the flag after using it
          sessionStorage.removeItem('bypassPasscode')
        }
      }
    }
    
    checkBypassFlag()
  }, [])
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const customersPerPage = 5 // Reduced to 5 for testing pagination
  
  // Ref for the modal
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Add Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    notes: '',
    preferredStaff: '',
    tags: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Available tags for selection
  const availableTags = ['VIP']

  // Load customers and appointments from localStorage or API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Try to fetch customers from API first
        try {
          const response = await fetch('/api/customers')
          if (response.ok) {
            const data = await response.json()
            setCustomers(data)
          } else {
            // Fallback to localStorage
            const savedCustomers = loadCustomers()
            setCustomers(savedCustomers)
          }
        } catch (apiError) {
          console.warn('API not available, using localStorage:', apiError)
          // Fallback to localStorage
          const savedCustomers = loadCustomers()
          setCustomers(savedCustomers)
        }

        // Load appointments
        try {
          const appointmentsResponse = await fetch('/api/appointments')
          if (appointmentsResponse.ok) {
            const appointmentsData = await appointmentsResponse.json()
            setAppointments(appointmentsData)
          } else {
            // Fallback to localStorage
            if (typeof window !== 'undefined') {
              const savedAppointments = localStorage.getItem('appointments')
              if (savedAppointments) {
                setAppointments(JSON.parse(savedAppointments))
              }
            }
          }
        } catch (appointmentsError) {
          console.warn('Failed to load appointments:', appointmentsError)
          // Fallback to localStorage
          if (typeof window !== 'undefined') {
            const savedAppointments = localStorage.getItem('appointments')
            if (savedAppointments) {
              setAppointments(JSON.parse(savedAppointments))
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Save customers to localStorage whenever they change
  useEffect(() => {
    if (customers.length > 0) {
      saveCustomers(customers)
    }
  }, [customers])

  // Click outside handler for modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowAddCustomer(false)
      }
    }

    if (showAddCustomer) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddCustomer])

  // Form handling functions
  const handleInputChange = (field: string, value: string) => {
    let processedValue = value
    
    // Format phone number if it's the phone field
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value)
    }
    
    setNewCustomer(prev => ({ ...prev, [field]: processedValue }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTagToggle = (tag: string) => {
    setNewCustomer(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!newCustomer.firstName.trim()) {
      errors.firstName = 'First name is required'
    }

    if (!newCustomer.phone.trim()) {
      errors.phone = 'Phone number is required'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create customer')
      }
      
      const customer = await response.json()
      setCustomers(prev => [customer, ...prev])
      setShowAddCustomer(false)
      
      // Reset form
      setNewCustomer({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        notes: '',
        preferredStaff: '',
        tags: []
      })
      setFormErrors({})
      
    } catch (error) {
      console.error('Error adding customer:', error)
      setFormErrors({ submit: error instanceof Error ? error.message : 'Failed to create customer' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowAddCustomer(false)
    setNewCustomer({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      notes: '',
      preferredStaff: '',
      tags: []
    })
    setFormErrors({})
  }

  // Helper function to normalize phone numbers for search
  const normalizePhoneNumber = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+\.]/g, '')
  }

  // Helper function to format phone number as 123-456-7890
  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')
    
    // Format based on length
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  // Helper function to check if search query matches phone number
  const phoneMatchesSearch = (customerPhone: string, searchQuery: string) => {
    if (!searchQuery.trim()) return false
    
    const normalizedSearchQuery = normalizePhoneNumber(searchQuery)
    const normalizedCustomerPhone = normalizePhoneNumber(customerPhone)
    
    // If search query is all digits, search in normalized phone
    if (/^\d+$/.test(normalizedSearchQuery)) {
      return normalizedCustomerPhone.includes(normalizedSearchQuery)
    }
    
    // Otherwise, search in original phone number (for partial matches with formatting)
    return customerPhone.toLowerCase().includes(searchQuery.toLowerCase())
  }

  // Filter customers based on search and active filter
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.lastName && customer.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      phoneMatchesSearch(customer.phone, searchQuery)

    const matchesFilter = 
      activeFilter === 'all' ||
      (activeFilter === 'vip' && customer.tags.includes('VIP'))

    return matchesSearch && matchesFilter
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage)
  const startIndex = (currentPage - 1) * customersPerPage
  const endIndex = startIndex + customersPerPage
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex)



  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter])

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPreviousPage = () => {
    goToPage(currentPage - 1)
  }

  const goToNextPage = () => {
    goToPage(currentPage + 1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'VIP': return '#8b5cf6'
      case 'Regular': return '#3b82f6'
      case 'New': return '#10b981'
      default: return '#6b7280'
    }
  }

  // Calculate completed visits for a customer
  const getCustomerVisits = (customerId: string) => {
    return appointments.filter(apt => 
      apt.clientId === customerId && new Date(apt.end) < new Date()
    ).length
  }

  // Helper function to detect if a string is a phone number
  const isPhoneNumber = (str: string) => {
    // Remove all non-digit characters
    const digitsOnly = str.replace(/\D/g, '')
    // Check if it's all digits and at least 3 characters (area code minimum)
    // Also check if it contains any letters (if it does, it's likely a name)
    const hasLetters = /[a-zA-Z]/.test(str)
    return digitsOnly.length >= 3 && !hasLetters
  }

  // Helper function to format phone number for display
  const formatPhoneForDisplay = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '')
    if (digitsOnly.length === 10) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`
    }
    return phone
  }

  // Passcode authentication functions
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasscodeError('')
    
    // Check if passcode is correct (you can change this to any passcode you want)
    if (passcode === '1010') {
      setIsAuthenticated(true)
      setShowPasscodeModal(false)
      setPasscode('')
    } else {
      setPasscodeError('Incorrect passcode. Please try again.')
      setPasscode('')
    }
  }

  const handlePasscodeCancel = () => {
    router.back()
  }

  const handleBackdropClick = () => {
    router.back()
  }

  // Don't render the main content if not authenticated
  if (!isAuthenticated) {
    return (
      <div onClick={handleBackdropClick} style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#6b7280">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10z"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a202c',
              margin: '0 0 8px 0'
            }}>
              Access Required
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              margin: '0'
            }}>
              Please enter the passcode to access customer information
            </p>
          </div>

          <form onSubmit={handlePasscodeSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: passcodeError ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease-in-out',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4c6ef5'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = passcodeError ? '#ef4444' : '#d1d5db'
                }}
                autoFocus
              />
              {passcodeError && (
                <div style={{
                  fontSize: '14px',
                  color: '#ef4444',
                  marginTop: '8px'
                }}>
                  {passcodeError}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={handlePasscodeCancel}
                style={{
                  flex: '1',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af'
                  e.currentTarget.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: '1',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(90deg, #4c6ef5, #6366f1)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 4px rgba(76, 110, 245, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 110, 245, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(76, 110, 245, 0.2)'
                }}
              >
                Access
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '24px', 
      background: '#f8fafc', 
      minHeight: '100vh',
      fontFamily: "'Roboto', 'Helvetica Neue', sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#1a202c', 
            margin: '0 0 8px 0' 
          }}>
            Customers
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#6b7280', 
            margin: '0' 
          }}>
            Manage your customer relationships and track their preferences
          </p>
        </div>
        
        <button
          onClick={() => setShowAddCustomer(true)}
          style={{
            background: 'linear-gradient(90deg, #4c6ef5, #6366f1)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 2px 4px rgba(76, 110, 245, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 110, 245, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(76, 110, 245, 0.2)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Add Customer
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '60px 24px',
          color: '#6b7280'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>Loading customers...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div style={{ 
          padding: '24px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          marginBottom: '24px',
          color: '#dc2626'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error</div>
          <div>{error}</div>
        </div>
      )}

      {/* Search and Filters */}
      {!isLoading && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px'
        }}>
        {/* Search Bar */}
        <div style={{ flex: '1', maxWidth: '400px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value
                // Format phone numbers as user types with immediate dashes
                let formattedValue = value
                const digitsOnly = value.replace(/\D/g, '')

                if (digitsOnly.length > 0) {
                  if (digitsOnly.length <= 3) {
                    formattedValue = digitsOnly
                  } else if (digitsOnly.length <= 6) {
                    formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`
                  } else {
                    formattedValue = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`
                  }
                }

                setSearchQuery(formattedValue)
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.2s ease-in-out',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4c6ef5'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
              }}
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          flexShrink: 0
        }}>
          {[
            { key: 'all', label: 'All', count: customers.length },
            { key: 'vip', label: 'VIP', count: customers.filter(c => c.tags.includes('VIP')).length }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              style={{
                padding: '8px 16px',
                border: activeFilter === filter.key ? '1px solid #4c6ef5' : '1px solid #d1d5db',
                borderRadius: '6px',
                background: activeFilter === filter.key ? '#4c6ef5' : 'white',
                color: activeFilter === filter.key ? 'white' : '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {filter.label}
              <span style={{
                background: activeFilter === filter.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                color: activeFilter === filter.key ? 'white' : '#6b7280',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Customer List */}
      {!isLoading && (
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {filteredCustomers.length === 0 ? (
          <div style={{ 
            padding: '48px 24px', 
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <svg 
              style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }} 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
              No customers found
            </h3>
            <p style={{ fontSize: '14px', margin: '0 0 16px 0' }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
            </p>
            {searchQuery && (
              <button
                style={{
                  padding: '8px 16px',
                  border: '1px solid #7c3aed',
                  borderRadius: '6px',
                  background: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  // Pre-fill the form based on search query
                  const searchQueryTrimmed = searchQuery.trim()
                  if (isPhoneNumber(searchQueryTrimmed)) {
                    // If it's a phone number, put it in the phone field
                    setNewCustomer({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: formatPhoneForDisplay(searchQueryTrimmed),
                      dateOfBirth: '',
                      notes: '',
                      preferredStaff: '',
                      tags: []
                    })
                  } else {
                    // If it's a name, try to split it and put in name fields
                    const nameParts = searchQueryTrimmed.split(' ')
                    const firstName = nameParts[0] || ''
                    const lastName = nameParts.slice(1).join(' ') || ''
                    setNewCustomer({
                      firstName,
                      lastName,
                      email: '',
                      phone: '',
                      dateOfBirth: '',
                      notes: '',
                      preferredStaff: '',
                      tags: []
                    })
                  }
                  setShowAddCustomer(true)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#6b21a8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7c3aed'
                }}
              >
                Add: {isPhoneNumber(searchQuery) ? formatPhoneForDisplay(searchQuery) : searchQuery}
              </button>
            )}
          </div>
        ) : (
          <div>
            {currentCustomers.map((customer, index) => (
              <div
                key={customer.id}
                style={{
                  padding: '20px 24px',
                  borderBottom: index < currentCustomers.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'background-color 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
                onClick={() => router.push(`/customers/${customer.id}`)}
              >
                {/* Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#4c6ef5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px',
                  flexShrink: 0
                }}>
                  {customer.firstName.charAt(0)}{customer.lastName ? customer.lastName.charAt(0) : ''}
                </div>

                {/* Customer Info */}
                <div style={{ flex: '1', minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    marginBottom: '4px' 
                  }}>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1a202c', 
                      margin: '0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {customer.firstName} {customer.lastName || ''}
                    </h3>
                    {customer.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          background: getTagColor(tag),
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    <span>{String(customer.phone).replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}</span>
                    {customer.email && (
                      <>
                        <span>•</span>
                        <span style={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {customer.email}
                        </span>
                      </>
                    )}
                    {customer.lastVisit && (
                      <>
                        <span>•</span>
                        <span>Last visit: {getTimeAgo(customer.lastVisit)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{getCustomerVisits(customer.id)} visits</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  flexShrink: 0
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/customers/${customer.id}`)
                    }}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#6b7280',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4c6ef5'
                      e.currentTarget.style.color = '#4c6ef5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                      e.currentTarget.style.color = '#6b7280'
                    }}
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/customers/${customer.id}/edit`)
                    }}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#6b7280',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4c6ef5'
                      e.currentTarget.style.color = '#4c6ef5'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                      e.currentTarget.style.color = '#6b7280'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/calendar?customer=${customer.id}`)
                    }}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.color = '#10b981'
                    }}
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px',
            padding: '16px 0'
          }}>
            {/* Previous Button */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.borderColor = '#4c6ef5'
                  e.currentTarget.style.color = '#4c6ef5'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.color = '#374151'
                }
              }}
            >
              Previous
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: currentPage === pageNum ? '#4c6ef5' : 'white',
                  color: currentPage === pageNum ? 'white' : '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  minWidth: '40px'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== pageNum) {
                    e.currentTarget.style.borderColor = '#4c6ef5'
                    e.currentTarget.style.color = '#4c6ef5'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== pageNum) {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.color = '#374151'
                  }
                }}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#f3f4f6' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.borderColor = '#4c6ef5'
                  e.currentTarget.style.color = '#4c6ef5'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.borderColor = '#d1d5db'
                  e.currentTarget.style.color = '#374151'
                }
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div 
            ref={modalRef}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '32px' 
            }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                margin: '0',
                color: '#1a202c'
              }}>
                Add New Customer
              </h2>
              <button
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Personal Information */}
                <div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#1a202c', 
                    margin: '0 0 16px 0' 
                  }}>
                    Personal Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newCustomer.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: formErrors.firstName ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.firstName ? '#dc2626' : '#d1d5db'
                        }}
                      />
                      {formErrors.firstName && (
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '12px', 
                          color: '#dc2626' 
                        }}>
                          {formErrors.firstName}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newCustomer.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: formErrors.lastName ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.lastName ? '#dc2626' : '#d1d5db'
                        }}
                      />
                      {formErrors.lastName && (
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '12px', 
                          color: '#dc2626' 
                        }}>
                          {formErrors.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#1a202c', 
                    margin: '0 0 16px 0' 
                  }}>
                    Contact Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={newCustomer.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="123-456-7890"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: formErrors.phone ? '1px solid #dc2626' : '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = formErrors.phone ? '#dc2626' : '#d1d5db'
                        }}
                      />
                      {formErrors.phone && (
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '12px', 
                          color: '#dc2626' 
                        }}>
                          {formErrors.phone}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#1a202c', 
                    margin: '0 0 16px 0' 
                  }}>
                    Additional Information
                  </h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={newCustomer.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '200px',
                          padding: '12px 16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Tags
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            style={{
                              padding: '6px 12px',
                              border: newCustomer.tags.includes(tag) 
                                ? '1px solid #4c6ef5' 
                                : '1px solid #d1d5db',
                              borderRadius: '16px',
                              background: newCustomer.tags.includes(tag) 
                                ? '#4c6ef5' 
                                : 'white',
                              color: newCustomer.tags.includes(tag) 
                                ? 'white' 
                                : '#6b7280',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Notes
                      </label>
                      <textarea
                        value={newCustomer.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Add any notes about this customer..."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white',
                          outline: 'none',
                          transition: 'border-color 0.2s ease-in-out',
                          resize: 'vertical',
                          fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4c6ef5'
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af'
                    e.currentTarget.style.color = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: isSubmitting ? '#9ca3af' : 'linear-gradient(90deg, #4c6ef5, #6366f1)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 2px 4px rgba(76, 110, 245, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 110, 245, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(76, 110, 245, 0.2)'
                    }
                  }}
                >
                  {isSubmitting ? 'Adding Customer...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 