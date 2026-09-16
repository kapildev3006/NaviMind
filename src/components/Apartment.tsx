'use client'

import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, MeshCollider } from '@react-three/rapier'
import * as THREE from 'three'

export const Apartment = () => {
  const { scene } = useGLTF('/apartment.glb')

  // Separate collision meshes (walls, floor, furniture) from visual-only meshes (ceiling)
  const { collisionChildren, visualOnlyChildren } = useMemo(() => {
    const col: THREE.Object3D[] = []
    const vis: THREE.Object3D[] = []

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

    // Teto is the ceiling (Y > 2.4m) which is visual-only and excluded from robot collisions
    scene.children.forEach((child) => {
      if (child.name === 'Teto') {
        vis.push(child)
      } else {
        col.push(child)
      }
    })

    return { collisionChildren: col, visualOnlyChildren: vis }
  }, [scene])

  return (
    <group position={[0, 0, 0]}>
      {/* Visual-only non-collidable geometry (e.g. ceiling) */}
      {visualOnlyChildren.map((obj) => (
        <primitive key={obj.uuid} object={obj} />
      ))}

      {/* Structural walls, doorways, floor, and solid furniture with trimesh colliders */}
      <RigidBody type="fixed" colliders={false}>
        {collisionChildren.map((obj) => (
          <MeshCollider key={obj.uuid} type="trimesh">
            <primitive object={obj} />
          </MeshCollider>
        ))}
      </RigidBody>
    </group>
  )
}

// Preload the model to ensure smooth loading
useGLTF.preload('/apartment.glb')
