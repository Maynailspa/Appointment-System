import { useState, useEffect } from 'react'
import { StaffMember } from '@/lib/types'

// localStorage utilities
const saveTeamMembers = (teamMembers: StaffMember[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('team-members', JSON.stringify(teamMembers))
  }
}

const loadTeamMembers = (): StaffMember[] => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('team-members')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.error('Error loading team members from localStorage:', error)
      }
    }
  }
  return []
}

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(true)

  // Load team members from API with localStorage fallback
  const loadTeamMembersFromAPI = async () => {
    try {
      console.log('Loading team members from API...')
      const response = await fetch('/api/staff')
      
      if (response.ok) {
        const apiTeamMembers = await response.json()
        console.log('Loaded team members from API:', apiTeamMembers)
        
        // Save to localStorage for offline access
        saveTeamMembers(apiTeamMembers)
        setTeamMembers(apiTeamMembers)
      } else {
        console.error('Failed to load team members from API:', response.status)
        // Fallback to localStorage
        const savedTeamMembers = loadTeamMembers()
        if (savedTeamMembers.length > 0) {
          console.log('Using cached team members from localStorage')
          setTeamMembers(savedTeamMembers)
        } else {
          console.log('No cached team members found, starting with empty array')
          setTeamMembers([])
        }
      }
    } catch (error) {
      console.error('Error loading team members from API:', error)
      // Fallback to localStorage
      const savedTeamMembers = loadTeamMembers()
      if (savedTeamMembers.length > 0) {
        console.log('Using cached team members from localStorage due to API error')
        setTeamMembers(savedTeamMembers)
      } else {
        console.log('No cached team members found, starting with empty array')
        setTeamMembers([])
      }
    } finally {
      setLoadingTeam(false)
    }
  }

  // Load team members on mount
  useEffect(() => {
    loadTeamMembersFromAPI()
  }, [])

  // Save team members to localStorage whenever they change
  useEffect(() => {
    if (teamMembers.length > 0) {
      saveTeamMembers(teamMembers)
    }
  }, [teamMembers])

  // Function to add a new team member
  const addTeamMember = async (newMember: Omit<StaffMember, 'id'>) => {
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember)
      })

      if (response.ok) {
        const createdMember = await response.json()
        console.log('Successfully created team member:', createdMember)
        setTeamMembers(prev => [...prev, createdMember])
        return createdMember
      } else {
        console.error('Failed to create team member:', response.status)
        throw new Error('Failed to create team member')
      }
    } catch (error) {
      console.error('Error creating team member:', error)
      // Fallback to local creation if API fails
      const memberWithId = {
        ...newMember,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setTeamMembers(prev => [...prev, memberWithId])
      return memberWithId
    }
  }

  // Function to update a team member
  const updateTeamMember = async (id: string, updates: Partial<StaffMember>) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updatedMember = await response.json()
        console.log('Successfully updated team member:', updatedMember)
        setTeamMembers(prev => prev.map(member => 
          member.id === id ? updatedMember : member
        ))
        return updatedMember
      } else {
        console.error('Failed to update team member:', response.status)
        throw new Error('Failed to update team member')
      }
    } catch (error) {
      console.error('Error updating team member:', error)
      // Fallback to local update if API fails
      const updatedMember = {
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      }
      setTeamMembers(prev => prev.map(member => 
        member.id === id ? { ...member, ...updatedMember } : member
      ))
      return updatedMember
    }
  }

  // Function to delete a team member
  const deleteTeamMember = async (id: string) => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('Successfully deleted team member:', id)
        setTeamMembers(prev => prev.filter(member => member.id !== id))
        return true
      } else {
        const errorData = await response.json()
        console.error('Failed to delete team member:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to delete team member')
      }
    } catch (error) {
      console.error('Error deleting team member:', error)
      // Fallback to local deletion if API fails
      setTeamMembers(prev => prev.filter(member => member.id !== id))
      return true
    }
  }

  // Function to refresh team members from API
  const refreshTeamMembers = () => {
    setLoadingTeam(true)
    loadTeamMembersFromAPI()
  }

  return {
    teamMembers,
    loadingTeam,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    refreshTeamMembers
  }
}