'use client'

import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

export const Apartment = () => {
  const { scene } = useGLTF('/apartment.glb')

  // Clone scene or configure materials and shadow properties
  useMemo(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.roughness = Math.max(0.2, child.material.roughness ?? 0.5)
          child.material.envMapIntensity = 0.8
        }
      }
    })
  }, [scene])

  return (
    <group position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

// Preload the model to ensure smooth loading
useGLTF.preload('/apartment.glb')
