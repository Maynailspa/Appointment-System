import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/customers - Get all customers or lookup by phone
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  // If phone parameter is provided, do a lookup
  if (phone) {
    try {
      const normalizedPhone = phone.replace(/\D/g, '')
      const customer = await prisma.client.findFirst({
        where: { phone: normalizedPhone }
      })

      if (customer) {
        return NextResponse.json({
          found: true,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            dateOfBirth: customer.dateOfBirth?.toISOString().split('T')[0],
            notes: customer.notes,
            preferredStaff: customer.preferredStaff,
            tags: customer.tags ? JSON.parse(customer.tags) : [],
            totalVisits: customer.totalVisits,
            lastVisit: customer.lastVisit?.toISOString(),
            createdAt: customer.createdAt.toISOString()
          }
        })
      } else {
        return NextResponse.json({ found: false })
      }
    } catch (error) {
      console.error('Error looking up customer:', error)
      return NextResponse.json(
        { error: 'Failed to lookup customer' },
        { status: 500 }
      )
    }
  }

  // Otherwise, return all customers
  try {
    const customers = await prisma.client.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match our frontend interface
    const transformedCustomers = customers.map(customer => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth?.toISOString().split('T')[0],
      notes: customer.notes,
      preferredStaff: customer.preferredStaff,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalVisits: customer.totalVisits,
      lastVisit: customer.lastVisit?.toISOString(),
      createdAt: customer.createdAt.toISOString()
    }))

    return NextResponse.json(transformedCustomers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      notes,
      preferredStaff,
      tags
    } = body

    // Validate required fields
    if (!firstName?.trim()) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      )
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Create the customer
    const customer = await prisma.client.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email?.trim() || null,
        phone: phone.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        notes: notes?.trim() || null,
        preferredStaff: preferredStaff || null,
        tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
        totalVisits: 0
      }
    })

    // Transform the response to match our frontend interface
    const transformedCustomer = {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth?.toISOString().split('T')[0],
      notes: customer.notes,
      preferredStaff: customer.preferredStaff,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      totalVisits: customer.totalVisits,
      lastVisit: customer.lastVisit?.toISOString(),
      createdAt: customer.createdAt.toISOString()
    }

    return NextResponse.json(transformedCustomer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
} 