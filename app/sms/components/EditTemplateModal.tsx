'use client'

import React, { useState } from 'react'

interface EditTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  templateType: string
  currentTemplate: string
  messageCount: number
}

export default function EditTemplateModal({ 
  isOpen, 
  onClose, 
  templateType, 
  currentTemplate, 
  messageCount 
}: EditTemplateModalProps) {
  const [template, setTemplate] = useState(currentTemplate)

  const getTemplateDisplayName = (type: string) => {
    switch(type) {
      case 'confirmation': return 'Appointment Confirmation'
      case 'reminder': return '1-hour Reminder'
      case 'reminder24h': return '24-hour Reminder'
      case 'noShowFollowUp': return 'No-show Follow-up'
      case 'birthdayMessage': return 'Birthday Message'
      default: return type
    }
  }

  const handleSave = async () => {
    // TODO: Save template to database
    console.log('Saving template:', { templateType, template })
    onClose()
  }

  if (!isOpen) return null

  return (
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
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            Edit {getTemplateDisplayName(templateType)} Template
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 16, padding: '12px', background: '#f3f4f6', borderRadius: 8 }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            {messageCount} messages sent this month using this template
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
            Template Message
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              resize: 'vertical'
            }}
            placeholder="Enter your template message..."
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            Available variables: {'{customerName}', '{appointmentDate}', '{appointmentTime}', '{serviceName}'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: 'white',
              color: '#374151',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: 8,
              background: '#7c3aed',
              color: 'white',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  )
} 
 
 
 
 
 
 
 
 
 
 
 
 
 