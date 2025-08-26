// app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Props {
  params: { id: string }
}

// GET /api/staff/[id] - Get a specific staff member
export async function GET(req: Request, { params }: Props) {
  try {
    const staffMember = await prisma.staff.findUnique({
      where: { id: params.id },
    })

    if (!staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Return in frontend format
    const response = {
      id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role || 'Staff Member',
      avatar: staffMember.avatar || '',
      color: staffMember.color || '#3b82f6',
      services: staffMember.services ? staffMember.services.split(',') : [],
      priority: staffMember.priority || 50,
      workingHours: staffMember.workingHours ? JSON.parse(staffMember.workingHours) : {},
      isActive: staffMember.isActive !== false,
      createdAt: staffMember.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: staffMember.updatedAt?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 })
  }
}

// PUT /api/staff/[id] - Update a staff member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      email,
      phone,
      role,
      avatar,
      color,
      services,
      priority,
      workingHours,
      isActive
    } = body

    // Update the staff member
    const staffMember = await prisma.staff.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        role,
        avatar,
        color,
        services: services ? services.join(',') : '',
        priority: priority || 50,
        workingHours: workingHours ? JSON.stringify(workingHours) : '{}',
        isActive: isActive !== false,
      },
    })

    // Return in frontend format
    const response = {
      id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      role: staffMember.role || 'Staff Member',
      avatar: staffMember.avatar || '',
      color: staffMember.color || '#3b82f6',
      services: staffMember.services ? staffMember.services.split(',') : [],
      priority: staffMember.priority || 50,
      workingHours: staffMember.workingHours ? JSON.parse(staffMember.workingHours) : {},
      isActive: staffMember.isActive !== false,
      createdAt: staffMember.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: staffMember.updatedAt?.toISOString() || new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating staff member:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// DELETE /api/staff/[id] - Delete a staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if staff member has any appointments
    const appointments = await prisma.appointment.findMany({
      where: { staffId: id },
    })

    if (appointments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete staff member with existing appointments. Please reassign or cancel their appointments first.' 
      }, { status: 400 })
    }

    // Delete the staff member
    await prisma.staff.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
  }
} 