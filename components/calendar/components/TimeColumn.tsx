import React from 'react'

interface TimeColumnProps {
  width?: string
  minWidth?: string
  variant?: 'default' | 'header'
}

export default function TimeColumn({ 
  width = '74px', 
  minWidth = '74px',
  variant = 'default'
}: TimeColumnProps) {

  const styles = variant === 'header' ? {
    width,
    minWidth,
    padding: '12px 8px',
    borderRight: '1px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    cursor: 'default',
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
    position: 'relative' as const,
    zIndex: 10 as const
  } : {
    width,
    minWidth,
    borderRight: '1px solid #e5e7eb',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    cursor: 'default',
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
    position: 'relative' as const,
    zIndex: 10 as const
  }

  const textStyles = variant === 'header' ? {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  } : {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151'
  }

  return (
    <div 
      style={styles}
    >
      <div style={textStyles}>
        Time
      </div>
    </div>
  )
}
