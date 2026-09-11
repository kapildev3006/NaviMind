'use client'

import React from 'react'
import { EffectComposer, Bloom, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export const Effects = () => {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={1.5} luminanceSmoothing={0.9} height={300} intensity={1.2} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
      <ToneMapping />
    </EffectComposer>
  )
}
