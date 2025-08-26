// contexts/WorkerSelectionContext.tsx

'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface WorkerSelectionContextType {
  selectedWorkerId: string | null
  setSelectedWorkerId: (workerId: string | null) => void
}

const WorkerSelectionContext = createContext<WorkerSelectionContextType | undefined>(undefined)

export function WorkerSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

  return (
    <WorkerSelectionContext.Provider value={{ selectedWorkerId, setSelectedWorkerId }}>
      {children}
    </WorkerSelectionContext.Provider>
  )
}

export function useWorkerSelection() {
  const context = useContext(WorkerSelectionContext)
  if (context === undefined) {
    throw new Error('useWorkerSelection must be used within a WorkerSelectionProvider')
  }
  return context
}





