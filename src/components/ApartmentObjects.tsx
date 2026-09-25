'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FireExtinguisher } from './FireExtinguisher'

export const ApartmentObjects = () => {
  const smokeLedRef = useRef<THREE.PointLight>(null)
  const tvGlowRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    // Blinking green LED on smoke detector
    if (smokeLedRef.current) {
      smokeLedRef.current.intensity = Math.sin(time * 3) > 0.8 ? 1.2 : 0.05
    }
    // Subtle screen luminescence on Smart TV
    if (tvGlowRef.current) {
      tvGlowRef.current.opacity = 0.85 + Math.sin(time * 1.5) * 0.08
    }
  })

  return (
    <group>
      {/* 1. Emergency Fire Extinguisher */}
      <FireExtinguisher position={[-5.00, 0.55, 3.50]} />

      {/* 2. Ceiling Smart Smoke & Gas Detector */}
      <group position={[-0.50, 2.44, 2.70]}>
        {/* Base plate */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.18, 0.05, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Center sensor chamber */}
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
        </mesh>
        {/* Flashing green health LED */}
        <pointLight ref={smokeLedRef} color="#22c55e" distance={1.5} intensity={0.5} position={[0.08, -0.04, 0]} />
        <mesh position={[0.08, -0.035, 0]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
      </group>

      {/* 3. Living Room Smart TV / Media Console */}
      <group position={[-0.08, 1.20, 2.80]} rotation={[0, -Math.PI / 2, 0]}>
        {/* TV Frame */}
        <mesh castShadow>
          <boxGeometry args={[1.6, 0.95, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* 4K Glowing OLED Screen */}
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[1.54, 0.89]} />
          <meshBasicMaterial
            ref={tvGlowRef}
            color="#38bdf8"
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Wall Mount Bracket */}
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[0.4, 0.3, 0.04]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* 4. Kitchen Induction Cooking Station */}
      <group position={[-5.00, 0.88, 2.80]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Ceramic Glass Cooktop */}
        <mesh receiveShadow>
          <planeGeometry args={[0.8, 0.52]} />
          <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Induction Burner Rings */}
        <mesh position={[-0.2, 0.05, 0.002]}>
          <ringGeometry args={[0.08, 0.14, 24]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.2, -0.05, 0.002]}>
          <ringGeometry args={[0.06, 0.11, 24]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* 5. Main Power Distribution Panel */}
      <group position={[-1.50, 1.40, 0.80]} rotation={[0, Math.PI / 2, 0]}>
        {/* Metal Enclosure */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.65, 0.08]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Warning Indicator */}
        <mesh position={[0, 0.22, 0.042]}>
          <planeGeometry args={[0.12, 0.05]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      </group>

      {/* 6. Smart TV Remote Control (Living Room Coffee Table Prop) */}
      <group position={[-0.95, 0.465, 3.10]} rotation={[0, 0.25, 0]}>
        {/* Remote Chassis */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.065, 0.012, 0.16]} />
          <meshStandardMaterial color="#18181b" roughness={0.25} metalness={0.7} />
        </mesh>
        {/* Button Panel Inset */}
        <mesh position={[0, 0.007, -0.01]}>
          <boxGeometry args={[0.052, 0.003, 0.12]} />
          <meshStandardMaterial color="#09090b" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Power Button (Red Dot) */}
        <mesh position={[-0.016, 0.009, -0.055]}>
          <cylinderGeometry args={[0.004, 0.004, 0.002, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {/* Nav Directional Pad */}
        <mesh position={[0, 0.009, -0.025]}>
          <cylinderGeometry args={[0.012, 0.012, 0.002, 16]} />
          <meshStandardMaterial color="#27272a" roughness={0.3} />
        </mesh>
        {/* IR Blaster Diode */}
        <mesh position={[0, 0.002, -0.08]}>
          <sphereGeometry args={[0.004, 8, 8]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      </group>
    </group>
  )
}
