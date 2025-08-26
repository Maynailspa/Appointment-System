// app/api/staff/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/staff - Get all staff members
export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    // Convert to frontend format
    const staffMembers = staff.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role || 'Staff Member',
      avatar: member.avatar || '',
      color: member.color || '#3b82f6',
      services: member.services ? member.services.split(',') : [],
      priority: member.priority || 50, // Default priority to 50
      workingHours: member.workingHours ? JSON.parse(member.workingHours) : {},
      isActive: member.isActive !== false, // Default to true if not set
      createdAt: member.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: member.updatedAt?.toISOString() || new Date().toISOString(),
    }))

    return NextResponse.json(staffMembers)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST /api/staff - Create a new staff member
export async function POST(request: NextRequest) {
  try {
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

    // Generate a simple ID for new staff members
    const existingStaff = await prisma.staff.findMany({
      orderBy: { id: 'asc' }
    })
    
    let newId = '1'
    if (existingStaff.length > 0) {
      // Find the highest numeric ID and increment it
      const numericIds = existingStaff
        .map(s => parseInt(s.id))
        .filter(id => !isNaN(id))
        .sort((a, b) => b - a)
      
      if (numericIds.length > 0) {
        newId = (numericIds[0] + 1).toString()
      }
    }

    // Create the staff member
    const staffMember = await prisma.staff.create({
      data: {
        id: newId,
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
    console.error('Error creating staff member:', error)
    return NextResponse.json({ error: 'Failed to create staff member: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }
} 