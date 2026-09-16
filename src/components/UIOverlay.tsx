'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { useSimulationStore } from '@/store/useSimulationStore'

const PRESET_TARGETS = [
  { label: '🧯 Fire Extinguisher', query: 'Fire Extinguisher' },
  { label: '📺 Smart TV', query: 'Smart TV' },
  { label: '🍳 Kitchen Induction', query: 'Kitchen Induction' },
  { label: '🚨 Smoke Detector', query: 'Smoke Detector' },
  { label: '⚡ Power Breaker', query: 'Power Breaker' },
  { label: '🛏️ Master Bed', query: 'Master Bed' },
]

export const UIOverlay = () => {
  const { progress } = useProgress()
  const { 
    debugMode, 
    toggleDebugMode, 
    time, 
    timeSpeed, 
    setTimeSpeed, 
    cameraMode, 
    setCameraMode, 
    introActive, 
    setIntroActive, 
    autoScan, 
    setAutoScan, 
    activeScanTarget, 
    scannedHistory, 
    targetLocked, 
    setTargetLocked, 
    isPickingUp, 
    setIsPickingUp,
    targetQuery,
    setTargetQuery,
    searchStatus,
    setSearchStatus,
    searchMode,
    setSearchMode
  } = useSimulationStore()

  const [displayTime, setDisplayTime] = useState(time)
  const [telemetry, setTelemetry] = useState({ altitude: 0, speed: 0, heading: 0 })
  const [commandInput, setCommandInput] = useState(targetQuery)

  useEffect(() => {
    const unsub = useSimulationStore.subscribe((state) => {
      setDisplayTime(state.time)
      setTelemetry(state.robotTelemetry || state.droneTelemetry)
    })
    return () => unsub()
  }, [])

  const hours = Math.floor(displayTime)
  const minutes = Math.floor((displayTime % 1) * 60)
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  const handleExecuteCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commandInput.trim()) return
    setTargetQuery(commandInput.trim())
    setSearchStatus('SEARCHING')
    setTargetLocked(false)
  }

  const handlePresetSelect = (query: string) => {
    setCommandInput(query)
    setTargetQuery(query)
    setSearchStatus('SEARCHING')
    setTargetLocked(false)
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Top Navigation Mode Banner */}
      {(introActive || autoScan) ? (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 20, 40, 0.88)',
            border: '1px solid rgba(0, 180, 255, 0.6)',
            color: '#00e5ff',
            padding: '8px 24px',
            borderRadius: '24px',
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 20px rgba(0, 180, 255, 0.3)',
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              backgroundColor: '#00e5ff',
              borderRadius: '50%',
              boxShadow: '0 0 10px #00e5ff'
            }} />
            BD-1 AUTONOMOUS SEEKING: &quot;{targetQuery}&quot;
          </div>
          <button
            onClick={() => {
              setIntroActive(false)
              setAutoScan(false)
              setSearchMode('MANUAL')
              setTargetLocked(false)
            }}
            style={{
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'all 0.2s'
            }}
          >
            [ TAKE MANUAL CONTROL ]
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: 'monospace' }}>
            Or press W / S / A / D, Q / E (Strafe), or Shift (Sprint) to take over
          </span>
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'auto',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: 'rgba(10, 30, 20, 0.88)',
            border: '1px solid #10b981',
            color: '#10b981',
            padding: '8px 24px',
            borderRadius: '24px',
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
            backdropFilter: 'blur(8px)'
          }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              boxShadow: '0 0 10px #10b981'
            }} />
            MANUAL ROBOT CONTROL — MOVE FREELY ON FLOOR
          </div>
          <button
            onClick={() => {
              setAutoScan(true)
              setSearchMode('AUTO')
              setTargetLocked(false)
            }}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'all 0.2s'
            }}
          >
            [ 🤖 START AUTO NAVIGATION TO TARGET ]
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontFamily: 'monospace' }}>
            Controls: W/S (Move), A/D (Turn), Q/E (Strafe), Shift (Sprint)
          </span>
        </div>
      )}

      {/* Top Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.75)',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            NaviMind 3D Apartment Simulator
          </div>

          {/* Telemetry Display */}
          {cameraMode === 'DRONE' && (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.75)',
              color: '#00ffcc',
              padding: '10px 15px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              whiteSpace: 'pre',
              border: '1px solid rgba(0,255,200,0.2)'
            }}>
              {`ALT: ${telemetry.altitude.toFixed(2)}m (Floor)\nSPD: ${telemetry.speed.toFixed(1)}m/s\nHDG: ${telemetry.heading.toFixed(0)}°`}
            </div>
          )}

          {/* Optical Scanner Status */}
          {cameraMode === 'DRONE' && (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid #00e5ff',
              padding: '10px 14px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              minWidth: '240px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '12px' }}>OPTICAL VISION SCANNER</span>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: activeScanTarget ? '#00ff66' : '#ffaa00',
                  boxShadow: activeScanTarget ? '0 0 6px #00ff66' : '0 0 6px #ffaa00'
                }} />
              </div>
              
              {activeScanTarget ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>
                    {activeScanTarget.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#aaa' }}>TYPE:</span>
                    <span>{activeScanTarget.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#aaa' }}>DIST:</span>
                    <span>{activeScanTarget.distance.toFixed(1)}m</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#aaa' }}>CONF:</span>
                    <span style={{ color: '#00ff66' }}>{activeScanTarget.confidence.toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#8899aa', fontSize: '12px', fontStyle: 'italic', padding: '6px 0' }}>
                  Scanning objects ahead in room...
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', pointerEvents: 'auto' }}>
          <button 
            onClick={() => {
              const nextScan = !autoScan
              setAutoScan(nextScan)
              setSearchMode(nextScan ? 'AUTO' : 'MANUAL')
              if (nextScan) setIntroActive(false)
            }}
            style={{
              backgroundColor: autoScan ? '#00e5ff' : '#333',
              color: autoScan ? '#000' : 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              boxShadow: autoScan ? '0 0 12px rgba(0, 229, 255, 0.5)' : 'none'
            }}
          >
            Auto-Scan: {autoScan ? 'ON' : 'OFF'}
          </button>
          <button 
            onClick={() => setCameraMode(cameraMode === 'FREE' ? 'DRONE' : 'FREE')}
            style={{
              backgroundColor: cameraMode === 'DRONE' ? '#0070f3' : '#333',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold'
            }}
          >
            Camera: {cameraMode === 'DRONE' ? 'ROBOT CHASE' : 'FREE ORBIT'}
          </button>
          <button 
            onClick={toggleDebugMode}
            style={{
              backgroundColor: debugMode ? '#ff4040' : 'rgba(0,0,0,0.7)',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            Debug: {debugMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Bottom Section - Dynamic Mission Target Search & Controls Console */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        alignSelf: 'center',
        pointerEvents: 'auto',
        width: '100%',
        maxWidth: '840px',
        zIndex: 50
      }}>
        {/* Dynamic Mission Search Bar */}
        <div style={{
          width: '100%',
          backgroundColor: 'rgba(10, 15, 25, 0.92)',
          border: '1px solid rgba(0, 229, 255, 0.4)',
          borderRadius: '16px',
          padding: '14px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>🎯</span>
              <span style={{ color: '#00e5ff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>
                MISSION TARGET DETECTOR:
              </span>
              <span style={{
                color: searchStatus === 'FOUND' ? '#00ff88' : '#38bdf8',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
                &quot;{targetQuery}&quot;
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: searchStatus === 'FOUND' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: searchStatus === 'FOUND' ? '#00ff88' : '#38bdf8',
                border: searchStatus === 'FOUND' ? '1px solid #00ff88' : '1px solid #38bdf8',
                fontWeight: 'bold'
              }}>
                {searchStatus === 'FOUND' ? '✓ TARGET IN SIGHT' : 'SEARCHING APARTMENT...'}
              </span>

            </div>
          </div>

          {/* Form: Text Command Input */}
          <form onSubmit={handleExecuteCommand} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter target command (e.g. 'Find fire extinguisher', 'Find Smart TV', 'Find smoke detector')..."
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.07)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              style={{
                backgroundColor: '#0070f3',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0, 112, 243, 0.4)'
              }}
            >
              🔍 SEARCH
            </button>
          </form>

          {/* Preset Targets Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#8899aa', fontSize: '11px', fontFamily: 'monospace' }}>Quick Select:</span>
            {PRESET_TARGETS.map((p) => (
              <button
                key={p.query}
                type="button"
                onClick={() => handlePresetSelect(p.query)}
                style={{
                  backgroundColor: targetQuery.toLowerCase().includes(p.query.toLowerCase()) ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255,255,255,0.06)',
                  border: targetQuery.toLowerCase().includes(p.query.toLowerCase()) ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                  color: targetQuery.toLowerCase().includes(p.query.toLowerCase()) ? '#00e5ff' : '#cbd5e1',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '11px'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Dashboard & Speed */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'rgba(0,0,0,0.75)',
          padding: '8px 20px',
          borderRadius: '20px',
          fontFamily: 'monospace'
        }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
            TIME: {formattedTime}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 5, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setTimeSpeed(speed)}
                style={{
                  backgroundColor: timeSpeed === speed ? '#0070f3' : '#222',
                  color: 'white',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - AI Object Detection System */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '320px',
        backgroundColor: activeScanTarget?.isEmergency 
          ? 'rgba(5, 30, 20, 0.92)' 
          : 'rgba(5, 15, 25, 0.88)',
        border: activeScanTarget?.isEmergency 
          ? '2px solid #00ff88' 
          : '1px solid rgba(0, 229, 255, 0.5)',
        borderRadius: '12px',
        padding: '16px',
        fontFamily: 'monospace',
        color: '#fff',
        pointerEvents: 'auto',
        boxShadow: activeScanTarget?.isEmergency 
          ? '0 0 25px rgba(0, 255, 136, 0.35)' 
          : '0 0 20px rgba(0, 229, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 50
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: activeScanTarget?.isEmergency ? '1px solid #00ff88' : '1px solid rgba(0, 229, 255, 0.3)',
          paddingBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: activeScanTarget?.isEmergency ? '#00ff88' : '#00e5ff',
              boxShadow: activeScanTarget?.isEmergency ? '0 0 10px #00ff88' : '0 0 10px #00e5ff'
            }} />
            <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>
              AI OBJECT DETECTOR
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            color: activeScanTarget?.isEmergency ? '#00ff88' : '#00ffcc',
            backgroundColor: activeScanTarget?.isEmergency ? 'rgba(0,255,136,0.15)' : 'rgba(0,255,200,0.1)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            VLM + SENSOR
          </span>
        </div>

        {/* Status / Target Locked Alert */}
        {targetLocked && activeScanTarget?.isEmergency ? (
          <div style={{
            backgroundColor: 'rgba(0, 255, 136, 0.2)',
            border: '1px solid #00ff88',
            padding: '10px',
            borderRadius: '6px',
            color: '#00ff88',
            fontSize: '12px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            🎯 MISSION TARGET LOCATED!<br />
            [ BD-1 IN POSITION — MATCH: {activeScanTarget.confidence.toFixed(1)}% ]
          </div>
        ) : (
          <div style={{
            fontSize: '11px',
            color: activeScanTarget ? '#00ffcc' : '#8899aa',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>MODE: {targetLocked ? 'LOCK HOVER' : 'ACTIVE SCAN'}</span>
            <span>{activeScanTarget ? 'OBJECT IN SIGHT' : 'SCANNING ROOM'}</span>
          </div>
        )}

        {/* Active Scan Target Details */}
        {activeScanTarget ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.4)',
              padding: '10px',
              borderRadius: '6px',
              borderLeft: activeScanTarget.isEmergency ? '3px solid #00ff88' : '3px solid #00e5ff'
            }}>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
                {activeScanTarget.isEmergency ? '🎯 MATCHED TARGET:' : 'DETECTED OBJECT:'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                {activeScanTarget.name}
              </div>
              <div style={{ fontSize: '12px', color: activeScanTarget.isEmergency ? '#00ff88' : '#00e5ff', marginTop: '2px' }}>
                {activeScanTarget.category}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#88a' }}>CONFIDENCE</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ff66' }}>
                  {activeScanTarget.confidence.toFixed(1)}%
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#88a' }}>DISTANCE</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                  {activeScanTarget.distance.toFixed(1)}m
                </div>
              </div>
            </div>

            {activeScanTarget.coords && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#88a' }}>3D ROOM COORDS</div>
                <div style={{ fontSize: '12px', color: '#ccc', fontFamily: 'monospace' }}>
                  {`X: ${activeScanTarget.coords[0].toFixed(1)} | Y: ${activeScanTarget.coords[1].toFixed(1)} | Z: ${activeScanTarget.coords[2].toFixed(1)}`}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.2)',
            border: '1px dashed rgba(255,255,255,0.15)',
            padding: '20px',
            borderRadius: '6px',
            textAlign: 'center',
            color: '#8899aa',
            fontSize: '12px'
          }}>
            Point BD-1 towards objects in the apartment to detect them.
          </div>
        )}

        {/* Scanned History */}
        {scannedHistory.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', color: '#88a', marginBottom: '6px' }}>
              SCANNED APARTMENT OBJECTS:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
              {scannedHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    padding: '4px 6px',
                    backgroundColor: item.isEmergency ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '4px',
                    color: item.isEmergency ? '#00ff88' : '#cbd5e1'
                  }}
                >
                  <span>✓ {item.name}</span>
                  <span>{item.confidence.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
