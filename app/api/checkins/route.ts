import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, firstName, lastName, service } = body

    // Find or create customer
    let customer = await prisma.client.findFirst({
      where: { phone }
    })

    if (!customer) {
      customer = await prisma.client.create({
        data: {
          firstName,
          lastName,
          phone,
          totalVisits: 1,
          lastVisit: new Date()
        }
      })
    } else {
      // Update existing customer's visit count and last visit
      await prisma.client.update({
        where: { id: customer.id },
        data: {
          totalVisits: { increment: 1 },
          lastVisit: new Date()
        }
      })
    }

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        clientId: customer.id,
        phone,
        firstName,
        lastName,
        service,
        status: 'waiting',
        checkInAt: new Date()
      },
      include: {
        client: true
      }
    })

    // Signal to other tabs that a new check-in was created
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('checkin:new'))
    }

    return NextResponse.json(checkIn, { status: 201 })
  } catch (error) {
    console.error('Error creating check-in:', error)
    return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    let whereClause = {}
    if (clientId) {
      whereClause = { clientId }
    }

    const checkIns = await prisma.checkIn.findMany({
      where: whereClause,
      include: {
        client: true,
        assignedStaff: true
      },
      orderBy: {
        checkInAt: 'desc'
      }
    })

    return NextResponse.json(checkIns)
  } catch (error) {
    console.error('Error fetching check-ins:', error)
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
  }
}
