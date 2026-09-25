'use client'

import React, { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { CameraMode, ChaseDistancePreset, useSimulationStore } from '@/store/useSimulationStore'
import { MissionController } from '@/missions/MissionController'

const PRESET_COMMANDS = [
  { label: '🧯 Find Extinguisher', command: 'Find the fire extinguisher' },
  { label: '📺 Go to TV', command: 'Go to the TV' },
  { label: '🚨 Inspect Detector', command: 'Inspect smoke detector' },
  { label: '⚡ Check Breaker', command: 'Check breaker panel' },
  { label: '📱 Bring Remote', command: 'Bring me the remote' },
  { label: '🛏️ Go to Bed', command: 'Go to bedroom bed' },
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
    chasePreset,
    setChasePreset,
    autoScan,
    setAutoScan,
    activeScanTarget,
    scannedHistory,
    targetLocked,
    searchMode,
    setSearchMode,
    navigationStatus,
    currentRoom,
    activeMission,
    missionHistory,
    missionLog
  } = useSimulationStore()

  const [displayTime, setDisplayTime] = useState(time)
  const [telemetry, setTelemetry] = useState({ altitude: 0, speed: 0, heading: 0 })
  const [commandInput, setCommandInput] = useState('Find the fire extinguisher')
  
  // Phase 3.5 Usability Toggles
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false)
  const [showQuickMissions, setShowQuickMissions] = useState(false)
  const [showMissionLog, setShowMissionLog] = useState(false)
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  useEffect(() => {
    const unsub = useSimulationStore.subscribe((state) => {
      setDisplayTime(state.time)
      setTelemetry(state.robotTelemetry || state.droneTelemetry)
    })
    return () => unsub()
  }, [])

  // Auto-expand AI detector if an emergency target match is locked
  useEffect(() => {
    if (targetLocked && activeScanTarget?.isEmergency) {
      setIsAiScannerOpen(true)
    }
  }, [targetLocked, activeScanTarget])

  const hours = Math.floor(displayTime)
  const minutes = Math.floor((displayTime % 1) * 60)
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  const handleExecuteCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commandInput.trim()) return
    MissionController.getInstance().submitCommand(commandInput.trim())
  }

  const handlePresetSelect = (command: string) => {
    setCommandInput(command)
    MissionController.getInstance().submitCommand(command)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* ========================================================================= */}
      {/* TOP HEADER REGION                                                        */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        
        {/* TOP-LEFT: Brand & Telemetry Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' }}>
          <div
            style={{
              backgroundColor: 'rgba(10, 15, 25, 0.88)',
              border: '1px solid rgba(0, 229, 255, 0.25)',
              borderRadius: '10px',
              padding: '8px 14px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px' }}>
              NAVIMIND <span style={{ color: '#00e5ff', fontWeight: 400 }}>3D</span>
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
              {currentRoom ? currentRoom.replace('_', ' ').toUpperCase() : 'APARTMENT'}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
            <span style={{ color: '#38bdf8', fontSize: '11px', fontFamily: 'monospace' }}>
              {formattedTime}
            </span>
          </div>

          {/* Compact Telemetry Chip */}
          <div
            style={{
              backgroundColor: 'rgba(5, 12, 20, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '5px 12px',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '11px',
              display: 'flex',
              gap: '12px'
            }}
          >
            <span>ALT: {telemetry.altitude.toFixed(2)}m</span>
            <span>SPD: {telemetry.speed.toFixed(1)}m/s</span>
            <span>HDG: {telemetry.heading.toFixed(0)}°</span>
          </div>
        </div>

        {/* TOP-CENTER: Unified Control Bar */}
        <div
          style={{
            backgroundColor: 'rgba(10, 15, 25, 0.92)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            borderRadius: '24px',
            padding: '4px 10px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
            zIndex: 40
          }}
        >
          {/* Locomotion Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '2px' }}>
            <button
              id="mode-manual-btn"
              onClick={() => {
                setSearchMode('MANUAL')
                setAutoScan(false)
              }}
              style={{
                backgroundColor: searchMode === 'MANUAL' ? '#3b82f6' : 'transparent',
                color: searchMode === 'MANUAL' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              MANUAL
            </button>
            <button
              id="mode-auto-btn"
              onClick={() => {
                setSearchMode('AUTO')
                setAutoScan(true)
              }}
              style={{
                backgroundColor: searchMode === 'AUTO' ? '#10b981' : 'transparent',
                color: searchMode === 'AUTO' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '14px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              AUTO
            </button>
          </div>

          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>

          {/* Camera Mode Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', marginRight: '2px' }}>CAM:</span>
            {(['CHASE', 'FPV', 'ORBIT'] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                id={`cam-${mode.toLowerCase()}-btn`}
                onClick={() => setCameraMode(mode)}
                style={{
                  backgroundColor: cameraMode === mode ? '#0070f3' : 'rgba(255, 255, 255, 0.05)',
                  color: cameraMode === mode ? '#fff' : '#cbd5e1',
                  border: cameraMode === mode ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Chase Distance Presets (Only visible in CHASE mode) */}
          {cameraMode === 'CHASE' && (
            <>
              <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace', marginRight: '2px' }}>VIEW:</span>
                {(['CLOSE', 'NORMAL', 'FAR'] as ChaseDistancePreset[]).map((preset) => (
                  <button
                    key={preset}
                    id={`view-${preset.toLowerCase()}-btn`}
                    onClick={() => setChasePreset(preset)}
                    style={{
                      backgroundColor: chasePreset === preset ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                      color: chasePreset === preset ? '#fff' : '#cbd5e1',
                      border: chasePreset === preset ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '3px 7px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </>
          )}

          <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>|</span>

          {/* Help Popover Button */}
          <button
            id="help-popover-btn"
            onClick={() => setShowHelpModal(true)}
            title="Keyboard shortcuts & guide"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ?
          </button>

          {/* Debug Mode Toggle */}
          <button
            id="debug-toggle-btn"
            onClick={toggleDebugMode}
            title="Toggle Engine Debugger"
            style={{
              backgroundColor: debugMode ? '#ef4444' : 'rgba(255, 255, 255, 0.06)',
              color: debugMode ? '#fff' : '#94a3b8',
              border: debugMode ? '1px solid #ff4040' : '1px solid rgba(255, 255, 255, 0.1)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontFamily: 'monospace',
              cursor: 'pointer'
            }}
          >
            {debugMode ? 'DBG ON' : 'DBG'}
          </button>
        </div>

        {/* TOP-RIGHT: Collapsible AI Object Detector Badge / Drawer */}
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {/* Collapsed Pill Button */}
          <button
            id="ai-scanner-toggle-btn"
            onClick={() => setIsAiScannerOpen(!isAiScannerOpen)}
            style={{
              backgroundColor: activeScanTarget?.isEmergency
                ? 'rgba(5, 40, 25, 0.95)'
                : 'rgba(10, 15, 25, 0.88)',
              border: activeScanTarget?.isEmergency
                ? '1px solid #00ff88'
                : '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: activeScanTarget?.isEmergency
                ? '0 0 15px rgba(0, 255, 136, 0.4)'
                : '0 4px 16px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: activeScanTarget?.isEmergency ? '#00ff88' : activeScanTarget ? '#00e5ff' : '#ffaa00',
                boxShadow: activeScanTarget?.isEmergency ? '0 0 8px #00ff88' : '0 0 6px #00e5ff'
              }}
            />
            <span>
              {activeScanTarget
                ? `${activeScanTarget.name} (${activeScanTarget.confidence.toFixed(0)}%)`
                : 'AI SCANNER ●'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '10px' }}>{isAiScannerOpen ? '▲' : '▼'}</span>
          </button>

          {/* Expanded AI Scanner Drawer */}
          {isAiScannerOpen && (
            <div
              id="ai-object-detector-panel"
              style={{
                width: '300px',
                backgroundColor: activeScanTarget?.isEmergency
                  ? 'rgba(5, 30, 20, 0.94)'
                  : 'rgba(10, 16, 26, 0.94)',
                border: activeScanTarget?.isEmergency
                  ? '1px solid #00ff88'
                  : '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: '12px',
                padding: '14px',
                fontFamily: 'monospace',
                color: '#fff',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 60
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: activeScanTarget?.isEmergency ? '#00ff88' : '#00e5ff' }}>
                  🎯 AI OBJECT DETECTOR
                </span>
                <button
                  onClick={() => setIsAiScannerOpen(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>

              {activeScanTarget ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {activeScanTarget.isEmergency ? 'TARGET MATCH' : 'DETECTED OBJECT'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{activeScanTarget.name}</div>
                    <div style={{ fontSize: '11px', color: '#38bdf8' }}>{activeScanTarget.category}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>DISTANCE</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{activeScanTarget.distance.toFixed(1)}m</div>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>CONFIDENCE</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00ff88' }}>
                        {activeScanTarget.confidence.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {activeScanTarget.coords && (
                    <div style={{ fontSize: '10px', color: '#cbd5e1', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '4px 6px', borderRadius: '4px' }}>
                      COORD: [{activeScanTarget.coords[0].toFixed(2)}, {activeScanTarget.coords[1].toFixed(2)}, {activeScanTarget.coords[2].toFixed(2)}]
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  Scanning apartment room...
                </div>
              )}

              {scannedHistory.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>RECENT DISCOVERIES:</div>
                  <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {scannedHistory.slice(0, 6).map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '2px 4px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px' }}>
                        <span style={{ color: item.isEmergency ? '#00ff88' : '#cbd5e1' }}>• {item.name}</span>
                        <span style={{ color: '#94a3b8' }}>{item.confidence.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE MISSION NOTIFICATION (CLEAN SLEEK CENTER BANNER)                   */}
      {/* ========================================================================= */}
      {activeMission && (
        <div
          id="active-mission-banner"
          style={{
            alignSelf: 'center',
            backgroundColor: activeMission.state === 'FAILED'
              ? 'rgba(35, 10, 10, 0.94)'
              : activeMission.state === 'COMPLETED' || activeMission.state === 'TARGET_FOUND'
              ? 'rgba(5, 30, 20, 0.94)'
              : 'rgba(10, 20, 35, 0.92)',
            border: activeMission.state === 'FAILED'
              ? '1px solid #ef4444'
              : activeMission.state === 'COMPLETED' || activeMission.state === 'TARGET_FOUND'
              ? '1px solid #00ff88'
              : '1px solid #38bdf8',
            borderRadius: '24px',
            padding: '8px 20px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto',
            zIndex: 45,
            maxWidth: '85%',
            fontFamily: 'monospace',
            marginTop: '10px'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeMission.state === 'FAILED'
                ? '#ef4444'
                : activeMission.state === 'COMPLETED' || activeMission.state === 'TARGET_FOUND'
                ? '#00ff88'
                : '#38bdf8',
              boxShadow: activeMission.state === 'FAILED' ? '0 0 8px #ef4444' : '0 0 8px #38bdf8'
            }}
          />
          <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '12px' }}>
            [{activeMission.intent}]:
          </span>
          <span style={{ color: '#fff', fontSize: '12px' }}>
            &quot;{activeMission.targetLabel}&quot;
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
            ({activeMission.targetRoom})
          </span>
          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: activeMission.state === 'COMPLETED'
                ? '#00ff88'
                : activeMission.state === 'FAILED'
                ? '#ef4444'
                : '#facc15'
            }}
          >
            {activeMission.state}
          </span>
          {activeMission.resultMessage && (
            <span style={{ color: '#00ff88', fontSize: '11px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px' }}>
              ✓ {activeMission.resultMessage}
            </span>
          )}
          {activeMission.failureReason && (
            <span style={{ color: '#ef4444', fontSize: '11px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px' }}>
              ✕ {activeMission.failureReason}
            </span>
          )}
          <button
            onClick={() => MissionController.getInstance().handleManualTakeover()}
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              cursor: 'pointer',
              marginLeft: '4px'
            }}
          >
            ABORT
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM COMPACT MISSION INTELLIGENCE CONSOLE                              */}
      {/* ========================================================================= */}
      <div
        id="mission-intelligence-console"
        style={{
          alignSelf: 'center',
          width: '100%',
          maxWidth: '780px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'auto',
          zIndex: 50
        }}
      >
        {/* Expanded Drawer: Quick Mission Chips & Monospace Terminal Log */}
        {(isConsoleExpanded || showQuickMissions || showMissionLog) && (
          <div
            style={{
              backgroundColor: 'rgba(8, 14, 24, 0.94)',
              border: '1px solid rgba(0, 229, 255, 0.35)',
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Quick Mission Preset Chips */}
            {(isConsoleExpanded || showQuickMissions) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', fontFamily: 'monospace' }}>QUICK TARGETS:</span>
                {PRESET_COMMANDS.map((p) => (
                  <button
                    key={p.command}
                    type="button"
                    onClick={() => handlePresetSelect(p.command)}
                    style={{
                      backgroundColor: commandInput === p.command ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: commandInput === p.command ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: commandInput === p.command ? '#00e5ff' : '#cbd5e1',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Collapsible Mission Terminal Log */}
            {(isConsoleExpanded || showMissionLog) && missionLog.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(3, 7, 12, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontFamily: 'monospace',
                  fontSize: '10px'
                }}
              >
                {missionLog.slice(0, 15).map((entry) => {
                  const color = entry.level === 'SUCCESS'
                    ? '#00ff88'
                    : entry.level === 'ERROR'
                    ? '#ef4444'
                    : entry.level === 'WARN'
                    ? '#f59e0b'
                    : '#38bdf8'
                  return (
                    <div key={entry.id} style={{ color, display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#64748b' }}>[{entry.formattedTime}]</span>
                      <span>{entry.message}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Compact Single-Line Command Bar (Height ~46px, minimal viewport obstruction) */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'rgba(10, 16, 28, 0.92)',
            border: '1px solid rgba(0, 229, 255, 0.35)',
            borderRadius: '24px',
            padding: '5px 12px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* Mission State Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 10px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: activeMission ? '#00ff88' : '#38bdf8'
              }}
            />
            <span style={{ color: '#38bdf8', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {activeMission ? activeMission.state : 'READY'}
            </span>
          </div>

          {/* Text Command Input Form */}
          <form onSubmit={handleExecuteCommand} style={{ flex: 1, display: 'flex', gap: '6px', margin: 0 }}>
            <input
              id="mission-command-input"
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter command (e.g. 'Find extinguisher', 'Go to TV', 'Bring remote', 'Inspect detector')..."
              style={{
                flex: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                outline: 'none'
              }}
            />

            <button
              id="mission-execute-btn"
              type="submit"
              style={{
                backgroundColor: '#0070f3',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '16px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0, 112, 243, 0.4)',
                whiteSpace: 'nowrap'
              }}
            >
              ▶ EXECUTE
            </button>
          </form>

          {/* Quick Missions Drawer Toggle */}
          <button
            id="quick-missions-toggle-btn"
            type="button"
            onClick={() => setShowQuickMissions(!showQuickMissions)}
            title="Quick Mission Presets"
            style={{
              backgroundColor: showQuickMissions ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: showQuickMissions ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
              color: showQuickMissions ? '#00e5ff' : '#cbd5e1',
              padding: '5px 8px',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            ⚡ QUICK
          </button>

          {/* Mission Logs Drawer Toggle */}
          <button
            id="mission-logs-toggle-btn"
            type="button"
            onClick={() => setShowMissionLog(!showMissionLog)}
            title="Toggle Monospace Mission Log"
            style={{
              backgroundColor: showMissionLog ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
              border: showMissionLog ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
              color: showMissionLog ? '#00e5ff' : '#cbd5e1',
              padding: '5px 8px',
              borderRadius: '12px',
              fontFamily: 'monospace',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            📋 LOGS
          </button>

          {/* Expand / Collapse Drawer Chevron */}
          <button
            id="console-expand-toggle-btn"
            type="button"
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            title={isConsoleExpanded ? 'Collapse Console' : 'Expand Console'}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              padding: '4px 8px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {isConsoleExpanded ? '▼' : '▲'}
          </button>
        </div>

        {/* Micro Sub-Bar: Time Speed Selector */}
        <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(5, 10, 18, 0.75)', padding: '2px 12px', borderRadius: '12px' }}>
          <span style={{ color: '#64748b', fontSize: '9px', fontFamily: 'monospace' }}>SPEED:</span>
          {[0, 1, 5, 10].map((speed) => (
            <button
              key={speed}
              onClick={() => setTimeSpeed(speed)}
              style={{
                backgroundColor: timeSpeed === speed ? '#0070f3' : 'transparent',
                color: timeSpeed === speed ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '1px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: timeSpeed === speed ? 'bold' : 'normal'
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KEYBOARD HELP & SHORTCUTS MODAL                                           */}
      {/* ========================================================================= */}
      {showHelpModal && (
        <div
          onClick={() => setShowHelpModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            pointerEvents: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '440px',
              backgroundColor: 'rgba(10, 16, 28, 0.96)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              color: '#fff',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🎮</span>
                <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#00e5ff' }}>NAVIMIND CONTROLS GUIDE</span>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div>
                <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px', fontFamily: 'monospace' }}>ROBOT LOCOMOTION (RAPier KINEMATIC)</div>
                <div style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                  • <code style={{ color: '#00ff88' }}>W / S</code> — Move Forward / Backward (Orientation-Relative)<br />
                  • <code style={{ color: '#00ff88' }}>A / D</code> — Turn Left / Right Yaw<br />
                  • <code style={{ color: '#00ff88' }}>Q / E</code> — Strafe Left / Right<br />
                  • <code style={{ color: '#00ff88' }}>Shift</code> — Sprint Boost (1.64x velocity)<br />
                  • <em>Instant Takeover</em>: Pressing any movement key immediately cancels AUTO mission.
                </div>
              </div>

              <div>
                <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px', fontFamily: 'monospace' }}>CAMERA DIRECTOR (PHASE 3.5)</div>
                <div style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                  • <code style={{ color: '#00ff88' }}>C</code> — Cycle Camera Mode (<span style={{ color: '#38bdf8' }}>CHASE ➔ FPV ➔ ORBIT</span>)<br />
                  • <code style={{ color: '#00ff88' }}>V</code> — Cycle Chase Distance Preset (<span style={{ color: '#c084fc' }}>CLOSE ➔ NORMAL ➔ FAR</span>)<br />
                  • <code>Mouse Wheel</code> — Fine Chase Camera Distance Zoom (0.8m – 4.5m)<br />
                  • <em>Wall Avoidance</em>: Raycasting prevents camera clipping through apartment walls.
                </div>
              </div>

              <div>
                <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px', fontFamily: 'monospace' }}>MISSION INTELLIGENCE</div>
                <div style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                  • Type any natural-language mission command in the bottom bar and press <code style={{ color: '#00ff88' }}>Enter</code>.<br />
                  • Supports intents: <code>FIND</code>, <code>NAVIGATE</code>, <code>INSPECT</code>, <code>FETCH</code>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEBUG MODE PANEL                                                          */}
      {/* ========================================================================= */}
      {debugMode && (
        <div
          id="mission-debug-panel"
          style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            width: '320px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #ff4040',
            borderRadius: '12px',
            padding: '14px',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '11px',
            pointerEvents: 'auto',
            boxShadow: '0 0 20px rgba(255, 64, 64, 0.3)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ color: '#ff4040', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid rgba(255,64,64,0.3)', paddingBottom: '4px' }}>
            🛠️ MISSION ENGINE DEBUGGER
          </div>
          <div><span style={{ color: '#94a3b8' }}>Camera Mode:</span> <span style={{ color: '#38bdf8' }}>{cameraMode}</span></div>
          <div><span style={{ color: '#94a3b8' }}>Chase Preset:</span> {chasePreset}</div>
          <div><span style={{ color: '#94a3b8' }}>Mission ID:</span> {activeMission?.id || 'none'}</div>
          <div><span style={{ color: '#94a3b8' }}>Raw Command:</span> &quot;{activeMission?.commandText || 'none'}&quot;</div>
          <div><span style={{ color: '#94a3b8' }}>Parsed Intent:</span> <span style={{ color: '#38bdf8' }}>{activeMission?.intent || 'none'}</span></div>
          <div><span style={{ color: '#94a3b8' }}>Resolved Target:</span> {activeMission?.targetLabel || 'none'} ({activeMission?.targetId || 'none'})</div>
          <div><span style={{ color: '#94a3b8' }}>Mission State:</span> <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{activeMission?.state || 'IDLE'}</span></div>
          <div><span style={{ color: '#94a3b8' }}>Navigation Status:</span> {navigationStatus}</div>
          <div><span style={{ color: '#94a3b8' }}>Target Distance:</span> {activeMission?.targetDistance ? `${activeMission.targetDistance.toFixed(2)}m` : 'N/A'}</div>
          {activeMission?.failureReason && (
            <div style={{ color: '#ef4444' }}><span>Failure Reason:</span> {activeMission.failureReason}</div>
          )}
        </div>
      )}
    </div>
  )
}
