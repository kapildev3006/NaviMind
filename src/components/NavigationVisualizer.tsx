'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useSimulationStore } from '@/store/useSimulationStore'
import { ALL_WAYPOINTS, WAYPOINTS } from '@/config/waypoints'

/**
 * Renders topological navigation graph, waypoints, and active A* route
 * when debugMode is enabled in the simulation store.
 */
export const NavigationVisualizer = () => {
  const debugMode = useSimulationStore((s) => s.debugMode)
  const activeRoute = useSimulationStore((s) => s.activeRoute)
  const currentWaypointIndex = useSimulationStore((s) => s.currentWaypointIndex)

  // Memoize topological graph edges as line segments
  const graphEdges = useMemo(() => {
    const points: THREE.Vector3[] = []
    const seenEdges = new Set<string>()

    for (const wp of ALL_WAYPOINTS) {
      const from = new THREE.Vector3(...wp.position)
      for (const neighborId of wp.neighbors) {
        const key = [wp.id, neighborId].sort().join('--')
        if (!seenEdges.has(key)) {
          seenEdges.add(key)
          const neighbor = WAYPOINTS[neighborId]
          if (neighbor) {
            points.push(from)
            points.push(new THREE.Vector3(...neighbor.position))
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [])

  // Memoize active route path Three.js Line object
  const routeLine = useMemo(() => {
    if (!activeRoute || activeRoute.length < 2) return null
    const points = activeRoute.map((wp) => new THREE.Vector3(wp.position[0], wp.position[1] + 0.08, wp.position[2]))
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: 0x00ffcc, linewidth: 3 })
    return new THREE.Line(geometry, material)
  }, [activeRoute])

  if (!debugMode) return null

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Static Waypoint Nodes */}
      {ALL_WAYPOINTS.map((wp) => {
        const isDoorway = wp.type === 'DOORWAY'
        const isApproach = wp.type === 'TARGET_APPROACH'
        const color = isDoorway ? '#ffaa00' : isApproach ? '#00e5ff' : '#44bb44'
        const radius = isDoorway ? 0.12 : isApproach ? 0.10 : 0.08

        return (
          <mesh key={wp.id} position={[wp.position[0], wp.position[1] + 0.05, wp.position[2]]}>
            <sphereGeometry args={[radius, 12, 12]} />
            <meshBasicMaterial color={color} wireframe={false} opacity={0.75} transparent />
          </mesh>
        )
      })}

      {/* 2. Static Graph Connection Edges */}
      <lineSegments geometry={graphEdges}>
        <lineBasicMaterial color="#ffffff" opacity={0.25} transparent linewidth={1} />
      </lineSegments>

      {/* 3. Active A* Route */}
      {routeLine && <primitive object={routeLine} />}

      {/* 4. Active Target / Next Waypoint Indicator */}
      {activeRoute && activeRoute[currentWaypointIndex] && (
        <mesh
          position={[
            activeRoute[currentWaypointIndex].position[0],
            activeRoute[currentWaypointIndex].position[1] + 0.15,
            activeRoute[currentWaypointIndex].position[2]
          ]}
        >
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color="#ff0055" wireframe />
        </mesh>
      )}
    </group>
  )
}
