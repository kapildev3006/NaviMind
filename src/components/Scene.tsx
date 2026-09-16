'use client'

import React, { useRef, Suspense } from 'react'
import { Sky, Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Robot } from './Robot'
import { Apartment } from './Apartment'
import { ApartmentObjects } from './ApartmentObjects'
import { useSimulationStore } from '@/store/useSimulationStore'
import * as THREE from 'three'

const DayNightCycle = () => {
  const { time, tickTime } = useSimulationStore()
  const lightRef = useRef<THREE.DirectionalLight>(null)

  useFrame((state, delta) => {
    tickTime(delta)

    const angle = ((useSimulationStore.getState().time - 6) / 12) * Math.PI
    const x = Math.cos(angle) * 35
    const y = Math.sin(angle) * 35
    const z = 20

    if (lightRef.current) {
      lightRef.current.position.set(x, y, z)
      lightRef.current.intensity = y > 0 ? Math.min(y / 20, 1.2) : 0
    }
  })

  return (
    <directionalLight
      ref={lightRef}
      castShadow
      position={[25, 30, 20]}
      intensity={1.2}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-far={60}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-bias={-0.0002}
    />
  )
}

export const Scene = () => {
  return (
    <>
      {/* Sky and City Environment for Window Visibility */}
      <Sky sunPosition={[25, 40, 20]} turbidity={0.1} rayleigh={0.5} />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      {/* Ambient and Interior Lighting */}
      <ambientLight intensity={0.6} color="#fff8f0" />
      <DayNightCycle />

      {/* Warm architectural interior downlights */}
      <pointLight position={[0, 2.35, 2.8]} intensity={14} distance={9} color="#fff3e6" castShadow />
      <pointLight position={[-1.8, 2.35, 2.6]} intensity={12} distance={7} color="#ffe8d6" />
      <pointLight position={[1.2, 2.35, -2.2]} intensity={12} distance={8} color="#fff3e6" />
      <pointLight position={[-1.6, 2.35, -1.2]} intensity={9} distance={6} color="#e0f2fe" />

      {/* Apartment 3D Environment */}
      <Apartment />

      {/* Apartment Real Physical Objects (Fire Extinguisher, TV, Smoke Detector, etc.) */}
      <ApartmentObjects />

      {/* Autonomous BD-1 Detection Robot */}
      <Robot />
    </>
  )
}
