// src/components/calendar/hooks/useStaffManagement.ts

import { useState, useEffect, useMemo, useCallback } from 'react'
import { StaffMember } from '../types/calendar.types'

export const useStaffManagement = () => {
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(true)
  
  // Store active workers per date (date string -> worker IDs)
  const [activeWorkersByDate, setActiveWorkersByDate] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeWorkersByDate')
      const parsed = saved ? JSON.parse(saved) : {}
      console.log('Loaded active workers by date from localStorage:', parsed)
      return parsed
    }
    return {}
  })

  // Save activeWorkersByDate to localStorage whenever it changes (for data persistence)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeWorkersByDate', JSON.stringify(activeWorkersByDate))
      console.log('Saved active workers by date to localStorage:', activeWorkersByDate)
    }
  }, [activeWorkersByDate])

  // Current date for which we're showing workers
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    return today
  })

  // Get active workers for current date
  const activeWorkers = useMemo(() => {
    return activeWorkersByDate[currentDate] || []
  }, [activeWorkersByDate, currentDate])

  // Fetch team data function
  const fetchTeamData = useCallback(async () => {
    try {
      setLoadingTeam(true)
      
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('⚠️ Not in browser environment, using empty array')
        setTeamMembers([])
        return
      }
      
      // Fetch real staff data from API with timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/staff', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Successfully loaded staff data from API:', data)
        setTeamMembers(data)
        
        // Cache the data for offline use
        if (typeof window !== 'undefined') {
          localStorage.setItem('staffData', JSON.stringify(data))
        }
      } else {
        console.error('❌ API returned non-OK status:', response.status)
        // Try to load from localStorage as fallback
        const cachedData = localStorage.getItem('staffData')
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData)
            console.log('Using cached staff data as fallback:', parsed)
            setTeamMembers(parsed)
          } catch (e) {
            console.error('Failed to parse cached staff data:', e)
            setTeamMembers([])
          }
        } else {
          setTeamMembers([])
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('⚠️ Staff data fetch timed out, using empty array')
        } else if (error.message.includes('Failed to fetch')) {
          console.warn('⚠️ Network error, using empty array:', error.message)
        } else {
          console.error('❌ Error fetching team data:', error.message)
        }
      } else {
        console.error('❌ Unknown error fetching team data:', error)
      }
      // Try to load from localStorage as fallback when there's an error
      const cachedData = localStorage.getItem('staffData')
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          console.log('Using cached staff data after error:', parsed)
          setTeamMembers(parsed)
        } catch (e) {
          console.error('Failed to parse cached staff data after error:', e)
          setTeamMembers([])
        }
      } else {
        setTeamMembers([])
      }
    } finally {
      setLoadingTeam(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  // Memoized staff lookup for performance
  const staffLookup = useMemo(() => {
    const map = new Map<string, StaffMember>()
    teamMembers.forEach(member => map.set(member.id, member))
    return map
  }, [teamMembers])

  // Efficient worker sets for O(1) lookups
  const activeWorkerSet = useMemo(() => new Set(activeWorkers), [activeWorkers])

  // Get available workers (not currently in calendar view)
  const availableWorkers = useMemo(() => 
    teamMembers.filter(member => 
      member.isActive && !activeWorkerSet.has(member.id)
    ), [teamMembers, activeWorkerSet]
  )

  // Get workers currently in calendar view - ordered by when they were added
  const workersInCalendar = useMemo(() => {
    // If teamMembers is still loading (empty) and we have activeWorkers,
    // don't filter out workers that can't be found yet - preserve them with placeholder data
    if (loadingTeam && teamMembers.length === 0 && activeWorkers.length > 0) {
      console.log('TeamMembers still loading, preserving activeWorkers as placeholders:', activeWorkers)
      // Create placeholder workers to maintain the calendar view during loading
      return activeWorkers.map(workerId => ({
        id: workerId,
        name: 'Loading...', // Placeholder name while data loads
        email: '',
        phone: '',
        role: 'staff',
        avatar: undefined,
        color: '#8B5CF6', // Default purple color
        services: [],
        workingHours: {
          monday: { start: '09:00', end: '17:00', isWorking: true },
          tuesday: { start: '09:00', end: '17:00', isWorking: true },
          wednesday: { start: '09:00', end: '17:00', isWorking: true },
          thursday: { start: '09:00', end: '17:00', isWorking: true },
          friday: { start: '09:00', end: '17:00', isWorking: true },
          saturday: { start: '09:00', end: '17:00', isWorking: false },
          sunday: { start: '09:00', end: '17:00', isWorking: false }
        },
        isActive: true,
        priority: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }

    // Normal operation: map activeWorkers to teamMembers
    const orderedWorkers = activeWorkers
      .map(workerId => teamMembers.find(member => member.id === workerId))
      .filter(Boolean) as StaffMember[]
    
    // Double-check that the order matches activeWorkers exactly
    const orderCheck = orderedWorkers.map(w => w.id)
    if (JSON.stringify(orderCheck) !== JSON.stringify(activeWorkers)) {
      console.warn('Order mismatch detected! Expected:', activeWorkers, 'Got:', orderCheck)
    }
    
    // Ensure we have the same number of workers (no missing team members)
    if (orderedWorkers.length !== activeWorkers.length) {
      const missingWorkers = activeWorkers.filter(id => !teamMembers.find(m => m.id === id))
      console.warn('Some workers not found in teamMembers:', missingWorkers)
      
      // If some workers are missing but we're not loading, it means they were deleted
      // We'll handle cleanup in a separate effect to avoid infinite re-renders
    }
    
    console.log('Workers in calendar (ordered by addition):', orderedWorkers.map(w => w.name))
    return orderedWorkers
  }, [activeWorkers, teamMembers, loadingTeam, currentDate])

  // Cleanup effect to remove deleted workers from activeWorkers (separate from the memoized calculation)
  useEffect(() => {
    // Only run cleanup when we're not loading and have team members
    if (!loadingTeam && teamMembers.length > 0 && activeWorkers.length > 0) {
      const missingWorkers = activeWorkers.filter(id => !teamMembers.find(m => m.id === id))
      
      if (missingWorkers.length > 0) {
        console.log('Cleaning up deleted workers from activeWorkers:', missingWorkers)
        const cleanedActiveWorkers = activeWorkers.filter(id => teamMembers.find(m => m.id === id))
        
        // Update activeWorkersByDate to remove deleted workers
        setActiveWorkersByDate(prev => ({
          ...prev,
          [currentDate]: cleanedActiveWorkers
        }))
      }
    }
  }, [teamMembers, loadingTeam, activeWorkers, currentDate])

  // Worker management functions
  const handleAddWorker = useCallback((workerId: string, targetDate?: string) => {
    const dateToUse = targetDate || currentDate
    setActiveWorkersByDate(prev => {
      const currentDateWorkers = prev[dateToUse] || []
      
      // Prevent duplicate additions
      if (currentDateWorkers.includes(workerId)) {
        console.log('Worker already in calendar for this date:', staffLookup.get(workerId)?.name)
        return prev
      }
      
      // Preserve existing order and append new worker
      const newCurrentDateWorkers = [...currentDateWorkers, workerId]
      console.log('Adding worker to calendar for date:', dateToUse, ':', staffLookup.get(workerId)?.name, 'at position:', newCurrentDateWorkers.length)
      console.log('Previous order preserved:', currentDateWorkers.map((id: string) => staffLookup.get(id)?.name))
      console.log('New order:', newCurrentDateWorkers.map((id: string) => staffLookup.get(id)?.name))
      
      // Verify order integrity
      const orderIntegrity = currentDateWorkers.every((id: string, index: number) => newCurrentDateWorkers[index] === id)
      if (!orderIntegrity) {
        console.error('Order integrity check failed! Previous order was modified.')
      }
      
      // Update the date-specific workers
      const newActiveWorkersByDate = {
        ...prev,
        [dateToUse]: newCurrentDateWorkers
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeWorkersByDate', JSON.stringify(newActiveWorkersByDate))
      }
      return newActiveWorkersByDate
    })
  }, [staffLookup, currentDate])

  const handleRemoveWorker = useCallback((workerId: string) => {
    setActiveWorkersByDate(prev => {
      const currentDateWorkers = prev[currentDate] || []
      
      // Preserve order of remaining workers
      const newCurrentDateWorkers = currentDateWorkers.filter((id: string) => id !== workerId)
      console.log('Removing worker from calendar for date:', currentDate, ':', staffLookup.get(workerId)?.name)
      console.log('Remaining workers (order preserved):', newCurrentDateWorkers.map((id: string) => staffLookup.get(id)?.name))
      
      // Update the date-specific workers
      const newActiveWorkersByDate = {
        ...prev,
        [currentDate]: newCurrentDateWorkers
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeWorkersByDate', JSON.stringify(newActiveWorkersByDate))
      }
      return newActiveWorkersByDate
    })
  }, [staffLookup, currentDate])

  const getStaffById = useCallback((staffId: string): StaffMember | undefined => {
    return staffLookup.get(staffId)
  }, [staffLookup])

  const getStaffColor = useCallback((staffId: string): string => {
    const staff = staffLookup.get(staffId)
    return staff?.color || '#3b82f6'
  }, [staffLookup])

  const isWorkerActive = useCallback((workerId: string): boolean => {
    return activeWorkerSet.has(workerId)
  }, [activeWorkerSet])

  const clearAllActiveWorkers = useCallback(() => {
    setActiveWorkersByDate(prev => {
      const newActiveWorkersByDate = {
        ...prev,
        [currentDate]: []
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeWorkersByDate', JSON.stringify(newActiveWorkersByDate))
      }
      return newActiveWorkersByDate
    })
  }, [currentDate])

  // Function to update current date (called when switching days)
  const updateCurrentDate = useCallback((newDate: string) => {
    console.log('Updating current date from', currentDate, 'to', newDate)
    setCurrentDate(newDate)
  }, [currentDate])

  return {
    teamMembers,
    loadingTeam,
    activeWorkers,
    activeWorkerSet,
    staffLookup,
    availableWorkers,
    workersInCalendar,
    handleAddWorker,
    handleRemoveWorker,
    clearAllActiveWorkers,
    getStaffById,
    getStaffColor,
    isWorkerActive,
    refreshStaffData: fetchTeamData, // Expose the refresh function
    currentDate,
    updateCurrentDate, // Expose the date update function
    activeWorkersByDate, // Expose the date-specific workers
  }
}