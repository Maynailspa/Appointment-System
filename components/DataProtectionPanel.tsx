// components/DataProtectionPanel.tsx
import React, { useState, useEffect } from 'react'
import { useDataProtection } from '../hooks/useDataProtection'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function DataProtectionPanel({ isOpen, onClose }: Props) {
  const {
    storageUsage,
    lastBackup,
    backupCount,
    createBackup,
    getBackups,
    restoreFromBackup,
    exportData,
    importData,
    validateData
  } = useDataProtection()

  const [backups, setBackups] = useState<Array<{ key: string; backup: any }>>([])
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [validationResults, setValidationResults] = useState<any>({})

  useEffect(() => {
    if (isOpen) {
      setBackups(getBackups())
    }
  }, [isOpen, getBackups])

  const handleCreateBackup = () => {
    const backupKey = createBackup()
    if (backupKey) {
      alert('Backup created successfully!')
      setBackups(getBackups())
    } else {
      alert('Failed to create backup. Please try again.')
    }
  }

  const handleRestoreBackup = () => {
    if (!selectedBackup) {
      alert('Please select a backup to restore.')
      return
    }

    if (confirm('This will replace all current data with the backup data. Are you sure?')) {
      const success = restoreFromBackup(selectedBackup)
      if (success) {
        alert('Data restored successfully! The page will reload.')
      } else {
        alert('Failed to restore data. Please try again.')
      }
    }
  }

  const handleExportData = () => {
    const exportString = exportData()
    if (exportString) {
      const blob = new Blob([exportString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `salon-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('Data exported successfully!')
    } else {
      alert('Failed to export data. Please try again.')
    }
  }

  const handleImportData = () => {
    if (!importText.trim()) {
      alert('Please paste the backup data.')
      return
    }

    if (confirm('This will replace all current data with the imported data. Are you sure?')) {
      const success = importData(importText)
      if (success) {
        alert('Data imported successfully! The page will reload.')
      } else {
        alert('Failed to import data. Please check the format and try again.')
      }
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        width: '90%'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            Data Protection & Backup
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Storage Usage */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Storage Usage
          </h3>
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Used:</strong> {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.available)}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${storageUsage.percentage}%`,
                height: '100%',
                backgroundColor: storageUsage.percentage > 80 ? '#ef4444' : '#10b981',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
              {storageUsage.percentage.toFixed(1)}% used
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Backup Status
          </h3>
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Total Backups:</strong> {backupCount}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Last Backup:</strong> {lastBackup ? formatDate(lastBackup.getTime()) : 'Never'}
            </div>
            <button
              onClick={handleCreateBackup}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Create Backup Now
            </button>
          </div>
        </div>

        {/* Available Backups */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Available Backups
          </h3>
          {backups.length > 0 ? (
            <div style={{ marginBottom: '12px' }}>
              <select
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  marginBottom: '8px'
                }}
              >
                <option value="">Select a backup to restore</option>
                {backups.map(({ key, backup }) => (
                  <option key={key} value={key}>
                    {formatDate(backup.timestamp)} - {backup.data ? Object.keys(backup.data).length : 0} data types
                  </option>
                ))}
              </select>
              <button
                onClick={handleRestoreBackup}
                disabled={!selectedBackup}
                style={{
                  backgroundColor: selectedBackup ? '#ef4444' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: selectedBackup ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  marginRight: '8px'
                }}
              >
                Restore Selected Backup
              </button>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              No backups available
            </div>
          )}
        </div>

        {/* Export/Import */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Export & Import
          </h3>
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={handleExportData}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                marginRight: '8px'
              }}
            >
              Export Data
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showImport ? 'Cancel Import' : 'Import Data'}
            </button>
          </div>
          
          {showImport && (
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your backup data here..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginBottom: '8px'
                }}
              />
              <button
                onClick={handleImportData}
                disabled={!importText.trim()}
                style={{
                  backgroundColor: importText.trim() ? '#ef4444' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: importText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                Import Data
              </button>
            </div>
          )}
        </div>

        {/* Data Validation */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Data Health Check
          </h3>
          <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
              Check the integrity of your stored data
            </p>
            <button
              onClick={() => {
                const dataTypes = ['appointments', 'activityFeed', 'businessSettings', 'staff', 'clients', 'services']
                const results: any = {}
                
                dataTypes.forEach(dataType => {
                  const data = localStorage.getItem(dataType)
                  if (data) {
                    try {
                      const parsedData = JSON.parse(data)
                      results[dataType] = validateData(parsedData, dataType)
                    } catch (error) {
                      results[dataType] = { isValid: false, errors: ['Failed to parse data'] }
                    }
                  } else {
                    results[dataType] = { isValid: true, errors: [], warnings: ['No data found'] }
                  }
                })
                
                setValidationResults(results)
              }}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Run Health Check
            </button>
            
            {Object.keys(validationResults).length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {Object.entries(validationResults).map(([dataType, result]: [string, any]) => (
                  <div key={dataType} style={{ marginBottom: '8px' }}>
                    <strong>{dataType}:</strong>
                    <span style={{
                      color: result.isValid ? '#10b981' : '#ef4444',
                      marginLeft: '8px'
                    }}>
                      {result.isValid ? '✓ Valid' : '✗ Invalid'}
                    </span>
                    {result.errors.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#ef4444', marginLeft: '16px' }}>
                        {result.errors.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 