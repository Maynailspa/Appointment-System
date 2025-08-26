'use client'

import React, { useState, useEffect } from 'react'
import { useRealtimeAppointmentSync } from '../../hooks/useRealtimeAppointmentSync'

export default function TestSyncPage() {
  const { 
    isConnected, 
    realtimeStatus, 
    notifyAppointmentCreated, 
    notifyAppointmentUpdated, 
    notifyAppointmentDeleted 
  } = useRealtimeAppointmentSync()
  
  const [messages, setMessages] = useState<any[]>([])
  const [connectionCount, setConnectionCount] = useState(0)

  useEffect(() => {
    // Listen for real-time events
    const handleRealtimeEvent = (event: CustomEvent) => {
      setMessages(prev => [{
        type: event.type,
        data: event.detail,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 19)]) // Keep last 20 messages
    }

    // Add listeners for all real-time events
    const eventTypes = [
      'realtimeAppointmentCreated',
      'realtimeAppointmentUpdated', 
      'realtimeAppointmentDeleted',
      'realtimeAppointmentMoved'
    ]

    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, handleRealtimeEvent as EventListener)
    })

    return () => {
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, handleRealtimeEvent as EventListener)
      })
    }
  }, [])

  const createTestAppointment = async () => {
    const testAppointment = {
      id: `test-${Date.now()}`,
      title: 'Test Appointment',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      status: 'scheduled',
      appointmentType: 'single',
      staffName: 'Test Staff',
      serviceName: 'Test Service',
      clientName: 'Test Client',
      staffId: 'test-staff-1',
      serviceId: 'test-service-1',
      clientId: 'test-client-1',
      notes: 'Test appointment created from sync test page',
      extendedProps: {
        services: ['Test Service'],
        appointmentType: 'single'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      await notifyAppointmentCreated(testAppointment)
      console.log('Test appointment created:', testAppointment)
    } catch (error) {
      console.error('Error creating test appointment:', error)
    }
  }

  const updateTestAppointment = async () => {
    const testAppointment = {
      id: `test-update-${Date.now()}`,
      title: 'Updated Test Appointment',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      status: 'scheduled',
      appointmentType: 'single',
      staffName: 'Updated Staff',
      serviceName: 'Updated Service',
      clientName: 'Updated Client',
      staffId: 'test-staff-2',
      serviceId: 'test-service-2',
      clientId: 'test-client-2',
      notes: 'Test appointment updated from sync test page',
      extendedProps: {
        services: ['Updated Service'],
        appointmentType: 'single'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const oldAppointment = { ...testAppointment, title: 'Old Test Appointment' }

    try {
      await notifyAppointmentUpdated(testAppointment, oldAppointment)
      console.log('Test appointment updated:', testAppointment)
    } catch (error) {
      console.error('Error updating test appointment:', error)
    }
  }

  const deleteTestAppointment = async () => {
    const testAppointment = {
      id: `test-delete-${Date.now()}`,
      title: 'Deleted Test Appointment',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      status: 'cancelled',
      appointmentType: 'single',
      staffName: 'Test Staff',
      serviceName: 'Test Service',
      clientName: 'Test Client',
      staffId: 'test-staff-1',
      serviceId: 'test-service-1',
      clientId: 'test-client-1',
      notes: 'Test appointment deleted from sync test page',
      extendedProps: {
        services: ['Test Service'],
        appointmentType: 'single'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      await notifyAppointmentDeleted(testAppointment)
      console.log('Test appointment deleted:', testAppointment)
    } catch (error) {
      console.error('Error deleting test appointment:', error)
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Real-time Sync Test</h1>
        
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              />
              <span className={`font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {realtimeStatus.connectionId && (
              <span className="text-sm text-gray-600">
                ID: {realtimeStatus.connectionId}
              </span>
            )}
            {realtimeStatus.lastUpdate && (
              <span className="text-sm text-gray-600">
                Last update: {new Date(realtimeStatus.lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={createTestAppointment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Test Appointment
            </button>
            <button
              onClick={updateTestAppointment}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Update Test Appointment
            </button>
            <button
              onClick={deleteTestAppointment}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Test Appointment
            </button>
            <button
              onClick={clearMessages}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear Messages
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Received Messages ({messages.length})
          </h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 italic">No messages received yet. Try creating a test appointment.</p>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-blue-700">{message.type}</span>
                    <span className="text-xs text-gray-500">{message.timestamp}</span>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(message.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Test Multi-Device Sync</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Open this page in multiple browser tabs or devices</li>
            <li>Click "Create Test Appointment" in one tab</li>
            <li>Check if the message appears in other tabs</li>
            <li>Verify the connection status shows "Connected" in all tabs</li>
            <li>Test with different appointment actions (create, update, delete)</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

