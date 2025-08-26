// app/api/services/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/services - Get all services
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    // Convert to frontend format
    const serviceList = services.map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      category: service.category || 'General',
    }))

    return NextResponse.json(serviceList)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      name,
      price,
      duration,
      category
    } = body

    // Generate a simple ID for new services
    const existingServices = await prisma.service.findMany({
      orderBy: { id: 'asc' }
    })
    
    let newId = '1'
    if (existingServices.length > 0) {
      // Find the highest numeric ID and increment it
      const numericIds = existingServices
        .map(s => parseInt(s.id))
        .filter(id => !isNaN(id))
        .sort((a, b) => b - a)
      
      if (numericIds.length > 0) {
        newId = (numericIds[0] + 1).toString()
      }
    }

    // Create the service
    const service = await prisma.service.create({
      data: {
        id: newId,
        name,
        price,
        duration,
        category: category || 'General',
      },
    })

    // Return in frontend format
    const response = {
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      category: service.category || 'General',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
} 