'use client'

import React from 'react'
import { RigidBody } from '@react-three/rapier'
import { Detailed } from '@react-three/drei'

interface BuildingProps {
  position: [number, number, number]
  width?: number
  height?: number
  depth?: number
  color?: string
}

export const Building: React.FC<BuildingProps> = ({
  position,
  width = 4,
  height = 10,
  depth = 4,
  color = '#888888',
}) => {
  return (
    <RigidBody type="fixed" position={[position[0], position[1] + height / 2, position[2]]}>
      <Detailed distances={[0, 50, 100]}>
        {/* High detail: Glassy physical material with shadows */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshPhysicalMaterial 
            color={color} 
            roughness={0.2} 
            metalness={0.6}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
            envMapIntensity={2.0}
          />
        </mesh>
        
        {/* Medium detail: Standard material, no shadow casting */}
        <mesh receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
        </mesh>
        
        {/* Low detail: Basic material */}
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </Detailed>
    </RigidBody>
  )
}
