// hooks/useDataProtection.ts
import { useState, useEffect, useCallback } from 'react'
import { DataProtection, DataBackup, DataValidationResult } from '../utils/dataProtection'

export const useDataProtection = () => {
  const [storageUsage, setStorageUsage] = useState({ used: 0, available: 0, percentage: 0 })
  const [lastBackup, setLastBackup] = useState<Date | null>(null)
  const [backupCount, setBackupCount] = useState(0)

  // Monitor storage usage
  const updateStorageUsage = useCallback(() => {
    const usage = DataProtection.getStorageUsage()
    setStorageUsage(usage)
  }, [])

  // Create and save backup
  const createBackup = useCallback(() => {
    const backupKey = DataProtection.autoBackup()
    if (backupKey) {
      setLastBackup(new Date())
      setBackupCount(prev => prev + 1)
      console.log('Auto-backup created:', backupKey)
      return backupKey
    }
    return null
  }, [])

  // Get all available backups
  const getBackups = useCallback(() => {
    return DataProtection.getAvailableBackups()
  }, [])

  // Restore from backup
  const restoreFromBackup = useCallback((backupKey: string) => {
    const backup = DataProtection.loadBackup(backupKey)
    if (backup) {
      const success = DataProtection.restoreFromBackup(backup)
      if (success) {
        // Trigger page reload to reflect restored data
        window.location.reload()
      }
      return success
    }
    return false
  }, [])

  // Export data
  const exportData = useCallback(() => {
    return DataProtection.exportData()
  }, [])

  // Import data
  const importData = useCallback((importString: string) => {
    const success = DataProtection.importData(importString)
    if (success) {
      // Trigger page reload to reflect imported data
      window.location.reload()
    }
    return success
  }, [])

  // Validate specific data type
  const validateData = useCallback((data: any, dataType: string) => {
    return DataProtection.validateData(data, dataType)
  }, [])

  // Auto-backup on critical operations
  const autoBackup = useCallback(() => {
    return createBackup()
  }, [createBackup])

  // Initialize storage monitoring
  useEffect(() => {
    updateStorageUsage()
    
    // Update storage usage every 5 minutes
    const interval = setInterval(updateStorageUsage, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [updateStorageUsage])

  // Auto-backup when storage usage is high
  useEffect(() => {
    if (storageUsage.percentage > 80) {
      console.warn('Storage usage is high, creating backup')
      createBackup()
    }
  }, [storageUsage.percentage, createBackup])

  // Auto-backup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      createBackup()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [createBackup])

  return {
    storageUsage,
    lastBackup,
    backupCount,
    createBackup,
    getBackups,
    restoreFromBackup,
    exportData,
    importData,
    validateData,
    autoBackup,
    updateStorageUsage
  }
} 