'use client'

import React from 'react'
import { Building } from './city/Building'
import { Road } from './city/Road'
import { Park } from './city/Park'
import { StreetLight } from './city/StreetLight'

// Map Legend:
// 'B' = Building
// 'R' = Road
// 'I' = Intersection
// 'P' = Park

const CITY_LAYOUT = [
  ['B', 'B', 'R', 'P', 'B'],
  ['B', 'B', 'R', 'B', 'B'],
  ['R', 'R', 'I', 'R', 'R'],
  ['P', 'B', 'R', 'P', 'B'],
  ['B', 'B', 'R', 'B', 'B'],
]

const TILE_SIZE = 10

export const CityMap = () => {
  const rows = CITY_LAYOUT.length
  const cols = CITY_LAYOUT[0].length

  // Center the city around 0,0
  const offsetX = (cols * TILE_SIZE) / 2 - (TILE_SIZE / 2)
  const offsetZ = (rows * TILE_SIZE) / 2 - (TILE_SIZE / 2)

  return (
    <group>
      {CITY_LAYOUT.map((row, rowIndex) => (
        row.map((cell, colIndex) => {
          const x = colIndex * TILE_SIZE - offsetX
          const z = rowIndex * TILE_SIZE - offsetZ
          const position: [number, number, number] = [x, 0, z]

          switch (cell) {
            case 'B':
              // Randomize building heights slightly
              const height = 5 + Math.random() * 15
              const colors = ['#888888', '#997777', '#779977', '#777799', '#333333']
              const color = colors[Math.floor(Math.random() * colors.length)]
              return <Building key={`${rowIndex}-${colIndex}`} position={position} width={8} depth={8} height={height} color={color} />
            case 'R':
              // Determine if it's horizontal or vertical road based on adjacent tiles
              // For simplicity, let's just make it a straight road for now
              return (
                <group key={`${rowIndex}-${colIndex}`}>
                  <Road position={position} width={TILE_SIZE} depth={TILE_SIZE} type="straight" />
                  {/* Add a streetlight occasionally on straight roads */}
                  {Math.random() > 0.5 && (
                    <StreetLight position={[x + 4, 0, z]} />
                  )}
                </group>
              )
            case 'I':
              return <Road key={`${rowIndex}-${colIndex}`} position={position} width={TILE_SIZE} depth={TILE_SIZE} type="intersection" />
            case 'P':
              return <Park key={`${rowIndex}-${colIndex}`} position={position} width={TILE_SIZE} depth={TILE_SIZE} />
            default:
              return null
          }
        })
      ))}
    </group>
  )
}
