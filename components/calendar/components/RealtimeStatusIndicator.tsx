// components/calendar/components/RealtimeStatusIndicator.tsx
'use client'

import React from 'react'
import { useRealtimeAppointmentSync } from '../../../hooks/useRealtimeAppointmentSync'

interface Props {
  className?: string
}

export default function RealtimeStatusIndicator({ className = '' }: Props) {
  const { isConnected, realtimeStatus } = useRealtimeAppointmentSync()

  const getStatusColor = () => {
    if (isConnected) {
      return 'bg-green-500'
    }
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (isConnected) {
      return 'Live sync active'
    }
    return 'Reconnecting...'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <div 
          className={`w-2 h-2 rounded-full ${getStatusColor()} ${isConnected ? 'animate-pulse' : ''}`}
          title={getStatusText()}
        />
        <span className="text-xs text-gray-600 hidden sm:inline">
          {getStatusText()}
        </span>
      </div>
      {realtimeStatus.lastUpdate && (
        <span className="text-xs text-gray-400 hidden md:inline">
          Last update: {new Date(realtimeStatus.lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}




