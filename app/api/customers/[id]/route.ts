import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/customers/[id] - Get a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customer = await prisma.client.findUnique({
      where: { id }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Transform the data to match our frontend interface
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

    return NextResponse.json(transformedCustomer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PATCH /api/customers/[id] - Update a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const updateData: any = {}
    
    if (firstName !== undefined) updateData.firstName = firstName.trim()
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (phone !== undefined) updateData.phone = phone.trim()
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (preferredStaff !== undefined) updateData.preferredStaff = preferredStaff || null
    if (tags !== undefined) updateData.tags = tags && tags.length > 0 ? JSON.stringify(tags) : null

    const customer = await prisma.client.update({
      where: { id },
      data: updateData
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

    return NextResponse.json(transformedCustomer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.client.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
} 