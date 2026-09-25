'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'
import { Effects } from './Effects'
import { Physics } from '@react-three/rapier'
import { CameraDirector } from '@/camera/CameraDirector'

export const SimulationCanvas = () => {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{ position: [-0.5, 1.8, 4.5], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Physics>
        <Scene />
        <CameraDirector />
      </Physics>
      <Effects />
    </Canvas>
  )
}
