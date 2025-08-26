// app/api/ws/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { setBroadcastFunction } from '@/lib/realtime-broadcast'

// For now, we'll use Server-Sent Events (SSE) as WebSocket support in Next.js API routes is limited
// This provides real-time updates with fallback compatibility

// Store active connections with SSE
const connections = new Map<string, ReadableStreamDefaultController>()

function broadcastMessage(message: any) {
  const messageString = `data: ${JSON.stringify(message)}\n\n`
  
  connections.forEach((controller, connectionId) => {
    try {
      controller.enqueue(messageString)
    } catch (error) {
      console.error(`Error sending message to ${connectionId}:`, error)
      connections.delete(connectionId)
    }
  })
  
  console.log(`Broadcasted message to ${connections.size} connections:`, message.type)
}

// Set up the broadcast function for direct server-side broadcasting
setBroadcastFunction(broadcastMessage)

export async function GET(request: NextRequest) {
  const connectionId = crypto.randomUUID()
  
  // Create Server-Sent Events stream
  const stream = new ReadableStream({
    start(controller) {
      connections.set(connectionId, controller)
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', connectionId })}\n\n`)
      
      console.log(`SSE connection opened: ${connectionId}`)
      
      // Send periodic heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`)
        } catch (error) {
          console.log(`Heartbeat failed for ${connectionId}, cleaning up`)
          clearInterval(heartbeat)
          connections.delete(connectionId)
        }
      }, 25000) // Send heartbeat every 25 seconds
      
      // Store heartbeat interval for cleanup
      ;(controller as any).heartbeat = heartbeat
    },
    cancel() {
      const controller = connections.get(connectionId)
      if (controller && (controller as any).heartbeat) {
        clearInterval((controller as any).heartbeat)
      }
      connections.delete(connectionId)
      console.log(`SSE connection closed: ${connectionId}`)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no' // Disable nginx buffering for SSE
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const message = await request.json()
    
    // Broadcast message to all connected clients
    broadcastMessage(message)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling POST message:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
