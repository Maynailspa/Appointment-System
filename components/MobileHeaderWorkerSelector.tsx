// components/MobileHeaderWorkerSelector.tsx

'use client'

import React, { useState, useEffect } from 'react'
import MobileWorkerSelector from './calendar/components/MobileWorkerSelector'
import { StaffMember } from './calendar/types/calendar.types'

interface Props {
  selectedWorkerId: string | null
  onWorkerSelect: (workerId: string | null) => void
}

export default function MobileHeaderWorkerSelector({
  selectedWorkerId,
  onWorkerSelect,
}: Props) {
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch('/api/staff')
        if (response.ok) {
          const data = await response.json()
          setTeamMembers(data)
        } else {
          console.error('Failed to fetch team members')
          setTeamMembers([])
        }
      } catch (error) {
        console.error('Error fetching team members:', error)
        setTeamMembers([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [])

  if (loading) {
    // Show loading state with button styling
    return (
      <div style={{
        padding: '8px 16px',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        fontSize: '14px',
        background: '#6b7280',
        color: 'white',
        fontWeight: '500',
        fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '40px',
        minWidth: '60px'
      }}>
        All
      </div>
    )
  }

  return (
    <MobileWorkerSelector
      teamMembers={teamMembers}
      selectedWorkerId={selectedWorkerId}
      onWorkerSelect={onWorkerSelect}
    />
  )
}
