'use client'

import React from 'react'
import { OrbitControls } from '@react-three/drei'
import { useSimulationStore } from '@/store/useSimulationStore'

export const Controls = () => {
  const cameraMode = useSimulationStore((state) => state.cameraMode)

  return (
    <OrbitControls 
      makeDefault
      enableDamping 
      dampingFactor={0.05} 
      minDistance={0.5} 
      maxDistance={18} 
      target={[0, 1.2, 1.0]}
      maxPolarAngle={Math.PI / 2 + 0.1} 
      enabled={cameraMode === 'FREE'}
    />
  )
}
