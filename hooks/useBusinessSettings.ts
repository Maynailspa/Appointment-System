// hooks/useBusinessSettings.ts
import { useState, useEffect } from 'react'

export interface BusinessSettings {
  businessName: string
  businessHours: {
    monday: { start: string; end: string; isOpen: boolean }
    tuesday: { start: string; end: string; isOpen: boolean }
    wednesday: { start: string; end: string; isOpen: boolean }
    thursday: { start: string; end: string; isOpen: boolean }
    friday: { start: string; end: string; isOpen: boolean }
    saturday: { start: string; end: string; isOpen: boolean }
    sunday: { start: string; end: string; isOpen: boolean }
  }
  defaultAppointmentDuration: number
  defaultStaffPriority: number
  allowSameDayBookings: boolean
  allowWalkIns: boolean
  requireClientInfo: boolean
  autoConfirmAppointments: boolean
  // Enhanced salon settings
  address?: {
    street: string
    city: string
    state: string
    zip: string
  }
  phone?: string
  email?: string
  website?: string
  taxId?: string
  logoUrl?: string
  autoBlockOutsideHours?: boolean
  seasonalHours?: boolean
  appointmentBuffer?: number
  minAdvanceBooking?: number
  maxAdvanceBooking?: number
  cancellationPolicy?: number
  allowDoubleBooking?: boolean
  onlineBooking?: boolean
  confirmationMessage?: string
  acceptedPaymentMethods?: string[]
  taxRate?: number
  tipSuggestions?: number[]
  emailReceipts?: boolean
  reminderTiming?: number
  reminderMethod?: 'sms' | 'email' | 'both'
  staffNotifications?: boolean
  adminPasscode?: string
  customerDataPasscode?: string
  autoLogoutMinutes?: number
  theme?: 'light' | 'dark' | 'auto'
  defaultTab?: string
  currency?: string
  dateFormat?: string
}

const defaultSettings: BusinessSettings = {
  businessName: 'My Business',
  businessHours: {
    monday: { start: '09:00', end: '17:00', isOpen: true },
    tuesday: { start: '09:00', end: '17:00', isOpen: true },
    wednesday: { start: '09:00', end: '17:00', isOpen: true },
    thursday: { start: '09:00', end: '17:00', isOpen: true },
    friday: { start: '09:00', end: '17:00', isOpen: true },
    saturday: { start: '09:00', end: '13:00', isOpen: false },
    sunday: { start: '09:00', end: '13:00', isOpen: false }
  },
  defaultAppointmentDuration: 60,
  defaultStaffPriority: 50,
  allowSameDayBookings: true,
  allowWalkIns: true,
  requireClientInfo: false,
  autoConfirmAppointments: true
}

export const useBusinessSettings = () => {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('businessSettings')
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings))
        } catch (error) {
          console.error('Error parsing saved settings:', error)
          setSettings(defaultSettings)
        }
      }
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = (newSettings: BusinessSettings) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('businessSettings', JSON.stringify(newSettings))
    }
    setSettings(newSettings)
  }

  // Update a specific setting
  const updateSetting = <K extends keyof BusinessSettings>(
    key: K,
    value: BusinessSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    saveSettings(newSettings)
  }

  // Check if business is open on a specific day
  const isBusinessOpen = (dayOfWeek: string) => {
    const day = dayOfWeek.toLowerCase() as keyof typeof settings.businessHours
    return settings.businessHours[day]?.isOpen || false
  }

  // Get business hours for a specific day
  const getBusinessHours = (dayOfWeek: string) => {
    const day = dayOfWeek.toLowerCase() as keyof typeof settings.businessHours
    return settings.businessHours[day] || { start: '09:00', end: '17:00', isOpen: false }
  }

  return {
    settings,
    isLoading,
    saveSettings,
    updateSetting,
    isBusinessOpen,
    getBusinessHours
  }
} 