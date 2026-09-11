'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulationStore } from '@/store/useSimulationStore'
import * as THREE from 'three'

interface StreetLightProps {
  position: [number, number, number]
}

export const StreetLight: React.FC<StreetLightProps> = ({ position }) => {
  const bulbMaterialRef = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const time = useSimulationStore.getState().time
    // Lights on between 18:00 and 06:00
    const isNight = time >= 18 || time <= 6

    if (bulbMaterialRef.current) {
      bulbMaterialRef.current.emissiveIntensity = isNight ? 2 : 0
    }
    if (lightRef.current) {
      lightRef.current.intensity = isNight ? 0.5 : 0
    }
  })

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.1, 5]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Arm */}
      <mesh position={[0.5, 4.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Light housing */}
      <mesh position={[1, 4.9, 0]} castShadow>
        <boxGeometry args={[0.4, 0.1, 0.2]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* Light bulb (emissive) */}
      <mesh position={[1, 4.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.15]} />
        <meshStandardMaterial 
          ref={bulbMaterialRef}
          emissive="#ffea80" 
          emissiveIntensity={0} 
          color="#ffffff" 
        />
      </mesh>
      
      {/* Point light */}
      <pointLight 
        ref={lightRef}
        position={[1, 4.8, 0]} 
        intensity={0} 
        distance={15} 
        decay={2} 
        color="#ffea80" 
      />
    </group>
  )
}
