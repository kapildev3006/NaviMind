'use client'

import React from 'react'
import { RigidBody } from '@react-three/rapier'

import { useSimulationStore } from '@/store/useSimulationStore'

interface RoadProps {
  position: [number, number, number]
  width?: number
  depth?: number
  type?: 'straight' | 'intersection' | 'corner'
}

export const Road: React.FC<RoadProps> = ({
  position,
  width = 10,
  depth = 10,
  type = 'straight',
}) => {
  const isWet = false

  return (
    <RigidBody type="fixed" position={[position[0], position[1] + 0.05, position[2]]}>
      <mesh receiveShadow>
        <boxGeometry args={[width, 0.1, depth]} />
        <meshPhysicalMaterial 
          color={isWet ? "#0a0a0a" : "#1a1a1a"} 
          roughness={isWet ? 0.1 : 0.9} 
          metalness={isWet ? 0.3 : 0.1}
          clearcoat={isWet ? 1.0 : 0.1}
          clearcoatRoughness={isWet ? 0.05 : 0.8}
        />
      </mesh>
      
      {/* Basic road markings based on type (simplified for now) */}
      {type === 'straight' && (
        <mesh position={[0, 0.06, 0]}>
          <planeGeometry args={[0.2, depth]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      {type === 'intersection' && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 0.8, depth * 0.8]} />
          <meshBasicMaterial color="#555555" />
        </mesh>
      )}
    </RigidBody>
  )
}
