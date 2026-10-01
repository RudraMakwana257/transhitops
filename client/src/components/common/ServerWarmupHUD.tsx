import { useEffect, useState } from 'react'
import { useWarmupStore } from '../../store/warmupStore'
import { Satellite, Radio, Zap, ShieldCheck, CheckCircle2, RefreshCw, Terminal, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react'

const TELEMETRY_STAGES = [
  {
    icon: Satellite,
    title: 'Connecting Operations Center',
    desc: 'Establishing encrypted satellite telematics uplink...',
    hint: 'Satellite Link'
  },
  {
    icon: Zap,
    title: 'Calibrating Diagnostics',
    desc: 'Waking live OBD-II engine and fuel telemetry feeds...',
    hint: 'Engine Feeds'
  },
  {
    icon: Radio,
    title: 'Synchronizing Fleet Nodes',
    desc: 'Syncing real-time GPS locations and active route corridors...',
    hint: 'GPS Matrix'
  },
  {
    icon: ShieldCheck,
    title: 'Verifying Security Clearance',
    desc: 'Authorizing tenant cryptographic tokens and access policies...',
    hint: 'Security Gateway'
  },
  {
    icon: RefreshCw,
    title: 'Finalizing Workspace Launch',
    desc: 'TransitOps cloud microservices active. Launching operations center...',
    hint: 'Cloud Readiness'
  }
]

const LIVE_DIAGNOSTICS = [
  'Uplink: TLSv1.3 AES-256-GCM established',
  'OBD-II CAN-Bus Gateway: Polling 48 telemetry transponders',
  'GPS Matrix: Route corridor geofencing active',
  'Multi-Tenant Crypt: Company context validated',
  'Microservice Cluster: Port binding in progress',
  'Fleet Health Engine: Score cache warmed',
  'AI Dispatch Assistant: LLM gateway initialized',
  'Ready: Streaming telemetry to browser session'
]

export function ServerWarmupHUD() {
  const { isWarmingUp, isCompleted, startTime } = useWarmupStore()
  const [elapsedSec, setElapsedSec] = useState(0)
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(15)
  const [showTerminal, setShowTerminal] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (!isWarmingUp) {
      setElapsedSec(0)
      setStageIndex(0)
      setProgress(15)
      setShowTerminal(false)
      setIsMinimized(false)
      return
    }

    const timer = setInterval(() => {
      if (startTime) {
        const sec = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSec(sec)

        // Rotate stages according to typical cold-start timeline
        if (sec < 6) {
          setStageIndex(0)
          setProgress(Math.min(30, 15 + sec * 3))
        } else if (sec < 14) {
          setStageIndex(1)
          setProgress(Math.min(55, 30 + (sec - 6) * 3))
        } else if (sec < 24) {
          setStageIndex(2)
          setProgress(Math.min(78, 55 + (sec - 14) * 2.3))
        } else if (sec < 35) {
          setStageIndex(3)
          setProgress(Math.min(92, 78 + (sec - 24) * 1.4))
        } else {
          setStageIndex(4)
          setProgress(Math.min(96, 92 + (sec - 35) * 0.4))
        }
      }
    }, 500)

    return () => clearInterval(timer)
  }, [isWarmingUp, startTime])

  if (!isWarmingUp && !isCompleted) return null

  const currentStage = TELEMETRY_STAGES[stageIndex]
  const StageIcon = isCompleted ? CheckCircle2 : currentStage.icon

  // Minimized Floating Pill View
  if (isMinimized && !isCompleted) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in duration-300">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 border border-emerald-500/40 text-white shadow-2xl backdrop-blur-xl hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-400">Syncing Operations Center...</span>
          <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
            {elapsedSec}s
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-500 ${
        isCompleted
          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-500/20'
          : 'bg-slate-900/95 border-emerald-500/30 text-white shadow-black/60'
      }`}>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!isCompleted && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCompleted ? 'bg-emerald-400' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400">
              {isCompleted ? 'All Systems Go' : 'TransitOps Telemetry Gateway'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
              {isCompleted ? '100% ONLINE' : `00:${elapsedSec < 10 ? '0' : ''}${elapsedSec} • ${currentStage.hint}`}
            </span>
            {!isCompleted && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Minimize indicator"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle Body */}
        <div className="flex items-start gap-3.5 my-2">
          <div className={`p-2.5 rounded-xl border flex-shrink-0 transition-colors ${
            isCompleted
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <StageIcon className={`h-6 w-6 ${!isCompleted ? 'animate-pulse' : ''}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-tight text-white mb-0.5">
              {isCompleted ? 'Operations Center Synchronized' : currentStage.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isCompleted ? 'Telemetry feeds active. Resuming workspace seamlessly...' : currentStage.desc}
            </p>
          </div>
        </div>

        {/* Terminal Toggle Button */}
        {!isCompleted && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowTerminal(!showTerminal)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/80 hover:text-emerald-300 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showTerminal ? 'Hide Telemetry Diagnostics' : 'Inspect Live Telemetry Feed'}</span>
              {showTerminal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTerminal && (
              <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-emerald-500/20 font-mono text-[10px] text-emerald-300/90 space-y-1 max-h-28 overflow-y-auto">
                {LIVE_DIAGNOSTICS.slice(0, Math.min(LIVE_DIAGNOSTICS.length, Math.max(2, Math.floor(elapsedSec / 3) + 2))).map((log, i) => (
                  <div key={i} className="flex items-start gap-1.5 leading-tight">
                    <span className="text-emerald-500 select-none">›</span>
                    <span>{log}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1 text-slate-400 animate-pulse text-[9px] pt-1 border-t border-emerald-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  <span>Synchronizing fleet transponders in real-time...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-3 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-medium">
            <span>{isCompleted ? 'Uplink Established' : 'Connecting cloud fleet instances...'}</span>
            <span className="font-mono text-emerald-400">{isCompleted ? '100%' : `${Math.round(progress)}%`}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-emerald-400 w-full'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
              }`}
              style={{ width: isCompleted ? '100%' : `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
