'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'
import { Controls } from './Controls'
import { Effects } from './Effects'
import { Physics } from '@react-three/rapier'

export const SimulationCanvas = () => {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{ position: [0, 2.2, 5.0], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Physics>
        <Scene />
      </Physics>
      <Controls />
      <Effects />
    </Canvas>
  )
}
