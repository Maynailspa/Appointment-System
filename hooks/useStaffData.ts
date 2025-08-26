'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'

export interface StaffMember {
  id: string
  name: string
  role: string
  email: string
  phone: string
  avatar: string
  color: string
  isActive: boolean
  services: string[]
  schedule: {
    [key: string]: {
      isWorking: boolean
      startTime: string
      endTime: string
    }
  }
  hourlyRate: number
  commission: number
}

interface StaffContextType {
  staff: StaffMember[]
  addStaff: (staff: Omit<StaffMember, 'id'>) => void
  updateStaff: (id: string, updates: Partial<StaffMember>) => void
  deleteStaff: (id: string) => void
}

const StaffContext = createContext<StaffContextType | undefined>(undefined)

export function useStaffData() {
  const context = useContext(StaffContext)
  if (!context) {
    throw new Error('useStaffData must be used within a StaffProvider')
  }
  return context
}

export function useCalendarStaff() {
  const { staff } = useStaffData()
  
  const getCalendarStaff = () => {
    return staff
      .filter(s => s.isActive)
      .map(s => ({
        id: s.id,
        name: s.name,
        color: s.color
      }))
  }
  
  const getStaffColor = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId)
    return staffMember?.color || '#3b82f6'
  }
  
  const getStaffById = (staffId: string) => {
    return staff.find(s => s.id === staffId)
  }
  
  return {
    getCalendarStaff,
    getStaffColor,
    getStaffById
  }
}

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    const savedStaff = localStorage.getItem('staff-data')
    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff))
      } catch (error) {
        console.error('Error loading staff data:', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('staff-data', JSON.stringify(staff))
  }, [staff])

  const addStaff = (newStaff: Omit<StaffMember, 'id'>) => {
    const staffWithId = {
      ...newStaff,
      id: Date.now().toString()
    }
    setStaff(prev => [...prev, staffWithId])
  }

  const updateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaff(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ))
  }

  const deleteStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  // Using React.createElement to avoid JSX parsing issues
  return React.createElement(
    StaffContext.Provider,
    {
      value: {
        staff,
        addStaff,
        updateStaff,
        deleteStaff
      }
    },
    children
  )
}