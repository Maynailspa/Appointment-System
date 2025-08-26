'use client'

import React, { useState, useEffect, useRef } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  lastMessage?: string
  lastMessageTime?: Date
  isVerified?: boolean
  avatar?: string
  isTemporary?: boolean
}

interface Message {
  id: string
  from: string
  to: string
  body: string
  timestamp: Date
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  imageData?: string | null
  imageFiles?: string[] // Array of base64 image data for multiple images
}

export default function MessagesView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newMessageRecipient, setNewMessageRecipient] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('')
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  
  // Client search functionality
  const [clients, setClients] = useState<Contact[]>([])
  const [filteredClients, setFilteredClients] = useState<Contact[]>([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  
  // Track messages for new contacts (not in database yet)
  const [newContactMessages, setNewContactMessages] = useState<Record<string, Message[]>>({})
  
  // Swipe functionality state
  const [swipedContactId, setSwipedContactId] = useState<string | null>(null)
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [swipeCurrentX, setSwipeCurrentX] = useState<number | null>(null)
  
  // Mute and delete functionality state
  const [mutedContacts, setMutedContacts] = useState<Set<string>>(new Set())
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false)
  const [contactToDelete, setContactToDelete] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContacts()
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id)
    }
  }, [selectedContact])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showClientDropdown) {
        const target = event.target as Element
        if (!target.closest('[data-client-dropdown]')) {
          setShowClientDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showClientDropdown])

  // Helper function to normalize phone numbers for comparison
  const normalizePhone = (phone: string) => {
    let normalized = phone.replace(/\D/g, '') // Remove all non-digits
    
    // If it starts with country code 1 and is 11 digits, remove the country code
    if (normalized.length === 11 && normalized.startsWith('1')) {
      normalized = normalized.substring(1)
    }
    
    return normalized
  }

  // Helper function to find customer by phone number
  const findCustomerByPhone = (phone: string) => {
    const normalizedPhone = normalizePhone(phone)
    return clients.find(client => normalizePhone(client.phone) === normalizedPhone)
  }

  const loadClients = async () => {
    try {
      setLoadingClients(true)
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setClients(data)
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        // Transform customers into contacts with mock message data
        const contactsWithMessages = data.map((customer: any) => ({
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          lastMessage: getMockLastMessage(customer.firstName),
          lastMessageTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
          isVerified: Math.random() > 0.7, // 30% chance of being verified
          avatar: customer.firstName.charAt(0).toUpperCase()
        }))
        
        // Also load messages for new contacts (messages without clientId)
        try {
          const newMessagesResponse = await fetch('/api/sms?newContacts=true')
          if (newMessagesResponse.ok) {
            const newMessagesData = await newMessagesResponse.json()
            
            // Group messages by phone number to create contact entries
            const phoneGroups: Record<string, any[]> = {}
            newMessagesData.messages.forEach((msg: any) => {
              if (!msg.clientId && msg.to) {
                if (!phoneGroups[msg.to]) {
                  phoneGroups[msg.to] = []
                }
                phoneGroups[msg.to].push(msg)
              }
            })
            
            // Create contact entries for new contacts
            const newContacts = Object.entries(phoneGroups).map(([phone, messages]) => {
              const lastMessage = messages[messages.length - 1]
              
              // Check if this phone number exists in the customers list
              const existingCustomer = contactsWithMessages.find((customer: any) => normalizePhone(customer.phone) === normalizePhone(phone))
              
              if (existingCustomer) {
                // Use existing customer data
                return {
                  id: existingCustomer.id,
                  firstName: existingCustomer.firstName,
                  lastName: existingCustomer.lastName,
                  phone: existingCustomer.phone,
                  lastMessage: lastMessage.body,
                  lastMessageTime: new Date(lastMessage.sentAt || lastMessage.createdAt),
                  isVerified: existingCustomer.isVerified,
                  avatar: existingCustomer.avatar,
                  isTemporary: false
                }
              } else {
                // Check if this phone number exists in the clients list (from database)
                const clientFromDatabase = findCustomerByPhone(phone)
                
                if (clientFromDatabase) {
                  // Use customer data from database
                  return {
                    id: clientFromDatabase.id,
                    firstName: clientFromDatabase.firstName,
                    lastName: clientFromDatabase.lastName || '',
                    phone: clientFromDatabase.phone,
                    lastMessage: lastMessage.body,
                    lastMessageTime: new Date(lastMessage.sentAt || lastMessage.createdAt),
                    isVerified: true, // Customer exists in database
                    avatar: clientFromDatabase.firstName.charAt(0).toUpperCase(),
                    isTemporary: false
                  }
                } else {
                  // Create new contact entry with phone as name
                  return {
                    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    firstName: phone, // Use phone as name initially
                    lastName: '',
                    phone: phone,
                    lastMessage: lastMessage.body,
                    lastMessageTime: new Date(lastMessage.sentAt || lastMessage.createdAt),
                    isVerified: false,
                    avatar: phone.charAt(0).toUpperCase(),
                    isTemporary: false // These are now permanent since they're in DB
                  }
                }
              }
            })
            
            // Combine existing contacts with new contacts, avoiding duplicates
            const existingPhoneNumbers = new Set(contactsWithMessages.map((c: any) => c.phone))
            const uniqueNewContacts = newContacts.filter(contact => !existingPhoneNumbers.has(contact.phone))
            setContacts([...uniqueNewContacts, ...contactsWithMessages])
          }
        } catch (error) {
          console.error('Failed to load new contacts:', error)
          setContacts(contactsWithMessages)
        }
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (contactId: string) => {
    try {
      // For new contacts (temporary IDs), try to load from local state first
      if (contactId.startsWith('new-') || contactId.startsWith('temp-')) {
        const localMessages = newContactMessages[contactId] || []
        setMessages(localMessages)
        
        // Also try to load from database by phone number for new contacts
        // This handles the case where the page was refreshed and messages exist in DB
        if (selectedContact?.phone) {
          try {
            const response = await fetch(`/api/sms?phone=${encodeURIComponent(selectedContact.phone)}`)
            if (response.ok) {
              const data = await response.json()
              if (data.messages && data.messages.length > 0) {
                // Transform database messages to our Message format
                const transformedMessages: Message[] = data.messages.map((msg: any) => {
                  // Check if this message contains image data in the body
                  const hasImageData = msg.body && (
                    msg.body.includes('[1 Image Sent]') || 
                    msg.body.includes('[2 Images Sent]') || 
                    msg.body.includes('[3 Images Sent]') || 
                    msg.body.includes('[4 Images Sent]') ||
                    msg.body.includes('[5 Images Sent]') || 
                    msg.body.match(/\[\d+ Images Sent\]/) ||
                    msg.body.includes('[Image:') ||
                    msg.body.match(/\[Image:.*\.(png|jpg|jpeg|gif|webp)\]/i)
                  )
                  
                  // Try to retrieve image data from database first, then localStorage as fallback
                  let imageFiles: string[] | undefined = undefined
                  if (hasImageData) {
                    try {
                      // First, try to get image data from the database
                      if (msg.imageData) {
                        // Single image from database
                        imageFiles = [msg.imageData]
                        console.log('✅ Retrieved single image data from database for message:', msg.id)
                      } else if (msg.imageFiles) {
                        // Multiple images from database
                        try {
                          imageFiles = JSON.parse(msg.imageFiles)
                          console.log('✅ Retrieved multiple image data from database for message:', msg.id)
                        } catch (parseError) {
                          console.error('Failed to parse imageFiles from database:', parseError)
                        }
                      } else {
                        // Fallback to localStorage for older messages
                        const imageDataKey = `imageData_${msg.id}`
                        console.log('No database image data, checking localStorage with key:', imageDataKey)
                        
                        const storedImageData = localStorage.getItem(imageDataKey)
                        if (storedImageData) {
                          imageFiles = JSON.parse(storedImageData)
                          console.log('✅ Retrieved image data from localStorage for message:', msg.id)
                        } else {
                          console.log('❌ No image data found in database or localStorage for message:', msg.id)
                          
                          // For existing messages without stored image data, create a placeholder
                          // This handles messages sent before the image persistence implementation
                          if (msg.body.includes('[Image:') || msg.body.match(/\[Image:.*\.(png|jpg|jpeg|gif|webp)\]/i)) {
                            console.log('Creating placeholder image data for existing message')
                            // Create a placeholder base64 image (1x1 transparent pixel)
                            const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
                            imageFiles = [placeholderImage]
                            
                            // Store it for future use
                            localStorage.setItem(imageDataKey, JSON.stringify(imageFiles))
                            console.log('✅ Stored placeholder image data for message:', msg.id)
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Failed to retrieve image data:', error)
                    }
                  }
                  
                  return {
                    id: msg.id,
                    from: 'business', // All messages in DB are from business
                    to: msg.to, // The recipient phone number
                    body: msg.body,
                    timestamp: new Date(msg.sentAt || msg.createdAt),
                    status: msg.status,
                    imageData: imageFiles && imageFiles.length > 0 ? imageFiles[0] : undefined,
                    imageFiles: imageFiles
                  }
                })
                setMessages(transformedMessages.reverse())
                
                // Update local state with database messages
                setNewContactMessages(prev => ({
                  ...prev,
                  [contactId]: transformedMessages.reverse()
                }))
              }
            }
          } catch (error) {
            console.error('Failed to load messages by phone:', error)
          }
        }
        return
      }

      // For existing contacts, try to load by clientId first
      let response = await fetch(`/api/sms?clientId=${contactId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          // Transform database messages to our Message format
          const transformedMessages: Message[] = data.messages.map((msg: any) => {
            // Check if this message contains image data in the body
            const hasImageData = msg.body && (
              msg.body.includes('[1 Image Sent]') || 
              msg.body.includes('[2 Images Sent]') || 
              msg.body.includes('[3 Images Sent]') || 
              msg.body.includes('[4 Images Sent]') ||
              msg.body.includes('[5 Images Sent]') || 
              msg.body.match(/\[\d+ Images Sent\]/) ||
              msg.body.includes('[Image:') ||
              msg.body.match(/\[Image:.*\.(png|jpg|jpeg|gif|webp)\]/i)
            )
            
            // Try to retrieve image data from localStorage
            let imageFiles: string[] | undefined = undefined
            if (hasImageData) {
              try {
                const imageDataKey = `imageData_${msg.id}`
                const storedImageData = localStorage.getItem(imageDataKey)
                if (storedImageData) {
                  imageFiles = JSON.parse(storedImageData)
                  console.log('Retrieved image data from localStorage for message:', msg.id)
                }
              } catch (error) {
                console.error('Failed to retrieve image data from localStorage:', error)
              }
            }
            
            return {
              id: msg.id,
              from: 'business', // All messages in DB are from business
              to: msg.to, // The recipient phone number
              body: msg.body,
              timestamp: new Date(msg.sentAt || msg.createdAt),
              status: msg.status,
              imageData: imageFiles && imageFiles.length > 0 ? imageFiles[0] : undefined,
              imageFiles: imageFiles
            }
          })
          
          // Merge with any existing local messages for this contact
          const existingLocalMessages = newContactMessages[contactId] || []
          const allMessages = [...transformedMessages.reverse(), ...existingLocalMessages]
          setMessages(allMessages)
          return
        }
      }

      // If no messages found by clientId, try by phone number
      if (selectedContact?.phone) {
        response = await fetch(`/api/sms?phone=${encodeURIComponent(selectedContact.phone)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.messages && data.messages.length > 0) {
            // Transform database messages to our Message format
            const transformedMessages: Message[] = data.messages.map((msg: any) => {
              // Check if this message contains image data in the body
              const hasImageData = msg.body && (
                msg.body.includes('[1 Image Sent]') || 
                msg.body.includes('[2 Images Sent]') || 
                msg.body.includes('[3 Images Sent]') || 
                msg.body.includes('[4 Images Sent]') ||
                msg.body.includes('[5 Images Sent]') || 
                msg.body.match(/\[\d+ Images Sent\]/) ||
                msg.body.includes('[Image:') ||
                msg.body.match(/\[Image:.*\.(png|jpg|jpeg|gif|webp)\]/i)
              )
              
              // Try to retrieve image data from localStorage
              let imageFiles: string[] | undefined = undefined
              if (hasImageData) {
                try {
                  const imageDataKey = `imageData_${msg.id}`
                  const storedImageData = localStorage.getItem(imageDataKey)
                  if (storedImageData) {
                    imageFiles = JSON.parse(storedImageData)
                    console.log('Retrieved image data from localStorage for message:', msg.id)
                  }
                } catch (error) {
                  console.error('Failed to retrieve image data from localStorage:', error)
                }
              }
              
              return {
                id: msg.id,
                from: 'business', // All messages in DB are from business
                to: msg.to, // The recipient phone number
                body: msg.body,
                timestamp: new Date(msg.sentAt || msg.createdAt),
                status: msg.status,
                imageData: imageFiles && imageFiles.length > 0 ? imageFiles[0] : undefined,
                imageFiles: imageFiles
              }
            })
            
            // Merge with any existing local messages for this contact
            const existingLocalMessages = newContactMessages[contactId] || []
            const allMessages = [...transformedMessages.reverse(), ...existingLocalMessages]
            setMessages(allMessages)
            return
          }
        }
      }

      // If no messages found, use mock messages
      setMessages(getMockMessages(contactId))
    } catch (error) {
      console.error('Failed to load messages:', error)
      // Use mock messages if API fails
      setMessages(getMockMessages(contactId))
    }
  }

  const getMockLastMessage = (firstName: string) => {
    const messages = [
      `Hi ${firstName}! Your appointment is confirmed for tomorrow at 2 PM.`,
      `Thanks for visiting us today! How was your experience?`,
      `We have a special offer just for you! 20% off your next visit.`,
      `Reminder: Your appointment is in 1 hour. See you soon!`,
      `Happy Birthday ${firstName}! 🎉 Come celebrate with us!`,
      `We missed you today. Would you like to reschedule?`,
      `Your service is complete! We hope you love the results.`,
      `Quick question: How did you hear about us?`,
      `New services available! Check out our latest offerings.`,
      `Thank you for your feedback! We appreciate it. ❤️`
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const getMockMessages = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return []

    const mockMessages: Message[] = []
    const now = new Date()
    
    // Generate 5-10 mock messages
    const messageCount = Math.floor(Math.random() * 6) + 5
    
    for (let i = 0; i < messageCount; i++) {
      const isFromBusiness = i % 2 === 0
      mockMessages.push({
        id: `msg-${contactId}-${i}`,
        from: isFromBusiness ? 'business' : contact.phone,
        to: isFromBusiness ? contact.phone : 'business',
        body: getMockLastMessage(contact.firstName),
        timestamp: new Date(now.getTime() - (messageCount - i) * 24 * 60 * 60 * 1000),
        status: 'delivered'
      })
    }
    
    return mockMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  const handleClientSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredClients([])
      setShowClientDropdown(false)
      return
    }

    const filtered = clients.filter(client => 
      client.firstName?.toLowerCase().includes(query.toLowerCase()) ||
      client.lastName?.toLowerCase().includes(query.toLowerCase()) ||
      client.phone?.includes(query) ||
      normalizePhone(client.phone).includes(normalizePhone(query)) ||
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(query.toLowerCase())
    )
    
    setFilteredClients(filtered)
    setShowClientDropdown(true)
  }

  const handleClientSelect = (client: Contact) => {
    setNewMessageRecipient(client.phone || '')
    setShowClientDropdown(false)
  }

  const handleNewMessageStart = () => {
    // Create a temporary contact for the new message
    const tempContact: Contact = {
      id: `temp-${Date.now()}`,
      firstName: '',
      lastName: '',
      phone: '',
      lastMessage: '',
      lastMessageTime: new Date(),
      isVerified: false,
      avatar: '?',
      isTemporary: true
    }
    
    setSelectedContact(tempContact)
    setShowNewMessage(true)
    setNewMessageRecipient('')
    setNewMessage('')
  }

  const sendMessage = async () => {
    console.log('Send message triggered')
    console.log('New message:', newMessage)
    console.log('Selected files:', selectedFiles)
    console.log('Selected images:', selectedImages)
    
    if (!newMessage.trim() && selectedFiles.length === 0) {
      console.log('No message or files to send')
      return
    }

    // We'll store image data after the message is sent and we get the database ID

    let recipientPhone = ''
    let clientId = ''

    // Handle new message flow
    if (showNewMessage && selectedContact?.isTemporary) {
      recipientPhone = newMessageRecipient.trim()
      
      if (!recipientPhone) {
        alert('Please enter a phone number or select a contact')
        return
      }
      
      if (!newMessage.trim() && selectedFiles.length === 0) {
        alert('Please enter a message or select an image')
        return
      }

      // Create message body - include image info if there are selected files
      let messageBody = newMessage
      if (selectedFiles.length > 0) {
        const imageCount = selectedFiles.length
        const imageText = imageCount === 1 ? '1 Image' : `${imageCount} Images`
        messageBody = `[${imageText} Sent]${newMessage ? `\n\n${newMessage}` : ''}`
      }

      // Create a new contact entry
      const newContact: Contact = {
        id: `new-${Date.now()}`,
        firstName: recipientPhone, // Use phone as name initially
        lastName: '',
        phone: recipientPhone,
        lastMessage: messageBody,
        lastMessageTime: new Date(),
        isVerified: false,
        avatar: recipientPhone.charAt(0).toUpperCase(),
        isTemporary: false
      }

      // Add to contacts list
      setContacts(prev => [newContact, ...prev])
      
      // Update selected contact
      setSelectedContact(newContact)
      setShowNewMessage(false)
      
      // Clear the new message form
      setNewMessageRecipient('')
      setNewMessage('')

      // Send the actual message and save to database
      try {
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone,
            message: messageBody,
            imageData: selectedImages[0] || null,
            imageFiles: selectedImages.length > 0 ? selectedImages : null
            // Don't send clientId for new contacts that don't exist in database yet
          })
        })
        
        if (response.ok) {
          const responseData = await response.json()
          
          // Store image data in localStorage using the database message ID
          if (selectedImages.length > 0 && responseData.messageId) {
            const imageDataKey = `imageData_${responseData.messageId}`
            localStorage.setItem(imageDataKey, JSON.stringify(selectedImages))
            console.log('Stored image data in localStorage with database ID:', responseData.messageId)
          }
          
          // Add message to local state
          const sentMessage: Message = {
            id: responseData.messageId || `msg-${Date.now()}`,
            from: 'business',
            to: recipientPhone,
            body: messageBody,
            timestamp: new Date(),
            status: 'sent',
            imageData: selectedImages[0], // Use first image for backward compatibility
            imageFiles: selectedImages // Store all images
          }
          
          setMessages(prev => [...prev, sentMessage])
          
          // Update contact's last message
          setContacts(prev => prev.map(contact => 
            contact.id === newContact.id 
              ? { ...contact, lastMessage: messageBody, lastMessageTime: new Date() }
              : contact
          ))
          
          setNewMessage('')
          setSelectedImages([])
          setSelectedFiles([])
        } else {
          console.error('Failed to send message')
        }
      } catch (error) {
        console.error('Error sending message:', error)
      }
      
      return
    }

    if (showNewMessage) {
      if (!newMessageRecipient.trim()) return
      recipientPhone = newMessageRecipient.trim()
      // For new messages, we don't have a clientId yet
    } else {
      if (!selectedContact) return
      recipientPhone = selectedContact.phone
      clientId = selectedContact.id
    }
    
    if (!newMessage.trim() && selectedFiles.length === 0) {
      alert('Please enter a message or select an image')
      return
    }

    // Create message body - include image info if there are selected files
    let messageBody = newMessage
    let imageData = null
    let imageFiles: string[] | undefined = undefined
    if (selectedFiles.length > 0) {
      const imageCount = selectedFiles.length
      const imageText = imageCount === 1 ? '1 Image' : `${imageCount} Images`
      messageBody = `[${imageText} Sent]${newMessage ? `\n\n${newMessage}` : ''}`
      imageData = selectedImages[0] // Store the first base64 image data for backward compatibility
      imageFiles = selectedImages // Store all images for multiple image support
    }

    const messageId = `msg-${Date.now()}`
    const message: Message = {
      id: messageId,
      from: 'business',
      to: recipientPhone,
      body: messageBody,
      timestamp: new Date(),
      status: 'pending',
      imageData: imageData,
      imageFiles: imageFiles
    }

    // Add message to local state immediately for instant feedback
    setMessages(prev => [...prev, message])
    setNewMessage('')
    setSelectedImages([])
    setSelectedFiles([])
    
    // Reset textarea height after sending
    const textarea = document.querySelector('textarea[placeholder="Type a message..."]') as HTMLTextAreaElement
    if (textarea) {
      textarea.style.height = '40px'
    }

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone,
          message: messageBody,
          clientId: clientId || undefined,
          imageData: imageData || null,
          imageFiles: imageFiles || null
        })
      })

      if (response.ok) {
        const responseData = await response.json()
        
        // Store image data in localStorage using the database message ID
        if (selectedImages.length > 0 && responseData.messageId) {
          const imageDataKey = `imageData_${responseData.messageId}`
          localStorage.setItem(imageDataKey, JSON.stringify(selectedImages))
          console.log('Stored image data in localStorage with database ID:', responseData.messageId)
        }
        
        // Update message status to sent
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'sent' as const } : msg
        ))
        
        // Save message to local state for this contact (both new and existing contacts)
        if (selectedContact) {
          setNewContactMessages(prev => ({
            ...prev,
            [selectedContact.id]: [...(prev[selectedContact.id] || []), message]
          }))
        }
        
        if (showNewMessage) {
          // For new messages, clear the form and exit new message mode
          setNewMessageRecipient('')
          setShowNewMessage(false)
        } else {
          // Update contact's last message for existing conversations
          setContacts(prev => prev.map(contact => 
            contact.id === selectedContact?.id 
              ? { ...contact, lastMessage: messageBody, lastMessageTime: new Date() }
              : contact
          ))
        }
      } else {
        console.error('Failed to send message')
        // Update message status to failed
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, status: 'failed' as const } : msg
        ))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Update message status to failed
      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? { ...msg, status: 'failed' as const } : msg
      ))
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: '2-digit' 
      })
    }
  }

    const filteredContacts = contacts.filter(contact => 
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery) ||
    normalizePhone(contact.phone).includes(normalizePhone(searchQuery))
  )

  const getInitials = (firstName: string, lastName?: string) => {
    const firstInitial = firstName?.charAt(0) || ''
    const lastInitial = lastName?.charAt(0) || ''
    return `${firstInitial}${lastInitial}`.toUpperCase()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    console.log('File upload triggered, files:', files)
    
    if (files && files.length > 0) {
      const newFiles: File[] = []
      const newImages: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select only image files')
          continue
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`Please select images smaller than 5MB. ${file.name} is too large.`)
          continue
        }
        
        newFiles.push(file)
        console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
        
        // Create a preview URL for the image
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          console.log('Image preview created for:', file.name, 'length:', result.length)
          setSelectedImages(prev => [...prev, result])
        }
        reader.onerror = (error) => {
          console.error('Error reading file:', error)
          alert(`Error reading image file: ${file.name}`)
        }
        reader.readAsDataURL(file)
      }
      
      setSelectedFiles(prev => [...prev, ...newFiles])
    } else {
      console.log('No files selected')
    }
    
    // Reset the input value to allow selecting the same files again
    event.target.value = ''
  }

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Swipe functionality handlers
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, contactId: string) => {
    // Don't start swipe if clicking on action buttons
    const target = e.target as HTMLElement
    if (target.closest('[data-action-button]')) {
      return
    }
    
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    console.log('Swipe start:', contactId, 'at', clientX)
    setSwipeStartX(clientX)
    setSwipeCurrentX(clientX)
    setSwipedContactId(contactId)
  }

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (swipeStartX !== null) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      setSwipeCurrentX(clientX)
    }
  }

  const handleSwipeEnd = () => {
    if (swipeStartX !== null && swipeCurrentX !== null) {
      const swipeDistance = swipeStartX - swipeCurrentX
      const threshold = 50 // Reduced threshold for easier triggering
      console.log('Swipe end - distance:', swipeDistance, 'threshold:', threshold)
      
      if (swipeDistance > threshold) {
        // Swipe left - show actions
        console.log('Swipe left detected, showing actions')
        // Keep the swipe open - don't reset swipedContactId
      } else if (swipeDistance < -threshold) {
        // Swipe right - hide actions
        console.log('Swipe right detected, hiding actions')
        setSwipedContactId(null)
      } else {
        // Small swipe, keep current state
        console.log('Small swipe, keeping current state')
      }
    }
    
    setSwipeStartX(null)
    setSwipeCurrentX(null)
  }

  const handleActionClick = (action: string, contactId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent contact selection
    
    switch (action) {
      case 'mute':
        // Toggle mute notifications for this contact
        setMutedContacts(prev => {
          const newSet = new Set(prev)
          if (newSet.has(contactId)) {
            newSet.delete(contactId)
            console.log('Unmuted notifications for:', contactId)
          } else {
            newSet.add(contactId)
            console.log('Muted notifications for:', contactId)
          }
          return newSet
        })
        setSwipedContactId(null)
        break
      case 'delete':
        // Show delete confirmation
        setContactToDelete(contactId)
        setShowDeleteConfirmation(true)
        setSwipedContactId(null)
        break
    }
  }

  const handleConfirmDelete = async () => {
    if (contactToDelete) {
      try {
        // Find the contact to get its phone number
        const contactToDeleteData = contacts.find(c => c.id === contactToDelete)
        
        if (contactToDeleteData) {
          // Call the DELETE API to remove messages from the database
          const response = await fetch(`/api/sms?phone=${encodeURIComponent(contactToDeleteData.phone)}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            console.log('Successfully deleted conversation from database')
          } else {
            console.error('Failed to delete conversation from database')
          }
        }
        
        // Remove from local state
        setContacts(prev => prev.filter(c => c.id !== contactToDelete))
        if (selectedContact?.id === contactToDelete) {
          setSelectedContact(null)
          setMessages([])
        }
      } catch (error) {
        console.error('Error deleting conversation:', error)
        // Still remove from local state even if API call fails
        setContacts(prev => prev.filter(c => c.id !== contactToDelete))
        if (selectedContact?.id === contactToDelete) {
          setSelectedContact(null)
          setMessages([])
        }
      }
    }
    setShowDeleteConfirmation(false)
    setContactToDelete(null)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false)
    setContactToDelete(null)
  }

  // Common emojis for the picker
  const commonEmojis = [
    // Smileys & Emotions
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧',
    '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢',
    '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '💩', '👻', '💀',
    '☠️', '👽', '👾', '🤖',

    // Hearts & Love
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
    '💌', '💋',

    // Nature & Animals
    '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁',
    '🍂', '🍃', '🌺', '🌸', '🏵️', '🌻', '🌼', '🌷', '🌹', '🥀',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔',
    '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟',
    '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
    '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
    '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
    '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
    '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓',
    '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡',
    '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🐉', '🐲',

    // Food & Drink
    '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
    '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
    '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔',
    '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈',
    '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟',
    '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕',
    '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤',
    '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨',
    '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿',
    '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃',
    '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🧉',
    '🍾', '🥄', '🍴', '🍽️', '🔪', '🏺', '🥡', '🥢', '🧂',

    // Activities & Sports
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
    '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁',
    '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌',
    '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️',
    '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️',
    '🏊‍♀️', '🏊', '🏊‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️',
    '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉',
    '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🤹‍♂️',
    '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷',
    '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰',
    '🧩',

    // Objects & Symbols
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
    '💎', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔴',
    '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '⭐', '🌟',
    '✨', '⚡', '☄️', '💫', '🌙', '☀️', '🌤️', '⛅', '🌥️', '☁️',
    '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '☃️', '⛄', '🌬️', '💨', '💧',
    '💦', '☔', '☂️', '🌊', '🌫️', '🔥', '💥', '🌈',

    // Flags & Symbols
    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱',
    '🇩🇿', '🇦🇸', '🇦🇩'
  ]

  // Emoji search mapping
  const emojiSearchMap = {
    // Hearts & Love
    '❤️': 'heart red love',
    '🧡': 'heart orange love',
    '💛': 'heart yellow love',
    '💚': 'heart green love',
    '💙': 'heart blue love',
    '💜': 'heart purple love',
    '🖤': 'heart black love',
    '🤍': 'heart white love',
    '🤎': 'heart brown love',
    '💔': 'broken heart love',
    '❣️': 'heart exclamation love',
    '💕': 'two hearts love',
    '💞': 'revolving hearts love',
    '💓': 'beating heart love',
    '💗': 'growing heart love',
    '💖': 'sparkling heart love',
    '💘': 'heart arrow love',
    '💝': 'heart ribbon love',
    '💟': 'heart decoration love',
    '♥️': 'heart suit love',
    '💌': 'love letter love',
    '💋': 'kiss love',
    
    // Smileys
    '😀': 'grinning face smile happy',
    '😃': 'grinning face big eyes smile happy',
    '😄': 'grinning face smiling eyes smile happy',
    '😁': 'beaming face smiling eyes smile happy',
    '😆': 'grinning squinting face smile happy laugh',
    '😅': 'grinning face sweat smile happy',
    '😂': 'face tears joy laugh happy',
    '🤣': 'rolling floor laughing laugh happy',
    '😊': 'smiling face smiling eyes smile happy',
    '😇': 'smiling face halo smile happy angel',
    '🙂': 'slightly smiling face smile happy',
    '🙃': 'upside down face smile happy',
    '😉': 'winking face smile happy',
    '😌': 'relieved face smile happy',
    '😍': 'smiling face heart eyes love smile happy',
    '🥰': 'smiling face hearts love smile happy',
    '😘': 'face blowing kiss love smile',
    '😗': 'kissing face love smile',
    '😙': 'kissing face smiling eyes love smile',
    '😚': 'kissing face closed eyes love smile',
    '😋': 'face savoring food smile happy',
    '😛': 'face tongue smile happy',
    '😝': 'squinting face tongue smile happy',
    '😜': 'winking face tongue smile happy',
    '🤪': 'zany face smile happy',
    '🤨': 'face raised eyebrow smile',
    '🧐': 'face monocle smile',
    '🤓': 'nerd face smile',
    '😎': 'smiling face sunglasses cool smile',
    '🤩': 'star struck face smile happy',
    '🥳': 'partying face smile happy party',
    '😏': 'smirking face smile',
    '😒': 'unamused face sad',
    '😞': 'disappointed face sad',
    '😔': 'pensive face sad',
    '😟': 'worried face sad',
    '😕': 'confused face sad',
    '🙁': 'slightly frowning face sad',
    '☹️': 'frowning face sad',
    '😣': 'persevering face sad',
    '😖': 'confounded face sad',
    '😫': 'tired face sad',
    '😩': 'weary face sad',
    '🥺': 'pleading face sad',
    '😢': 'crying face sad',
    '😭': 'loudly crying face sad',
    '😤': 'face steam nose sad angry',
    '😠': 'angry face angry',
    '😡': 'pouting face angry',
    '🤬': 'face symbols mouth angry',
    '🤯': 'exploding head angry',
    '😳': 'flushed face surprised',
    '🥵': 'hot face hot',
    '🥶': 'cold face cold',
    '😱': 'face screaming fear surprised',
    '😨': 'fearful face fear surprised',
    '😰': 'anxious face sweat fear',
    '😥': 'sad relieved face sad',
    '😓': 'downcast face sweat sad',
    '🤗': 'hugging face happy',
    '🤔': 'thinking face think',
    '🤭': 'face hand mouth think',
    '🤫': 'shushing face quiet',
    '🤥': 'lying face lie',
    '😶': 'face mouthless neutral',
    '😐': 'neutral face neutral',
    '😑': 'expressionless face neutral',
    '😯': 'hushed face surprised',
    '😦': 'frowning face open mouth sad',
    '😧': 'anguished face sad',
    '😮': 'face open mouth surprised',
    '😲': 'astonished face surprised',
    '🥱': 'yawning face tired',
    '😴': 'sleeping face tired',
    '🤤': 'drooling face tired',
    '😪': 'sleepy face tired',
    '😵': 'dizzy face dizzy',
    '🤐': 'zipper mouth face quiet',
    '🥴': 'woozy face dizzy',
    '🤢': 'nauseated face sick',
    '🤮': 'face vomiting sick',
    '🤧': 'sneezing face sick',
    '😷': 'face medical mask sick',
    '🤒': 'face thermometer sick',
    '🤕': 'face head bandage sick',
    '🤑': 'money mouth face money',
    '🤠': 'cowboy hat face cowboy',
    '💩': 'pile of poo poop',
    '👻': 'ghost ghost',
    '💀': 'skull skull',
    '☠️': 'skull crossbones skull',
    '👽': 'alien alien',
    '👾': 'alien monster alien',
    '🤖': 'robot robot',
    
    // Animals
    '🐶': 'dog animal pet',
    '🐱': 'cat animal pet',
    '🐭': 'mouse animal',
    '🐹': 'hamster animal pet',
    '🐰': 'rabbit animal',
    '🦊': 'fox animal',
    '🐻': 'bear animal',
    '🐼': 'panda animal',
    '🐨': 'koala animal',
    '🐯': 'tiger animal',
    '🦁': 'lion animal',
    '🐮': 'cow animal',
    '🐷': 'pig animal',
    '🐸': 'frog animal',
    '🐵': 'monkey animal',
    '🐒': 'monkey animal',
    '🐔': 'chicken animal',
    '🐧': 'penguin animal',
    '🐦': 'bird animal',
    '🐤': 'baby chick animal',
    '🐣': 'hatching chick animal',
    '🐥': 'front facing baby chick animal',
    '🦆': 'duck animal',
    '🦅': 'eagle animal',
    '🦉': 'owl animal',
    '🦇': 'bat animal',
    '🐺': 'wolf animal',
    '🐗': 'boar animal',
    '🐴': 'horse animal',
    '🦄': 'unicorn animal',
    '🐝': 'bee insect',
    '🐛': 'bug insect',
    '🦋': 'butterfly insect',
    '🐌': 'snail animal',
    '🐞': 'lady beetle insect',
    '🐜': 'ant insect',
    '🦟': 'mosquito insect',
    '🦗': 'cricket insect',
    '🕷️': 'spider insect',
    '🕸️': 'spider web insect',
    '🦂': 'scorpion animal',
    '🐢': 'turtle animal',
    '🐍': 'snake animal',
    '🦎': 'lizard animal',
    '🦖': 't rex dinosaur',
    '🦕': 'sauropod dinosaur',
    '🐙': 'octopus animal',
    '🦑': 'squid animal',
    '🦐': 'shrimp animal',
    '🦞': 'lobster animal',
    '🦀': 'crab animal',
    '🐡': 'blowfish animal',
    '🐠': 'tropical fish animal',
    '🐟': 'fish animal',
    '🐬': 'dolphin animal',
    '🐳': 'spouting whale animal',
    '🐋': 'whale animal',
    '🦈': 'shark animal',
    '🐊': 'crocodile animal',
    '🐅': 'tiger animal',
    '🐆': 'leopard animal',
    '🦓': 'zebra animal',
    '🦍': 'gorilla animal',
    '🦧': 'orangutan animal',
    '🐘': 'elephant animal',
    '🦛': 'hippopotamus animal',
    '🦏': 'rhinoceros animal',
    '🐪': 'camel animal',
    '🐫': 'two hump camel animal',
    '🦒': 'giraffe animal',
    '🦘': 'kangaroo animal',
    '🐃': 'water buffalo animal',
    '🐂': 'ox animal',
    '🐄': 'cow animal',
    '🐎': 'horse animal',
    '🐖': 'pig animal',
    '🐏': 'ram animal',
    '🐑': 'ewe animal',
    '🐐': 'goat animal',
    '🦌': 'deer animal',
    '🐕': 'dog animal pet',
    '🐩': 'poodle dog animal pet',
    '🦮': 'guide dog animal pet',
    '🐕‍🦺': 'service dog animal pet',
    '🐈': 'cat animal pet',
    '🐈‍⬛': 'black cat animal pet',
    '🐓': 'rooster animal',
    '🦃': 'turkey animal',
    '🦚': 'peacock animal',
    '🦜': 'parrot animal',
    '🦢': 'swan animal',
    '🦩': 'flamingo animal',
    '🕊️': 'dove bird animal',
    '🐇': 'rabbit animal',
    '🦝': 'raccoon animal',
    '🦨': 'skunk animal',
    '🦡': 'badger animal',
    '🦫': 'beaver animal',
    '🦦': 'otter animal',
    '🦥': 'sloth animal',
    '🐁': 'mouse animal',
    '🐀': 'rat animal',
    '🐿️': 'chipmunk animal',
    '🦔': 'hedgehog animal',
    '🐉': 'dragon dragon',
    '🐲': 'dragon face dragon',
    
    // Food
    '🍎': 'red apple food fruit',
    '🍐': 'pear food fruit',
    '🍊': 'orange food fruit',
    '🍋': 'lemon food fruit',
    '🍌': 'banana food fruit',
    '🍉': 'watermelon food fruit',
    '🍇': 'grapes food fruit',
    '🍓': 'strawberry food fruit',
    '🫐': 'blueberries food fruit',
    '🍈': 'melon food fruit',
    '🍒': 'cherries food fruit',
    '🍑': 'peach food fruit',
    '🥭': 'mango food fruit',
    '🍍': 'pineapple food fruit',
    '🥥': 'coconut food fruit',
    '🥝': 'kiwi fruit food fruit',
    '🍅': 'tomato food vegetable',
    '🍆': 'eggplant food vegetable',
    '🥑': 'avocado food vegetable',
    '🥦': 'broccoli food vegetable',
    '🥬': 'leafy green food vegetable',
    '🥒': 'cucumber food vegetable',
    '🌶️': 'hot pepper food vegetable',
    '🫑': 'bell pepper food vegetable',
    '🌽': 'ear of corn food vegetable',
    '🥕': 'carrot food vegetable',
    '🫒': 'olive food vegetable',
    '🧄': 'garlic food vegetable',
    '🧅': 'onion food vegetable',
    '🥔': 'potato food vegetable',
    '🍠': 'roasted sweet potato food vegetable',
    '🥐': 'croissant food bread',
    '🥯': 'bagel food bread',
    '🍞': 'bread food bread',
    '🥖': 'baguette bread food bread',
    '🥨': 'pretzel food bread',
    '🧀': 'cheese wedge food dairy',
    '🥚': 'egg food',
    '🍳': 'cooking food',
    '🧈': 'butter food dairy',
    '🥞': 'pancakes food breakfast',
    '🧇': 'waffle food breakfast',
    '🥓': 'bacon food meat',
    '🥩': 'cut of meat food meat',
    '🍗': 'poultry leg food meat',
    '🍖': 'meat on bone food meat',
    '🦴': 'bone food',
    '🌭': 'hot dog food',
    '🍔': 'hamburger food',
    '🍟': 'french fries food',
    '🍕': 'pizza food',
    '🥪': 'sandwich food',
    '🥙': 'stuffed flatbread food',
    '🧆': 'falafel food',
    '🌮': 'taco food',
    '🌯': 'burrito food',
    '🫔': 'tamale food',
    '🥗': 'green salad food',
    '🥘': 'paella food',
    '🫕': 'fondue food',
    '🥫': 'canned food food',
    '🍝': 'spaghetti food',
    '🍜': 'steaming bowl food',
    '🍲': 'pot of food food',
    '🍛': 'curry rice food',
    '🍣': 'sushi food',
    '🍱': 'bento box food',
    '🥟': 'dumpling food',
    '🦪': 'oyster food',
    '🍤': 'fried shrimp food',
    '🍙': 'rice ball food',
    '🍚': 'cooked rice food',
    '🍘': 'rice cracker food',
    '🍥': 'fish cake swirl food',
    '🥠': 'fortune cookie food',
    '🥮': 'moon cake food',
    '🍢': 'oden food',
    '🍡': 'dango food',
    '🍧': 'shaved ice food',
    '🍨': 'ice cream food dessert',
    '🍦': 'soft ice cream food dessert',
    '🥧': 'pie food dessert',
    '🧁': 'cupcake food dessert',
    '🍰': 'shortcake food dessert',
    '🎂': 'birthday cake food dessert',
    '🍮': 'custard food dessert',
    '🍭': 'lollipop food candy',
    '🍬': 'candy food candy',
    '🍫': 'chocolate bar food candy',
    '🍿': 'popcorn food snack',
    '🍪': 'cookie food dessert',
    '🌰': 'chestnut food',
    '🥜': 'peanuts food',
    '🍯': 'honey pot food',
    '🥛': 'glass of milk food drink dairy',
    '🍼': 'baby bottle food drink',
    '🫖': 'teapot food drink',
    '☕': 'hot beverage food drink',
    '🍵': 'teacup without handle food drink',
    '🧃': 'beverage box food drink',
    '🥤': 'cup with straw food drink',
    '🧋': 'bubble tea food drink',
    '🍶': 'sake food drink alcohol',
    '🍺': 'beer mug food drink alcohol',
    '🍷': 'wine glass food drink alcohol',
    '🥂': 'clinking glasses food drink alcohol',
    '🥃': 'tumbler glass food drink alcohol',
    '🍸': 'cocktail glass food drink alcohol',
    '🍹': 'tropical drink food drink alcohol',
    '🧉': 'mate food drink',
    '🍾': 'bottle with popping cork food drink alcohol',
    '🥄': 'spoon utensil',
    '🍴': 'fork and knife utensil',
    '🍽️': 'fork and knife with plate utensil',
    '🔪': 'kitchen knife utensil',
    '🏺': 'amphora food',
    '🥡': 'takeout box food',
    '🥢': 'chopsticks utensil',
    '🧂': 'salt food',
    
    // Sports
    '⚽': 'soccer ball sports',
    '🏀': 'basketball sports',
    '🏈': 'american football sports',
    '⚾': 'baseball sports',
    '🥎': 'softball sports',
    '🎾': 'tennis sports',
    '🏐': 'volleyball sports',
    '🏉': 'rugby football sports',
    '🥏': 'flying disc sports',
    '🎱': 'pool 8 ball sports',
    '🪀': 'yo yo toy',
    '🏓': 'ping pong sports',
    '🏸': 'badminton sports',
    '🏒': 'ice hockey sports',
    '🏑': 'field hockey sports',
    '🥍': 'lacrosse sports',
    '🏏': 'cricket game sports',
    '🥅': 'goal net sports',
    '⛳': 'flag in hole sports',
    '🪁': 'kite toy',
    '🏹': 'bow and arrow sports',
    '🎣': 'fishing pole sports',
    '🤿': 'diving mask sports',
    '🥊': 'boxing glove sports',
    '🥋': 'martial arts uniform sports',
    '🎽': 'running shirt sports',
    '🛹': 'skateboard sports',
    '🛷': 'sled sports',
    '⛸️': 'ice skate sports',
    '🥌': 'curling stone sports',
    '🎿': 'skis sports',
    '⛷️': 'skier sports',
    '🏂': 'snowboarder sports',
    '🪂': 'parachute sports',
    '🏋️‍♀️': 'woman lifting weights sports',
    '🏋️': 'person lifting weights sports',
    '🏋️‍♂️': 'man lifting weights sports',
    '🤼‍♀️': 'women wrestling sports',
    '🤼': 'people wrestling sports',
    '🤼‍♂️': 'men wrestling sports',
    '🤸‍♀️': 'woman cartwheeling sports',
    '🤸': 'person cartwheeling sports',
    '🤸‍♂️': 'man cartwheeling sports',
    '⛹️‍♀️': 'woman bouncing ball sports',
    '⛹️': 'person bouncing ball sports',
    '⛹️‍♂️': 'man bouncing ball sports',
    '🤺': 'person fencing sports',
    '🤾‍♀️': 'woman playing handball sports',
    '🤾': 'person playing handball sports',
    '🤾‍♂️': 'man playing handball sports',
    '🏊‍♀️': 'woman swimming sports',
    '🏊': 'person swimming sports',
    '🏊‍♂️': 'man swimming sports',
    '🚣‍♀️': 'woman rowing boat sports',
    '🚣': 'person rowing boat sports',
    '🚣‍♂️': 'man rowing boat sports',
    '🧗‍♀️': 'woman climbing sports',
    '🧗': 'person climbing sports',
    '🧗‍♂️': 'man climbing sports',
    '🚵‍♀️': 'woman mountain biking sports',
    '🚵': 'person mountain biking sports',
    '🚵‍♂️': 'man mountain biking sports',
    '🚴‍♀️': 'woman biking sports',
    '🚴': 'person biking sports',
    '🚴‍♂️': 'man biking sports',
    '🏆': 'trophy sports',
    '🥇': '1st place medal sports',
    '🥈': '2nd place medal sports',
    '🥉': '3rd place medal sports',
    '🏅': 'sports medal sports',
    '🎖️': 'military medal sports',
    '🏵️': 'rosette flower',
    '🎗️': 'reminder ribbon',
    '🎫': 'ticket entertainment',
    '🎟️': 'admission tickets entertainment',
    '🎪': 'circus tent entertainment',
    '🤹‍♀️': 'woman juggling entertainment',
    '🤹': 'person juggling entertainment',
    '🤹‍♂️': 'man juggling entertainment',
    '🎭': 'performing arts entertainment',
    '🎨': 'artist palette art',
    '🎬': 'clapper board entertainment',
    '🎤': 'microphone entertainment',
    '🎧': 'headphone entertainment',
    '🎼': 'musical score music',
    '🎹': 'musical keyboard music',
    '🥁': 'drum music',
    '🪘': 'long drum music',
    '🎷': 'saxophone music',
    '🎺': 'trumpet music',
    '🎸': 'guitar music',
    '🪕': 'banjo music',
    '🎻': 'violin music',
    '🎲': 'game die game',
    '♟️': 'chess pawn game',
    '🎯': 'direct hit game',
    '🎳': 'bowling game',
    '🎮': 'video game game',
    '🎰': 'slot machine game',
    '🧩': 'puzzle piece game',
    
    // Objects
    '⌚': 'watch time',
    '📱': 'mobile phone technology',
    '📲': 'mobile phone with arrow technology',
    '💻': 'laptop computer technology',
    '⌨️': 'keyboard technology',
    '🖥️': 'desktop computer technology',
    '🖨️': 'printer technology',
    '🖱️': 'computer mouse technology',
    '🖲️': 'trackball technology',
    '🕹️': 'joystick game',
    '💎': 'gem stone jewelry',
    '🔶': 'large orange diamond shape',
    '🔷': 'large blue diamond shape',
    '🔸': 'small orange diamond shape',
    '🔹': 'small blue diamond shape',
    '🔺': 'red triangle pointed up shape',
    '🔻': 'red triangle pointed down shape',
    '💠': 'diamond with a dot shape',
    '🔘': 'radio button technology',
    '🔴': 'red circle color',
    '🟠': 'orange circle color',
    '🟡': 'yellow circle color',
    '🟢': 'green circle color',
    '🔵': 'blue circle color',
    '🟣': 'purple circle color',
    '⚫': 'black circle color',
    '⚪': 'white circle color',
    '🟤': 'brown circle color',
    '⭐': 'star star',
    '🌟': 'glowing star star',
    '✨': 'sparkles star',
    '⚡': 'high voltage lightning',
    '☄️': 'comet space',
    '💫': 'dizzy star',
    '🌙': 'crescent moon space',
    '☀️': 'sun space',
    '🌤️': 'sun behind small cloud weather',
    '⛅': 'sun behind cloud weather',
    '🌥️': 'sun behind large cloud weather',
    '☁️': 'cloud weather',
    '🌦️': 'sun behind rain cloud weather',
    '🌧️': 'cloud with rain weather',
    '⛈️': 'cloud with lightning and rain weather',
    '🌩️': 'cloud with lightning weather',
    '🌨️': 'cloud with snow weather',
    '☃️': 'snowman weather',
    '⛄': 'snowman without snow weather',
    '🌬️': 'wind face weather',
    '💨': 'dashing away wind',
    '💧': 'droplet water',
    '💦': 'sweat droplets water',
    '☔': 'umbrella with rain drops weather',
    '☂️': 'umbrella weather',
    '🌊': 'water wave ocean',
    '🌫️': 'fog weather',
    '🔥': 'fire fire',
    '💥': 'collision explosion',
    '🌈': 'rainbow weather',
    
    // Nature
    '🌱': 'seedling plant nature',
    '🌲': 'evergreen tree plant nature',
    '🌳': 'deciduous tree plant nature',
    '🌴': 'palm tree plant nature',
    '🌵': 'cactus plant nature',
    '🌾': 'sheaf of rice plant nature',
    '🌿': 'herb plant nature',
    '☘️': 'shamrock plant nature',
    '🍀': 'four leaf clover plant nature',
    '🍁': 'maple leaf plant nature',
    '🍂': 'fallen leaf plant nature',
    '🍃': 'leaf fluttering in wind plant nature',
    '🌺': 'hibiscus flower plant nature',
    '🌸': 'cherry blossom flower plant nature',
    '🏵️': 'rosette flower plant nature',
    '🌻': 'sunflower flower plant nature',
    '🌼': 'daisy flower plant nature',
    '🌷': 'tulip flower plant nature',
    '🌹': 'rose flower plant nature',
    '🥀': 'wilted flower flower plant nature',
    
    // Flags
    '🏁': 'chequered flag flag',
    '🚩': 'triangular flag flag',
    '🎌': 'crossed flags flag',
    '🏴': 'black flag flag',
    '🏳️': 'white flag flag',
    '🏳️‍🌈': 'rainbow flag flag pride',
    '🏴‍☠️': 'pirate flag flag',
    '🇦🇫': 'afghanistan flag country',
    '🇦🇽': 'åland islands flag country',
    '🇦🇱': 'albania flag country',
    '🇩🇿': 'algeria flag country',
    '🇦🇸': 'american samoa flag country',
    '🇦🇩': 'andorra flag country'
  }

  // Filter emojis based on search query
  const filteredEmojis = commonEmojis.filter(emoji => {
    if (emojiSearchQuery === '') return true
    const searchTerms = emojiSearchMap[emoji] || ''
    return searchTerms.toLowerCase().includes(emojiSearchQuery.toLowerCase())
  })

  // Click outside to close emoji picker and swipe actions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close emoji picker
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
        setEmojiSearchQuery('')
      }
      
      // Close swipe actions when clicking outside of contacts
      const target = event.target as Element
      if (swipedContactId && !target.closest('[data-contact-item]')) {
        setSwipedContactId(null)
      }
    }

    if (showEmojiPicker || swipedContactId) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker, swipedContactId])

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Left Sidebar - Contact List */}
      <div style={{ width: '350px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header with New Message Button and Search */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleNewMessageStart}
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                +
              </button>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: 14,
                  background: '#f9fafb',
                  boxSizing: 'border-box'
                }}
              />
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: '#6b7280'
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Contact List */}
        <div style={{ 
          flex: 1, 
          overflowY: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              No contacts found
            </div>
                      ) : (
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
                            {filteredContacts.map((contact) => {
                const isSwiped = swipedContactId === contact.id
                const swipeOffset = isSwiped ? -120 : 0
                
                return (
                <div
                  key={contact.id}
                  data-contact-item
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  {/* Swipe Actions */}
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    zIndex: 10,
                    transform: `translateX(${isSwiped ? 0 : 120}px)`,
                    transition: 'transform 0.3s ease'
                  }}>
                    {/* Mute Notifications Button (Purple) */}
                    <button
                      data-action-button="true"
                      onClick={(e) => handleActionClick('mute', contact.id, e)}
                      style={{
                        width: '60px',
                        background: '#7c3aed',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {mutedContacts.has(contact.id) ? (
                        // Muted icon (bell with slash)
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                          <path d="M3 3l18 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        // Unmuted icon (bell)
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                        </svg>
                      )}
                    </button>
                    
                    {/* Delete Button (Red) */}
                    <button
                      data-action-button="true"
                      onClick={(e) => handleActionClick('delete', contact.id, e)}
                      style={{
                        width: '60px',
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Contact Item */}
                  <div
                    onClick={() => {
                      setSelectedContact(contact)
                      setShowNewMessage(false)
                      setNewMessageRecipient('')
                      setNewMessage('')
                      setSwipedContactId(null) // Close swipe actions when selecting a contact
                       
                      // For new contacts, load messages from local state instead of database
                      if (contact.id.startsWith('new-') || contact.id.startsWith('temp-')) {
                        // Messages for new contacts are managed in local state
                        // They will be loaded when the contact is selected
                        setMessages([])
                      }
                    }}
                    onTouchStart={(e) => handleSwipeStart(e, contact.id)}
                    onTouchMove={handleSwipeMove}
                    onTouchEnd={handleSwipeEnd}
                    onMouseDown={(e) => handleSwipeStart(e, contact.id)}
                    onMouseMove={handleSwipeMove}
                    onMouseUp={handleSwipeEnd}
                                          style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: selectedContact?.id === contact.id ? '#f3f4f6' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transform: `translateX(${swipeOffset}px)`,
                        transition: 'transform 0.3s ease',
                        position: 'relative',
                        zIndex: 5,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        touchAction: 'pan-y'
                      }}
                    onMouseEnter={(e) => {
                      if (selectedContact?.id !== contact.id) {
                        e.currentTarget.style.background = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedContact?.id !== contact.id) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                {/* Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#7c3aed',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  position: 'relative'
                }}>
                  {contact.avatar}
                  {contact.isVerified && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '16px',
                      height: '16px',
                      background: '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white'
                    }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {contact.firstName} {contact.lastName}
                    </span>
                  </div>
                  
                  {contact.lastMessage && (
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.3'
                    }}>
                      {contact.lastMessage}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                {contact.lastMessageTime && (
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px'
                  }}>
                    {formatTime(contact.lastMessageTime)}
                  </div>
                )}
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Message Composition Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {showNewMessage ? (
          <>
                         {/* New Message Header */}
             <div style={{
               padding: '16px',
               borderBottom: '1px solid #e5e7eb',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'space-between'
             }}>
               <div style={{ fontSize: '14px', color: '#6b7280', position: 'relative' }}>
                 To: <input
                   type="text"
                   placeholder="Enter phone number or name"
                   value={newMessageRecipient}
                   onChange={(e) => {
                     setNewMessageRecipient(e.target.value)
                     handleClientSearch(e.target.value)
                   }}
                   onFocus={() => {
                     if (newMessageRecipient.trim()) {
                       handleClientSearch(newMessageRecipient)
                     }
                   }}
                   style={{
                     border: 'none',
                     background: 'transparent',
                     fontSize: '14px',
                     color: '#111827',
                     outline: 'none',
                     width: '250px',
                     fontWeight: '500'
                   }}
                 />
                 
                 {/* Client search dropdown */}
                 {showClientDropdown && (
                   <div 
                     data-client-dropdown
                     style={{
                       position: 'absolute',
                       top: '100%',
                       left: '0',
                       right: '0',
                       maxHeight: '200px',
                       overflow: 'auto',
                       border: '1px solid #e5e7eb',
                       borderRadius: '8px',
                       background: 'white',
                       boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                       zIndex: 1000,
                       marginTop: '4px'
                     }}
                   >
                     {filteredClients.length > 0 ? (
                       filteredClients.map(client => (
                         <div
                           key={client.id}
                           style={{
                             padding: '12px',
                             cursor: 'pointer',
                             transition: 'all 0.2s',
                             borderBottom: '1px solid #f3f4f6'
                           }}
                           onClick={() => handleClientSelect(client)}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.background = '#f9fafb'
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.background = 'white'
                           }}
                         >
                           <div style={{ fontWeight: '500', color: '#111827' }}>
                             {client.firstName} {client.lastName || ''}
                           </div>
                           <div style={{ fontSize: '13px', color: '#6b7280' }}>
                             {client.phone}
                             {client.email && <span> • {client.email}</span>}
                           </div>
                         </div>
                       ))
                     ) : (
                       <div style={{ 
                         padding: '12px', 
                         textAlign: 'center', 
                         color: '#6b7280',
                         fontSize: '14px'
                       }}>
                         No clients found
                       </div>
                     )}
                   </div>
                 )}
               </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowNewMessage(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* New Message Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Start a new conversation
              </h3>
              <p style={{ margin: 0, fontSize: '14px', textAlign: 'center', color: '#6b7280' }}>
                Enter a phone number or select a contact to begin messaging
              </p>
            </div>

            {/* Message Input */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative'
            }}>
              {/* Photo Upload Button */}
              <label style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #d1d5db',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b7280'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </label>

              {/* Emoji Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
              </button>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '0px',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}
                >
                  {/* Search Bar */}
                  <div style={{
                    position: 'relative',
                    marginBottom: '16px'
                  }}>
                    <input
                      type="text"
                      placeholder="Search"
                      value={emojiSearchQuery}
                      onChange={(e) => setEmojiSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f3f4f6',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <svg
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: '#6b7280'
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Emoji Categories */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      {emojiSearchQuery ? 'Search Results' : 'Used Most'}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '4px',
                      marginBottom: '16px'
                    }}>
                      {emojiSearchQuery ? (
                        filteredEmojis.slice(0, 8).map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => addEmoji(emoji)}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              fontSize: '20px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {emoji}
                          </button>
                        ))
                      ) : (
                        <>
                          <button
                            onClick={() => addEmoji('😀')}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              fontSize: '20px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            😀
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Smiles Category */}
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Smiles
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '4px'
                    }}>
                      {(emojiSearchQuery ? filteredEmojis : commonEmojis).slice(0, 64).map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => addEmoji(emoji)}
                          style={{
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '20px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Image Preview for New Message */}
                {selectedImages.length > 0 && (
                  <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    maxWidth: '200px',
                    marginBottom: '8px'
                  }}>
                    <img
                      src={selectedImages[0]}
                      alt="Selected"
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        maxHeight: '150px',
                        objectFit: 'cover'
                      }}
                    />
                    {selectedFiles.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        +{selectedFiles.length - 1}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedImages([])
                        setSelectedFiles([])
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '16px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              
                              <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || !newMessageRecipient.trim()}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    background: ((newMessage.trim() || selectedFiles.length > 0) && newMessageRecipient.trim()) ? '#7c3aed' : '#d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: ((newMessage.trim() || selectedFiles.length > 0) && newMessageRecipient.trim()) ? 'pointer' : 'not-allowed',
                    color: 'white'
                  }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </>
        ) : selectedContact ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#7c3aed',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                position: 'relative'
              }}>
                {getInitials(selectedContact.firstName, selectedContact.lastName)}
                {selectedContact.isVerified && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-1px',
                    right: '-1px',
                    width: '12px',
                    height: '12px',
                    background: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid white'
                  }}>
                    <svg width="6" height="6" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>
              
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                  {selectedContact.firstName} {selectedContact.lastName}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {selectedContact.phone}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>
                  No messages yet. Start a conversation!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {messages.map((message, index) => {
                    const isFromBusiness = message.from === 'business'
                    const showTimestamp = index === messages.length - 1 || 
                      (index < messages.length - 1 && 
                       new Date(message.timestamp).getTime() - new Date(messages[index + 1].timestamp).getTime() > 300000) // 5 minutes
                    
                    return (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isFromBusiness ? 'flex-end' : 'flex-start',
                          gap: '4px'
                        }}
                      >
                        {/* Message Bubble */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          gap: '8px',
                          maxWidth: '70%'
                        }}>
                          {!isFromBusiness && (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#7c3aed',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '600',
                              flexShrink: 0
                            }}>
                              {getInitials(selectedContact.firstName, selectedContact.lastName)}
                            </div>
                          )}
                          
                                               <div style={{
                       padding: '10px 14px',
                       borderRadius: isFromBusiness ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                       background: isFromBusiness ? '#7c3aed' : '#f3f4f6',
                       color: isFromBusiness ? 'white' : '#111827',
                       fontSize: '14px',
                       lineHeight: '1.4',
                       position: 'relative',
                       wordWrap: 'break-word',
                       maxWidth: '100%'
                     }}>
                       {/* Check if this is an image message */}
                       {(message.body.startsWith('[Image:') && message.body.includes(']')) || 
                        (message.body.startsWith('[1 Image Sent]') || message.body.startsWith('[2 Images Sent]') || 
                         message.body.startsWith('[3 Images Sent]') || message.body.startsWith('[4 Images Sent]') ||
                         message.body.startsWith('[5 Images Sent]') || message.body.match(/\[\d+ Images Sent\]/)) ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           {/* Handle multiple images */}
                           {message.imageFiles && message.imageFiles.length > 0 ? (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                               {message.imageFiles.map((imageData, index) => (
                                 <img
                                   key={index}
                                   src={imageData}
                                   alt={`Image ${index + 1}`}
                                   style={{
                                     width: '200px',
                                     height: '150px',
                                     borderRadius: '8px',
                                     objectFit: 'cover',
                                     border: '1px solid rgba(255,255,255,0.2)'
                                   }}
                                 />
                               ))}
                             </div>
                           ) : message.imageData ? (
                             // Fallback to single image for backward compatibility
                             <img
                               src={message.imageData}
                               alt="Image"
                               style={{
                                 width: '200px',
                                 height: '150px',
                                 borderRadius: '8px',
                                 objectFit: 'cover',
                                 border: '1px solid rgba(255,255,255,0.2)'
                               }}
                             />
                           ) : (
                             // Display placeholder if no image data
                             <div style={{
                               width: '200px',
                               height: '150px',
                               background: 'linear-gradient(45deg, #f0f0f0, #e0e0e0)',
                               borderRadius: '8px',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               border: '2px dashed #ccc',
                               color: isFromBusiness ? 'rgba(255,255,255,0.8)' : '#666'
                             }}>
                               <div style={{ textAlign: 'center' }}>
                                 <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                                 <div style={{ fontSize: '12px' }}>Image</div>
                               </div>
                             </div>
                           )}
                           
                           {/* Display text after image info */}
                           {(() => {
                             const textAfterImage = message.body.replace(/\[.*?Images? Sent\]/, '').trim()
                             return textAfterImage && <div>{textAfterImage}</div>
                           })()}
                         </div>
                       ) : (
                         message.body
                       )}
                            

                          </div>
                        </div>
                        
                        {/* Timestamp */}
                        {showTimestamp && (
                          <div style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            marginTop: '2px',
                            alignSelf: isFromBusiness ? 'flex-end' : 'flex-start'
                          }}>
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Scroll to bottom element */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              position: 'relative'
            }}>
              {/* Photo Upload Button */}
              <label style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #d1d5db',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b7280'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </label>

              {/* Emoji Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                </svg>
              </button>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '0px',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}
                >
                  {/* Search Bar */}
                  <div style={{
                    position: 'relative',
                    marginBottom: '16px'
                  }}>
                    <input
                      type="text"
                      placeholder="Search"
                      value={emojiSearchQuery}
                      onChange={(e) => setEmojiSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f3f4f6',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <svg
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        color: '#6b7280'
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Emoji Categories */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      {emojiSearchQuery ? 'Search Results' : 'Used Most'}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '4px',
                      marginBottom: '16px'
                    }}>
                      {emojiSearchQuery ? (
                        filteredEmojis.slice(0, 8).map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => addEmoji(emoji)}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              fontSize: '20px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {emoji}
                          </button>
                        ))
                      ) : (
                        <>
                          <button
                            onClick={() => addEmoji('😀')}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              background: 'transparent',
                              fontSize: '20px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f3f4f6'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            😀
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Smiles Category */}
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Smiles
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      gap: '4px'
                    }}>
                      {(emojiSearchQuery ? filteredEmojis : commonEmojis).slice(0, 64).map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => addEmoji(emoji)}
                          style={{
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '20px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedImages.length > 0 && (
                  <div style={{
                    position: 'relative',
                    display: 'inline-block',
                    maxWidth: '200px'
                  }}>
                    {selectedImages.length > 0 && (
                      <img
                        src={selectedImages[0]}
                        alt="Selected"
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          maxHeight: '150px',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    {selectedFiles.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        +{selectedFiles.length - 1}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedImages([])
                        setSelectedFiles([])
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '20px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '120px',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    overflow: 'hidden'
                  }}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = '40px'
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                  }}
                />
              </div>
              
                              <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() && selectedFiles.length === 0}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    background: (newMessage.trim() || selectedFiles.length > 0) ? '#7c3aed' : '#d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (newMessage.trim() || selectedFiles.length > 0) ? 'pointer' : 'not-allowed',
                    color: 'white'
                  }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            padding: '40px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Select a conversation
            </h3>
            <p style={{ margin: 0, fontSize: '14px', textAlign: 'center' }}>
              Choose a contact from the list to start messaging
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
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
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center'
          }}>
            {/* Icon at the top */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
                </svg>
              </div>
            </div>
            
            {/* Title */}
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              textAlign: 'center'
            }}>
              Delete Conversation
            </h3>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this conversation?
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 16px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
