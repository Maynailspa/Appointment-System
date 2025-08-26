'use client'

import React, { useState, useRef, useEffect } from 'react'

interface CampaignFormProps {
  isOpen: boolean
  onClose: () => void
  onDraftSaved?: () => void
  template?: {
    type?: string
    subject?: string
    body?: string
    campaignName?: string
    message?: string
    recipients?: 'all' | 'vip' | 'specific'
    scheduleType?: 'now' | 'later'
    scheduledDate?: string
    scheduledTime?: string
    imageDataUrl?: string
  }
}

const personalizationTags = [
  { label: 'First Name', value: '{{firstName}}' },
  { label: 'Last Name', value: '{{lastName}}' },
  { label: 'Full Name', value: '{{fullName}}' },
  { label: 'Phone', value: '{{phone}}' },
  { label: 'Last Visit', value: '{{lastVisit}}' },
  { label: 'Total Visits', value: '{{totalVisits}}' },
  { label: 'Favorite Service', value: '{{favoriteService}}' }
]

const emojis = ['😊', '💅', '✨', '🎉', '💖', '🔥', '⭐', '💯', '🎯', '💎', '🌺', '💐', '🎁', '🎊', '💃', '🦋']

export default function CampaignForm({ isOpen, onClose, onDraftSaved, template }: CampaignFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [formData, setFormData] = useState({
    campaignName: template?.type || '',
    subject: template?.subject || '',
    message: template?.body || '',
    recipients: 'all' as 'all' | 'vip' | 'specific',
    scheduleType: 'now' as 'now' | 'later',
    scheduledDate: '',
    scheduledTime: '',
    image: null as File | null
  })

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showPersonalizationTags, setShowPersonalizationTags] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate SMS segments (160 chars per segment)
  const messageLength = formData.message.length
  const smsSegments = Math.ceil(messageLength / 160)
  const estimatedRecipients = formData.recipients === 'all' ? 150 : formData.recipients === 'vip' ? 25 : 10

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = formData.campaignName || formData.subject || formData.message
    setHasUnsavedChanges(!!hasChanges)
  }, [formData])

  // Update form data when template changes (for drafts)
  useEffect(() => {
    if (template) {
      setFormData({
        campaignName: template.campaignName || template.type || '',
        subject: template.subject || '',
        message: template.message || template.body || '',
        recipients: template.recipients || 'all',
        scheduleType: template.scheduleType || 'now',
        scheduledDate: template.scheduledDate || '',
        scheduledTime: template.scheduledTime || '',
        image: null
      })
      // Load image preview if it exists in the template
      if (template.imageDataUrl) {
        setImagePreview(template.imageDataUrl)
      } else {
        setImagePreview(null)
      }
      setCurrentStep(1)
      setHasUnsavedChanges(false)
    }
  }, [template])

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      // Close personalization tags dropdown
      if (showPersonalizationTags) {
        const personalizeButton = document.querySelector('[data-button="personalize"]')
        const personalizeDropdown = document.querySelector('[data-dropdown="personalize"]')
        if (personalizeButton && !personalizeButton.contains(target) && 
            personalizeDropdown && !personalizeDropdown.contains(target)) {
          setShowPersonalizationTags(false)
        }
      }
      
      // Close emoji picker dropdown
      if (showEmojiPicker) {
        const emojiButton = document.querySelector('[data-button="emoji"]')
        const emojiDropdown = document.querySelector('[data-dropdown="emoji"]')
        if (emojiButton && !emojiButton.contains(target) && 
            emojiDropdown && !emojiDropdown.contains(target)) {
          setShowEmojiPicker(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPersonalizationTags, showEmojiPicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentStep(2)
  }

  const handleSendCampaign = async () => {
    setIsSending(true)
    try {
      // TODO: Implement actual campaign sending logic
      console.log('Sending campaign:', formData)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      setCurrentStep(3)
    } catch (error) {
      console.error('Failed to send campaign:', error)
    } finally {
      setIsSending(false)
    }
  }

  const insertPersonalizationTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + tag
    }))
    // Don't close the dropdown - let user select multiple items
  }

  const insertEmoji = (emoji: string) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + emoji
    }))
    // Don't close the dropdown - let user select multiple items
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, image: file }))
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getPreviewMessage = () => {
    let preview = formData.message
      .replace(/{{firstName}}/g, 'Sarah')
      .replace(/{{lastName}}/g, 'Johnson')
      .replace(/{{fullName}}/g, 'Sarah Johnson')
      .replace(/{{phone}}/g, '555-123-4567')
      .replace(/{{lastVisit}}/g, '2 weeks ago')
      .replace(/{{totalVisits}}/g, '8')
      .replace(/{{favoriteService}}/g, 'Gel Manicure')
    
    // Add opt-out text if not present
    if (!preview.includes('STOP') && !preview.includes('unsubscribe')) {
      preview += '\n\nReply STOP to unsubscribe'
    }
    
    return preview
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFormData({
      campaignName: '',
      subject: '',
      message: '',
      recipients: 'all',
      scheduleType: 'now',
      scheduledDate: '',
      scheduledTime: '',
      image: null
    })
    setImagePreview(null)
    setHasUnsavedChanges(false)
  }

  const saveDraft = () => {
    const draft = {
      ...formData,
      imageDataUrl: imagePreview, // Save the image data URL instead of File object
      image: null, // Don't save the File object
      savedAt: new Date().toISOString(),
      id: Date.now().toString()
    }
    
    // Get existing drafts
    const existingDrafts = JSON.parse(localStorage.getItem('smsDrafts') || '[]')
    existingDrafts.push(draft)
    localStorage.setItem('smsDrafts', JSON.stringify(existingDrafts))
    
    console.log('Draft saved:', draft)
    resetForm()
    onClose()
    
    // Notify parent component that a draft was saved
    if (onDraftSaved) {
      onDraftSaved()
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && currentStep === 1) {
      setShowCloseConfirm(true)
    } else {
      resetForm()
      onClose()
    }
  }

  const discardChanges = () => {
    resetForm()
    setShowCloseConfirm(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
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
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          width: '95%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflow: 'visible'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
                {currentStep === 1 && 'New Campaign'}
                {currentStep === 2 && 'Campaign Preview'}
                {currentStep === 3 && 'Campaign Sent!'}
              </h2>
              {currentStep === 1 && (
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Step 1 of 2: Create your campaign
                </div>
              )}
              {currentStep === 2 && (
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  Step 2 of 2: Review and send
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
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

          {/* Step 1: Campaign Form */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmit}>
              {/* Campaign Name */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Campaign Name (Only we can see this)
                </label>
                <input
                  type="text"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  placeholder="e.g., Summer Promotion 2024"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>



              {/* Message */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                    Message
                  </label>
                  <div style={{ display: 'flex', gap: 8, position: 'relative', overflow: 'visible' }}>
                    <div style={{ position: 'relative', overflow: 'visible' }}>
                      <button
                        type="button"
                        data-button="personalize"
                        onClick={() => setShowPersonalizationTags(!showPersonalizationTags)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        Personalize
                      </button>
                      {/* Personalization Tags Dropdown */}
                      {showPersonalizationTags && (
                        <div 
                          data-dropdown="personalize"
                          style={{
                            position: 'fixed',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: 8,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 2000,
                            minWidth: '250px',
                            maxWidth: '300px',
                            whiteSpace: 'nowrap'
                          }}
                          ref={(el) => {
                            if (el) {
                              const button = el.parentElement?.querySelector('[data-button="personalize"]') as HTMLElement
                              if (button) {
                                const rect = button.getBoundingClientRect()
                                el.style.top = `${rect.bottom + 4}px`
                                el.style.left = `${rect.left}px`
                              }
                            }
                          }}
                        >
                          {personalizationTags.map(tag => (
                            <button
                              key={tag.value}
                              type="button"
                              onClick={() => insertPersonalizationTag(tag.value)}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '6px 8px',
                                background: 'none',
                                border: 'none',
                                fontSize: 12,
                                cursor: 'pointer',
                                borderRadius: 4
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              {tag.label} ({tag.value})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative', overflow: 'visible' }}>
                      <button
                        type="button"
                        data-button="emoji"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        😊
                      </button>
                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div 
                          data-dropdown="emoji"
                          style={{
                            position: 'fixed',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: 8,
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 2000,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(8, 1fr)',
                            gap: 4
                          }}
                          ref={(el) => {
                            if (el) {
                              const button = el.parentElement?.querySelector('[data-button="emoji"]') as HTMLElement
                              if (button) {
                                const rect = button.getBoundingClientRect()
                                el.style.top = `${rect.bottom + 4}px`
                                el.style.left = `${rect.left}px`
                              }
                            }
                          }}
                        >
                          {emojis.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              style={{
                                padding: '4px',
                                background: 'none',
                                border: 'none',
                                fontSize: 16,
                                cursor: 'pointer',
                                borderRadius: 4
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>



                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Enter your message..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                

              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Image (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: '2px dashed #7c3aed',
                    borderRadius: 8,
                    background: '#f8f7ff',
                    color: '#7c3aed',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0eeff'
                    e.currentTarget.style.borderColor = '#6d28d9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f7ff'
                    e.currentTarget.style.borderColor = '#7c3aed'
                  }}
                                 >
                   Upload Image
                 </button>
                {imagePreview && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ 
                      position: 'relative', 
                      display: 'inline-block',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid #d1d5db'
                    }}>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '150px', 
                          maxHeight: '100px', 
                          display: 'block' 
                        }} 
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          padding: '4px 8px',
                          fontSize: 12,
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Recipients */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Recipients
                </label>
                <select
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All customers ({estimatedRecipients})</option>
                  <option value="vip">VIP customers (25)</option>
                  <option value="specific">Specific customers (10)</option>
                </select>
              </div>

              {/* Schedule */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>
                  Schedule
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#111827' }}>
                    <input
                      type="radio"
                      checked={formData.scheduleType === 'now'}
                      onChange={() => setFormData({ ...formData, scheduleType: 'now' })}
                    />
                    Send now
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#111827' }}>
                    <input
                      type="radio"
                      checked={formData.scheduleType === 'later'}
                      onChange={() => setFormData({ ...formData, scheduleType: 'later' })}
                    />
                    Schedule for later
                  </label>
                </div>
                {formData.scheduleType === 'later' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    />
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>


              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={saveDraft}
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
                  Save Draft
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={handleClose}
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
                    type="submit"
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
                    Continue to Preview
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: Campaign Preview */}
          {currentStep === 2 && (
            <div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
                marginBottom: 24
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  Campaign Details
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Campaign Name</div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{formData.campaignName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Recipients</div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                      {formData.recipients === 'all' ? 'All customers' : 
                       formData.recipients === 'vip' ? 'VIP customers' : 'Specific customers'} ({estimatedRecipients})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Schedule</div>
                    <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                      {formData.scheduleType === 'now' ? 'Send immediately' : 
                       `Scheduled for ${formData.scheduledDate} at ${formData.scheduledTime}`}
                    </div>
                  </div>
                  
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                    {formData.subject}
                  </div>
                  <div style={{ 
                    fontSize: 14, 
                    color: '#111827', 
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {getPreviewMessage()}
                  </div>
                  {formData.image && (
                    <div style={{ 
                      marginTop: 12, 
                      padding: '8px', 
                      background: 'white', 
                      borderRadius: 8,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>📷 Image attached</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
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
                  Back to Edit
                </button>
                <button
                  onClick={handleSendCampaign}
                  disabled={isSending}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: 8,
                    background: isSending ? '#9ca3af' : '#7c3aed',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: isSending ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSending ? 'Sending...' : 'Send Campaign'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#ecfdf5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-8.93"></path>
                  <path d="M22 4L12 14.01l-3-3"></path>
                </svg>
              </div>
              
              <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: 600, color: '#111827' }}>
                Campaign Sent Successfully!
              </h3>
              
              <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280' }}>
                Your campaign "{formData.campaignName}" has been {formData.scheduleType === 'now' ? 'sent' : 'scheduled'} to {estimatedRecipients} recipients.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={resetForm}
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
                  Create Another Campaign
                </button>
                <button
                  onClick={onClose}
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
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
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
          zIndex: 1001
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Unsaved Changes
            </h3>
            
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>
              You have unsaved changes. Would you like to continue editing or discard your changes?
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
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
                Continue Editing
              </button>
              <button
                onClick={discardChanges}
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
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 
 
 
 
 
 
 
 
 
 
 
 
 