'use client'

import { useState, useEffect } from 'react'

interface SMSSettings {
  id: string
  appointmentConfirmations: boolean
  oneHourReminders: boolean
  twentyFourHourReminders: boolean
  noShowFollowUps: boolean
  birthdayMessages: boolean
}

interface SMSSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SMSSettingsModal({ isOpen, onClose }: SMSSettingsModalProps) {
  const [settings, setSettings] = useState<SMSSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState('')
  const [currentTemplateKey, setCurrentTemplateKey] = useState('')
  const [templateText, setTemplateText] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sms/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: keyof SMSSettings, value: boolean) => {
    if (!settings) return

    setSaving(true)
    try {
      const updatedSettings = { ...settings, [key]: value }
      
      const response = await fetch('/api/sms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error updating SMS settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const openTemplateEditor = (templateKey: string, template: string) => {
    setCurrentTemplateKey(templateKey)
    setCurrentTemplate(template)
    setTemplateText(template)
    setShowTemplateEditor(true)
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/sms/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          [currentTemplateKey]: templateText
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setShowTemplateEditor(false)
      }
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setSaving(false)
    }
  }

  const AutomationItem = ({ 
    title, 
    settingKey, 
    enabled, 
    onToggle,
    template
  }: { 
    title: string
    settingKey: keyof SMSSettings
    enabled: boolean
    onToggle: (value: boolean) => void
    template: string
  }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      marginBottom: '12px'
    }}>
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#111827'
      }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            color: '#7c3aed',
            backgroundColor: 'white',
            border: '1px solid #7c3aed',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
          onClick={() => openTemplateEditor(settingKey, template)}
        >
          Edit Template
        </button>
        <div
          style={{
            width: '44px',
            height: '24px',
            backgroundColor: enabled ? '#7c3aed' : '#d1d5db',
            borderRadius: '12px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onClick={() => onToggle(!enabled)}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: enabled ? '22px' : '2px',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? 'visible' : 'hidden',
      transition: 'opacity 0.2s ease, visibility 0.2s ease'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        transition: 'transform 0.2s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#111827'
          }}>
            SMS Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Section Title */}
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Automation Settings
        </h3>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading settings...
          </div>
        )}

        {/* Settings List */}
        {settings && (
          <div>
            <AutomationItem
              title="Appointment Confirmations"
              settingKey="appointmentConfirmations"
              enabled={settings.appointmentConfirmations}
              onToggle={(value) => updateSetting('appointmentConfirmations', value)}
              template="Hi {customerName}! Your appointment for {serviceName} on {appointmentDate} at {appointmentTime} has been confirmed. See you soon!"
            />
            
            <AutomationItem
              title="1-hour Reminders"
              settingKey="oneHourReminders"
              enabled={settings.oneHourReminders}
              onToggle={(value) => updateSetting('oneHourReminders', value)}
              template="Hi {customerName}! Reminder: Your appointment for {serviceName} is tomorrow at {appointmentTime}. See you there!"
            />
            
            <AutomationItem
              title="24-hour Reminders"
              settingKey="twentyFourHourReminders"
              enabled={settings.twentyFourHourReminders}
              onToggle={(value) => updateSetting('twentyFourHourReminders', value)}
              template="Hi {customerName}! Reminder: Your appointment for {serviceName} is in 24 hours at {appointmentTime}. See you there!"
            />
            
            <AutomationItem
              title="No-show Follow-ups"
              settingKey="noShowFollowUps"
              enabled={settings.noShowFollowUps}
              onToggle={(value) => updateSetting('noShowFollowUps', value)}
              template="Hi {customerName}! We missed you at your appointment for {serviceName}. Please call us to reschedule."
            />
            
            <AutomationItem
              title="Birthday Messages"
              settingKey="birthdayMessages"
              enabled={settings.birthdayMessages}
              onToggle={(value) => updateSetting('birthdayMessages', value)}
              template="Happy Birthday {customerName}! 🎉 We hope you have a wonderful day. Come treat yourself to a special service!"
            />
          </div>
        )}

        {/* Saving Indicator - Always reserve space */}
        <div style={{
          textAlign: 'center',
          padding: '12px',
          color: '#7c3aed',
          fontSize: '14px',
          height: '20px',
          visibility: saving ? 'visible' : 'hidden'
        }}>
          {saving ? '' : ''}
        </div>
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Edit Template
              </h3>
              <button
                onClick={() => setShowTemplateEditor(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Template Text
              </label>
              <textarea
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Enter your template text here..."
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Available Variables:
              </h4>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                {'{customerName}'} - Customer's name<br/>
                {'{serviceName}'} - Service name<br/>
                {'{appointmentDate}'} - Appointment date<br/>
                {'{appointmentTime}'} - Appointment time
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowTemplateEditor(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
