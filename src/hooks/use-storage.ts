'use client'
import { useState, useCallback } from 'react'

export function useStorage() {
  const [isSaasMode] = useState(() => {
    if (typeof window === 'undefined') return false
    // SaaS mode = no server-side API available (running on static host)
    // For now, detect based on environment variable or URL
    return false // Default to local mode
  })

  const requestAccess = useCallback(async () => {
    // Will be implemented when SaaS mode is needed
  }, [])

  return { isSaasMode, requestAccess }
}
