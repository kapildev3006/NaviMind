'use client'

import React from 'react'
import { RigidBody } from '@react-three/rapier'
import { Detailed } from '@react-three/drei'

interface ParkProps {
  position: [number, number, number]
  width?: number
  depth?: number
}

export const Park: React.FC<ParkProps> = ({ position, width = 10, depth = 10 }) => {
  const trees = React.useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => {
      const x = (Math.random() - 0.5) * (width - 2)
      const z = (Math.random() - 0.5) * (depth - 2)
      return { id: i, x, z }
    })
  }, [width, depth])

  return (
    <group position={position}>
      {/* Grass base */}
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[width, 0.2, depth]} />
        <meshPhysicalMaterial color="#2d5a2d" roughness={1} metalness={0} />
      </mesh>

      {/* Procedural trees */}
      {trees.map(({ id, x, z }) => {
        return (
          <RigidBody key={id} type="fixed" position={[x, 0.2, z]}>
            <Detailed distances={[0, 40, 80]}>
              {/* High detail */}
              <group>
                <mesh position={[0, 0.5, 0]} castShadow>
                  <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
                  <meshStandardMaterial color="#3e2723" roughness={0.9} />
                </mesh>
                <mesh position={[0, 1.5, 0]} castShadow>
                  <coneGeometry args={[1, 2, 8]} />
                  <meshStandardMaterial color="#1b5e20" roughness={0.8} />
                </mesh>
              </group>
              
              {/* Medium detail: fewer segments, no shadow */}
              <group>
                <mesh position={[0, 0.5, 0]}>
                  <cylinderGeometry args={[0.2, 0.2, 1, 4]} />
                  <meshStandardMaterial color="#3e2723" />
                </mesh>
                <mesh position={[0, 1.5, 0]}>
                  <coneGeometry args={[1, 2, 4]} />
                  <meshStandardMaterial color="#1b5e20" />
                </mesh>
              </group>
              
              {/* Low detail: simple box */}
              <mesh position={[0, 1, 0]}>
                <boxGeometry args={[1, 2, 1]} />
                <meshBasicMaterial color="#1b5e20" />
              </mesh>
            </Detailed>
          </RigidBody>
        )
      })}
    </group>
  )
}
