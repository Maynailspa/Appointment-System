import { PrismaClient } from '@prisma/client'
import { sendSMS, testSMS, validatePhoneNumber } from './twilio'
import { appointmentCreated, oneHourBefore, twentyFourHoursBefore, appointmentMissed, birthdayMessage } from './automations'
import { runSMScheduler } from '../jobs/sms-scheduler'

const prisma = new PrismaClient()

// Test phone number validation
export async function testPhoneValidation() {
  console.log('=== Testing Phone Number Validation ===')
  
  const testNumbers = [
    '123-456-7890',
    '1234567890',
    '+1-123-456-7890',
    '+11234567890',
    '123.456.7890',
    'invalid',
    '123',
    '+44-20-7946-0958'
  ]

  for (const number of testNumbers) {
    const result = validatePhoneNumber(number)
    console.log(`${number}: ${result.valid ? 'Valid' : 'Invalid'} - ${result.formatted || result.error}`)
  }
}

// Test SMS sending
export async function testSMSSending() {
  console.log('=== Testing SMS Sending ===')
  
  // Replace with a real phone number for testing
  const testPhone = process.env.TEST_PHONE_NUMBER || '+1234567890'
  
  if (testPhone === '+1234567890') {
    console.log('⚠️  Please set TEST_PHONE_NUMBER environment variable for real testing')
    return
  }

  const testMessage = `Test message from TurnMate SMS system - ${new Date().toLocaleString()}`
  
  try {
    const result = await sendSMS(testPhone, testMessage)
    console.log('SMS Send Result:', result)
  } catch (error) {
    console.error('SMS Send Error:', error)
  }
}

// Test automation triggers
export async function testAutomations() {
  console.log('=== Testing SMS Automations ===')
  
  // Create a test appointment
  const testClient = await prisma.client.findFirst()
  const testStaff = await prisma.staff.findFirst()
  
  if (!testClient || !testStaff) {
    console.log('⚠️  No test client or staff found. Please create some test data first.')
    return
  }

  // Create test appointment
  const testAppointment = await prisma.appointment.create({
    data: {
      title: 'Test Appointment',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
      status: 'confirmed',
      clientId: testClient.id,
      staffId: testStaff.id
    }
  })

  // Add test service
  await prisma.appointmentService.create({
    data: {
      appointmentId: testAppointment.id,
      serviceName: 'Test Service',
      servicePrice: 50.00,
      serviceDuration: 60
    }
  })

  console.log('Created test appointment:', testAppointment.id)

  // Test appointment confirmation
  try {
    const result = await appointmentCreated(testAppointment.id)
    console.log('Appointment Confirmation Result:', result)
  } catch (error) {
    console.error('Appointment Confirmation Error:', error)
  }

  // Clean up test appointment
  await prisma.appointmentService.deleteMany({
    where: { appointmentId: testAppointment.id }
  })
  await prisma.appointment.delete({
    where: { id: testAppointment.id }
  })
}

// Test scheduler
export async function testScheduler() {
  console.log('=== Testing SMS Scheduler ===')
  
  try {
    const result = await runSMScheduler()
    console.log('Scheduler Result:', result)
  } catch (error) {
    console.error('Scheduler Error:', error)
  }
}

// Test campaign creation
export async function testCampaignCreation() {
  console.log('=== Testing Campaign Creation ===')
  
  try {
    const campaign = await prisma.sMSCampaign.create({
      data: {
        name: 'Test Campaign',
        message: 'This is a test campaign message',
        status: 'draft',
        recipientCount: 0,
        sentCount: 0
      }
    })
    
    console.log('Created test campaign:', campaign)
    
    // Clean up
    await prisma.sMSCampaign.delete({
      where: { id: campaign.id }
    })
    
    console.log('Cleaned up test campaign')
  } catch (error) {
    console.error('Campaign Creation Error:', error)
  }
}

// Test template creation
export async function testTemplateCreation() {
  console.log('=== Testing Template Creation ===')
  
  try {
    const template = await prisma.sMSTemplate.create({
      data: {
        name: 'Test Template',
        type: 'test',
        body: 'Hello {{clientName}}, this is a test template!',
        variables: JSON.stringify(['clientName']),
        isActive: true
      }
    })
    
    console.log('Created test template:', template)
    
    // Clean up
    await prisma.sMSTemplate.delete({
      where: { id: template.id }
    })
    
    console.log('Cleaned up test template')
  } catch (error) {
    console.error('Template Creation Error:', error)
  }
}

// Test automation creation
export async function testAutomationCreation() {
  console.log('=== Testing Automation Creation ===')
  
  try {
    const automation = await prisma.sMSAutomation.create({
      data: {
        type: 'test_automation',
        enabled: true,
        lastTriggered: null
      }
    })
    
    console.log('Created test automation:', automation)
    
    // Clean up
    await prisma.sMSAutomation.delete({
      where: { id: automation.id }
    })
    
    console.log('Cleaned up test automation')
  } catch (error) {
    console.error('Automation Creation Error:', error)
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🚀 Starting SMS System Tests...\n')
  
  await testPhoneValidation()
  console.log('')
  
  await testSMSSending()
  console.log('')
  
  await testAutomations()
  console.log('')
  
  await testScheduler()
  console.log('')
  
  await testCampaignCreation()
  console.log('')
  
  await testTemplateCreation()
  console.log('')
  
  await testAutomationCreation()
  console.log('')
  
  console.log('✅ All tests completed!')
}

// Initialize default data
export async function initializeDefaultData() {
  console.log('🔧 Initializing default SMS data...')
  
  try {
    // Initialize templates
    const templatesResponse = await fetch('/api/sms/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize' })
    })
    
    if (templatesResponse.ok) {
      const templatesResult = await templatesResponse.json()
      console.log('Templates initialized:', templatesResult.message)
    }
    
    // Initialize automations
    const automationsResponse = await fetch('/api/sms/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize' })
    })
    
    if (automationsResponse.ok) {
      const automationsResult = await automationsResponse.json()
      console.log('Automations initialized:', automationsResult.message)
    }
    
    console.log('✅ Default data initialization completed!')
  } catch (error) {
    console.error('❌ Error initializing default data:', error)
  }
}

// Export individual test functions for manual testing
export {
  testPhoneValidation,
  testSMSSending,
  testAutomations,
  testScheduler,
  testCampaignCreation,
  testTemplateCreation,
  testAutomationCreation
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 