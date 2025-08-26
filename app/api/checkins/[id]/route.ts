import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/checkins/[id] - Update a check-in
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const {
      status,
      assignedStaffId,
      completedAt
    } = body

    const updateData: any = {}
    
    if (status) updateData.status = status
    if (assignedStaffId !== undefined) updateData.assignedStaffId = assignedStaffId || null
    if (completedAt) updateData.completedAt = new Date(completedAt)
    
    updateData.updatedAt = new Date()

    const checkIn = await prisma.checkIn.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        assignedStaff: true
      }
    })

    return NextResponse.json(checkIn)
  } catch (error) {
    console.error('Error updating check-in:', error)
    return NextResponse.json(
      { error: 'Failed to update check-in' },
      { status: 500 }
    )
  }
}

// DELETE /api/checkins/[id] - Delete a check-in
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.checkIn.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting check-in:', error)
    return NextResponse.json(
      { error: 'Failed to delete check-in' },
      { status: 500 }
    )
  }
}
