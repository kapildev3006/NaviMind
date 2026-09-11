'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulationStore } from '@/store/useSimulationStore'
import * as THREE from 'three'

interface FireExtinguisherProps {
  position?: [number, number, number]
}

export const FireExtinguisher: React.FC<FireExtinguisherProps> = ({ position = [0, 1.8, -6] }) => {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const beaconRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.z = time * 2
      const scale = 1 + Math.sin(time * 6) * 0.15
      ringRef.current.scale.set(scale, scale, scale)
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = 1.9 + Math.sin(time * 4) * 0.1
    }

    if (groupRef.current) {
      const { isPickingUp, droneWorldPos } = useSimulationStore.getState()
      if (isPickingUp) {
        // Lift the Fire Extinguisher to hover 0.4m below the drone
        const airliftTarget = new THREE.Vector3(droneWorldPos[0], droneWorldPos[1] - 0.4, droneWorldPos[2])
        groupRef.current.position.lerp(airliftTarget, delta * 6)
      } else {
        // Rest on original ground coordinates
        const defaultPos = new THREE.Vector3(position[0], position[1], position[2])
        groupRef.current.position.lerp(defaultPos, delta * 4)
      }
    }
  })

  const { isPickingUp } = useSimulationStore()

  return (
    <group ref={groupRef} position={position} scale={0.45}>
      {/* Magnetic Airlift Tractor Beam (only visible when airlift is active) */}
      {isPickingUp && (
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.08, 0.4, 1.5, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.65} />
        </mesh>
      )}

      {/* Ground safety beacon ring */}
      <mesh ref={ringRef} position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Main Red Cylinder Tank */}
      <mesh position={[0, -0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 1.2, 32]} />
        <meshStandardMaterial
          color="#ff1a1a"
          metalness={0.4}
          roughness={0.2}
          emissive="#550000"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Tank Top Dome */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ff1a1a" metalness={0.4} roughness={0.2} />
      </mesh>

      {/* Silver Neck / Valve Assembly */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Handle and Trigger Nozzle */}
      <mesh position={[0.15, 0.32, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.25, 0.05, 0.08]} />
        <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Black Discharge Hose */}
      <mesh position={[-0.18, -0.1, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>

      {/* Yellow Pressure Gauge */}
      <mesh position={[0, 0.22, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.5} />
      </mesh>

      {/* Floating 3D Holographic Indicator / Safety Beacon above object */}
      <group ref={beaconRef} position={[0, 1.9, 0]}>
        <mesh>
          <octahedronGeometry args={[0.25, 0]} />
          <meshBasicMaterial color="#ff3300" wireframe />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#ffff00" />
        </mesh>
      </group>
    </group>
  )
}
