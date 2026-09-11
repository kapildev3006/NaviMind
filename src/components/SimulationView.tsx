'use client'

import React, { useState, useEffect } from 'react'
import { SimulationCanvas } from './SimulationCanvas'
import { UIOverlay } from './UIOverlay'

export const SimulationView = () => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00e5ff',
        fontFamily: 'monospace',
        fontSize: '1.2rem',
        letterSpacing: '2px'
      }}>
        INITIALIZING APARTMENT SIMULATOR...
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <SimulationCanvas />
      <UIOverlay />
    </div>
  )
}

export default SimulationView
