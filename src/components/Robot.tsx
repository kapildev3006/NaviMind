'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, RapierRigidBody, CapsuleCollider, RapierCollider, useRapier } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRobotControls } from '@/hooks/useRobotControls'
import { useSimulationStore, ScannedObjectInfo } from '@/store/useSimulationStore'

// Detectable objects physically present in the apartment
export const SCENE_OBJECTS = [
  { id: 'fire_extinguisher_01', name: 'Emergency Fire Extinguisher', category: 'SAFETY SYSTEM', pos: new THREE.Vector3(-2.2, 0.55, 1.8), isEmergency: true, keywords: ['fire', 'extinguisher', 'safety', 'red', 'cylinder'] },
  { id: 'smart_tv_console', name: 'Living Room Smart TV (4K OLED)', category: 'APPLIANCE', pos: new THREE.Vector3(2.4, 1.2, 3.8), keywords: ['tv', 'television', 'display', 'screen', 'oled', 'smart tv'] },
  { id: 'kitchen_induction', name: 'Kitchen Induction Cooktop', category: 'APPLIANCE', pos: new THREE.Vector3(-2.4, 0.88, 3.2), keywords: ['kitchen', 'induction', 'stove', 'cooktop', 'cooking', 'range'] },
  { id: 'smoke_detector_alpha', name: 'Smart Smoke & Gas Detector', category: 'FIRE SAFETY', pos: new THREE.Vector3(0, 2.44, 2.8), keywords: ['smoke', 'detector', 'alarm', 'sensor', 'gas'] },
  { id: 'power_distribution', name: 'Main Power Breaker Panel', category: 'ELECTRICAL', pos: new THREE.Vector3(-3.15, 1.4, -0.5), keywords: ['power', 'breaker', 'panel', 'electric', 'fuse', 'distribution'] },
  { id: 'master_bedroom_bed', name: 'Master Bedroom Bed Suite', category: 'FURNITURE', pos: new THREE.Vector3(1.5, 0.7, -2.5), keywords: ['bed', 'bedroom', 'mattress', 'furniture', 'pillow'] },
  { id: 'balcony_glazing', name: 'Living Room Balcony Window', category: 'STRUCTURAL', pos: new THREE.Vector3(0, 1.4, 5.2), keywords: ['balcony', 'window', 'glass', 'glazing', 'terrace'] },
  { id: 'hallway_access', name: 'Main Apartment Access Door', category: 'SECURITY', pos: new THREE.Vector3(-1.8, 1.2, -3.2), keywords: ['door', 'doorway', 'entrance', 'entry', 'exit', 'hallway'] }
]

// Open floor-space waypoints for patrol around furniture
const APARTMENT_PATROL_WAYPOINTS = [
  new THREE.Vector3(0, 0.24, 2.2),      // Living room open floor
  new THREE.Vector3(-1.4, 0.24, 2.2),   // Kitchen entryway corridor
  new THREE.Vector3(-2.0, 0.24, 1.6),   // Kitchen station
  new THREE.Vector3(-1.5, 0.24, -0.2),  // Central hallway
  new THREE.Vector3(-1.4, 0.24, -2.0),  // Bedroom approach
  new THREE.Vector3(1.0, 0.24, -2.2),   // Master bedroom suite
  new THREE.Vector3(1.0, 0.24, 0.2),    // Living room corridor
  new THREE.Vector3(0.6, 0.24, 2.6),    // Lounge open floor
]

// Movement & physical configuration constants
const WALK_SPEED = 2.4       // m/s (natural explorer pace)
const SPRINT_SPEED = 4.2     // m/s (clean sprint boost)
const TURN_SPEED = 2.6       // rad/s (smooth yaw steering)

// Collider dimensions: calibrated so BD-1 easily clears dining and coffee table aprons (~0.68m)
const COLLIDER_RADIUS = 0.11        // 0.22m diameter (BD-1 width ~0.17m)
const COLLIDER_HALF_HEIGHT = 0.13   // 0.48m total capsule height
const COLLIDER_CENTER_Y = 0.24      // Half of total collider height above floor
const MODEL_SCALE = 0.006           // ~51cm height (canon Star Wars BD-1 scale)

// Character controller physics parameters
const GRAVITY_PROBE = -2.5          // Gentle downward gravity probe for stable floor contact
const SNAP_TO_GROUND = 0.08         // 8cm snap-to-ground threshold
const AUTOSTEP_MAX_HEIGHT = 0.05    // 5cm max step for floor/carpet transitions (avoids climbing furniture)
const AUTOSTEP_MIN_WIDTH = 0.05

// Outer boundaries of the apartment model (fallback safety envelope only)
const APARTMENT_BOUNDS = {
  minX: -3.35,
  maxX: 3.35,
  minZ: -4.85,
  maxZ: 5.45
}

// Helper function to test if an object matches the user's search query
export const matchesTarget = (obj: typeof SCENE_OBJECTS[0], query: string): boolean => {
  if (!query || !query.trim()) return false
  const q = query.toLowerCase().trim()
  if (obj.name.toLowerCase().includes(q)) return true
  if (obj.category.toLowerCase().includes(q)) return true
  return obj.keywords.some(k => q.includes(k) || k.includes(q))
}

// BD-1 Robot Visual Model with procedural walking gait animation
const BD1Model = ({ isMoving }: { isMoving: boolean }) => {
  const { scene } = useGLTF('/bd1.glb')
  const modelGroupRef = useRef<THREE.Group>(null)

  useMemo(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.roughness = Math.max(0.25, child.material.roughness ?? 0.5)
          child.material.metalness = Math.min(0.85, child.material.metalness ?? 0.3)
        }
      }
    })
  }, [scene])

  useFrame((state) => {
    if (!modelGroupRef.current) return
    const time = state.clock.elapsedTime

    if (isMoving) {
      const walkBob = Math.abs(Math.sin(time * 12)) * 0.010
      const walkRoll = Math.sin(time * 6) * 0.02
      const walkPitch = -0.04 // Forward walking lean

      modelGroupRef.current.position.y = -COLLIDER_CENTER_Y + walkBob
      modelGroupRef.current.rotation.z = walkRoll
      modelGroupRef.current.rotation.x = walkPitch
    } else {
      const idleBob = Math.sin(time * 2) * 0.002
      modelGroupRef.current.position.y = -COLLIDER_CENTER_Y + idleBob
      modelGroupRef.current.rotation.z = 0
      modelGroupRef.current.rotation.x = 0
    }
  })

  // Visual model origin offset: positioned at [0, -COLLIDER_CENTER_Y, 0] so feet rest flush on the floor
  return (
    <group ref={modelGroupRef} position={[0, -COLLIDER_CENTER_Y, 0]} rotation={[0, 0, 0]} scale={MODEL_SCALE}>
      <primitive object={scene} />
    </group>
  )
}

export const Robot = () => {
  const robotRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const keysRef = useRobotControls()
  const { world } = useRapier()

  // Rapier Kinematic Character Controller instance
  const characterControllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null)

  useEffect(() => {
    // Primary configuration via creation offset (0.01m)
    const controller = world.createCharacterController(0.01)
    controller.setSlideEnabled(true)
    controller.setUp({ x: 0, y: 1, z: 0 })
    controller.enableSnapToGround(SNAP_TO_GROUND)
    controller.enableAutostep(AUTOSTEP_MAX_HEIGHT, AUTOSTEP_MIN_WIDTH, false)
    characterControllerRef.current = controller

    return () => {
      world.removeCharacterController(controller)
      characterControllerRef.current = null
    }
  }, [world])
  
  const robotDirection = useRef(new THREE.Vector3(0, 0, -1))
  const rightDirection = useRef(new THREE.Vector3(1, 0, 0))
  
  // Explicit Yaw angle tracking (0 = facing forward towards -Z)
  const currentYaw = useRef(0)
  
  // Camera smoothing targets: positioned behind BD-1 looking forward
  const currentCameraPosition = useRef(new THREE.Vector3(0, 0.85, 4.6))
  const currentCameraLookAt = useRef(new THREE.Vector3(0, 0.45, 1.0))

  const waypointIdx = useRef(0)
  const isMovingRef = useRef(false)

  useFrame((state, delta) => {
    if (!robotRef.current) return

    const { forward, backward, left, right, strafeLeft, strafeRight, sprint } = keysRef.current
    const { 
      cameraMode, 
      introActive, 
      setIntroActive, 
      autoScan, 
      setAutoScan, 
      targetLocked, 
      setTargetLocked, 
      isPickingUp, 
      setRobotWorldPos,
      setRobotTelemetry,
      targetQuery,
      searchStatus,
      setSearchStatus,
      searchMode,
      setSearchMode
    } = useSimulationStore.getState()

    // Seamless Manual Takeover: pressing ANY movement key immediately cancels auto mode & target lock
    const anyManualKey = forward || backward || left || right || strafeLeft || strafeRight || sprint
    if (anyManualKey) {
      if (introActive) setIntroActive(false)
      if (autoScan) setAutoScan(false)
      if (targetLocked) setTargetLocked(false)
      if (searchMode !== 'MANUAL') setSearchMode('MANUAL')
    }

    const pos = robotRef.current.translation()

    // Compute forward & right vectors based on current yaw angle
    robotDirection.current.set(-Math.sin(currentYaw.current), 0, -Math.cos(currentYaw.current)).normalize()
    rightDirection.current.set(Math.cos(currentYaw.current), 0, -Math.sin(currentYaw.current)).normalize()

    let targetVelocity = new THREE.Vector3(0, 0, 0)
    let targetYawDelta = 0
    
    const isAutoActive = !anyManualKey && (introActive || autoScan)

    // Identify matching target from user's active search query
    const targetObj = SCENE_OBJECTS.find(obj => matchesTarget(obj, targetQuery))

    if (isAutoActive) {
      if (isPickingUp) {
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0.4
      } else if (targetLocked) {
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0
      } else {
        // In AUTO mode: navigate towards requested object or apartment patrol waypoints
        let destination = APARTMENT_PATROL_WAYPOINTS[waypointIdx.current]

        if (targetObj) {
          destination = new THREE.Vector3(targetObj.pos.x, targetObj.pos.y, targetObj.pos.z)
        }

        const toTarget = new THREE.Vector3(destination.x - pos.x, 0, destination.z - pos.z)
        const distToTarget = toTarget.length()

        if (distToTarget < 1.4 && targetObj) {
          setTargetLocked(true)
          setSearchStatus('FOUND')
          targetVelocity.set(0, 0, 0)
        } else if (distToTarget < 0.5 && !targetObj) {
          waypointIdx.current = (waypointIdx.current + 1) % APARTMENT_PATROL_WAYPOINTS.length
        } else {
          const moveDir = toTarget.clone().normalize()
          targetVelocity.copy(moveDir.multiplyScalar(WALK_SPEED))

          // Steer smoothly towards destination
          const targetHeading = Math.atan2(-moveDir.x, -moveDir.z)
          let angleDiff = targetHeading - currentYaw.current
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
          targetYawDelta = THREE.MathUtils.clamp(angleDiff * 3.0, -TURN_SPEED, TURN_SPEED)
        }
      }
    } else {
      // Manual Floor Movement:
      // Normalized movement vector along facing direction and strafe direction
      const moveIntent = new THREE.Vector3(0, 0, 0)
      if (forward) moveIntent.add(robotDirection.current)
      if (backward) moveIntent.sub(robotDirection.current)
      if (strafeLeft) moveIntent.sub(rightDirection.current)
      if (strafeRight) moveIntent.add(rightDirection.current)

      if (moveIntent.lengthSq() > 0.001) {
        moveIntent.normalize()
        const speed = sprint ? SPRINT_SPEED : WALK_SPEED
        targetVelocity.copy(moveIntent.multiplyScalar(speed))
      }

      // Smooth turning with A / D
      if (left) targetYawDelta += TURN_SPEED
      if (right) targetYawDelta -= TURN_SPEED
    }

    // 1. Update yaw angle smoothly via delta time
    currentYaw.current += targetYawDelta * delta

    // 2. Compute collider movement using Kinematic Character Controller
    const collider = colliderRef.current || robotRef.current.collider(0)
    let nextX = pos.x
    let nextY = pos.y
    let nextZ = pos.z

    if (collider && characterControllerRef.current) {
      const desiredDelta = {
        x: targetVelocity.x * delta,
        y: GRAVITY_PROBE * delta, // gentle downward probe for floor contact
        z: targetVelocity.z * delta
      }

      characterControllerRef.current.computeColliderMovement(collider, desiredDelta)
      const computed = characterControllerRef.current.computedMovement()

      nextX = pos.x + computed.x
      nextY = pos.y + computed.y
      nextZ = pos.z + computed.z

      // Floor contact safety clamp: BD-1 floor level is Y=0, collider center Y is 0.24m.
      // Under no circumstance can the robot fall below the floor slab.
      nextY = Math.max(COLLIDER_CENTER_Y, nextY)

      // Outer safety boundary fallback
      nextX = THREE.MathUtils.clamp(nextX, APARTMENT_BOUNDS.minX, APARTMENT_BOUNDS.maxX)
      nextZ = THREE.MathUtils.clamp(nextZ, APARTMENT_BOUNDS.minZ, APARTMENT_BOUNDS.maxZ)

      robotRef.current.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ })
    }

    if (typeof window !== 'undefined') {
      (window as any).__robotDebug = {
        keys: { ...keysRef.current },
        hasCollider: !!collider,
        hasController: !!characterControllerRef.current,
        targetVelocity: { x: targetVelocity.x, y: targetVelocity.y, z: targetVelocity.z },
        computed: characterControllerRef.current ? characterControllerRef.current.computedMovement() : null,
        pos: { x: pos.x, y: pos.y, z: pos.z }
      }
    }

    // 3. Set kinematic upright rotation
    const nextQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentYaw.current)
    robotRef.current.setNextKinematicRotation(nextQuat)

    const movingSpeed = targetVelocity.length()
    isMovingRef.current = movingSpeed > 0.15

    // Update telemetry & position in Zustand store
    setRobotTelemetry({
      altitude: Math.max(0, nextY - COLLIDER_CENTER_Y),
      speed: movingSpeed,
      heading: (THREE.MathUtils.radToDeg(currentYaw.current) % 360 + 360) % 360
    })
    setRobotWorldPos([nextX, nextY, nextZ])

    // Optical Object Detection (Sensors analyze field of view ahead)
    let bestTarget = null
    let minAngle = 0.55
    const robotEyePos = new THREE.Vector3(nextX, nextY + 0.18, nextZ)

    for (const obj of SCENE_OBJECTS) {
      const dist = robotEyePos.distanceTo(obj.pos)
      if (dist < 8) {
        const dir = new THREE.Vector3().subVectors(obj.pos, robotEyePos).normalize()
        const dot = dir.dot(robotDirection.current)
        if (dot > minAngle) {
          minAngle = dot
          const isTargetMatch = matchesTarget(obj, targetQuery)
          bestTarget = {
            id: obj.id,
            name: obj.name,
            category: obj.category,
            distance: dist,
            confidence: Math.min(99.4, 88.0 + (dot - 0.55) * 25 + (8 - dist) * 1.2),
            coords: [obj.pos.x, obj.pos.y, obj.pos.z] as [number, number, number],
            isEmergency: isTargetMatch
          }
        }
      }
    }

    const { setActiveScanTarget, addScannedObject } = useSimulationStore.getState()
    setActiveScanTarget(bestTarget)
    if (bestTarget) {
      addScannedObject(bestTarget)
      const isMatch = targetObj && bestTarget.id === targetObj.id
      if (isMatch && bestTarget.distance < 1.8) {
        if (searchStatus !== 'FOUND') {
          setSearchStatus('FOUND')
        }
        if (isAutoActive && !targetLocked) {
          setTargetLocked(true)
        }
      }
    }

    // Third-person chase camera following behind BD-1
    if (cameraMode === 'DRONE') {
      const camDist = 1.45
      const camHeight = 0.55
      const idealPosition = new THREE.Vector3(
        nextX + Math.sin(currentYaw.current) * camDist,
        nextY + camHeight,
        nextZ + Math.cos(currentYaw.current) * camDist
      )
      const idealLookAt = new THREE.Vector3(
        nextX - Math.sin(currentYaw.current) * 2.5,
        nextY + 0.25,
        nextZ - Math.cos(currentYaw.current) * 2.5
      )
      
      currentCameraPosition.current.lerp(idealPosition, delta * 6)
      currentCameraLookAt.current.lerp(idealLookAt, delta * 7)
      
      state.camera.position.copy(currentCameraPosition.current)
      state.camera.lookAt(currentCameraLookAt.current)
    }
  })

  return (
    <RigidBody 
      ref={robotRef} 
      position={[0.6, COLLIDER_CENTER_Y, 2.6]} 
      colliders={false}
      type="kinematicPosition"
    >
      {/* Physical capsule collider: calibrated to enclose BD-1 and pass under standard tables without catching */}
      <CapsuleCollider 
        ref={colliderRef}
        args={[COLLIDER_HALF_HEIGHT, COLLIDER_RADIUS]} 
        position={[0, 0, 0]} 
        friction={0.0} 
        restitution={0.0} 
      />
      <BD1Model isMoving={isMovingRef.current} />
    </RigidBody>
  )
}

useGLTF.preload('/bd1.glb')

export const Drone = Robot
