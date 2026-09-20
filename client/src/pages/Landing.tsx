import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import {
  Truck,
  Wrench,
  Droplets,
  Bot,
  Moon,
  Sun,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Compass,
  Check,
  Shield,
  RefreshCw,
  Fuel,
  ChevronDown,
  AlertOctagon,
  Menu,
  X
} from 'lucide-react'
import { Button } from '../components/ui/ButtonWrapper'
import { Badge } from '../components/ui/badge'

export function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useUIStore()
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'contact@transitops.com'

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HERO LIVE INTERACTIVE TELEMETRY STREAM
  // ─────────────────────────────────────────────────────────────────────────────
  const [heroTab, setHeroMode] = useState<'stream' | 'dispatch' | 'alerts' | 'ai'>('stream')
  const [activeTruckIndex, setActiveTruckIndex] = useState<number>(0)
  const [simProgress, setSimProgress] = useState<number>(62)
  const [simSpeed, setSimSpeed] = useState<number>(70)

  const heroVehicles = [
    {
      id: 'MH-12-DE-4410',
      name: 'BharatBenz 2823C (Heavy Hauler)',
      driver: 'Rajesh Sharma (HMV Badge #8841)',
      route: 'Mumbai Nhava Sheva ➔ Pune Logistics Yard',
      progress: 68,
      speed: '72 km/h',
      fuelEconomy: '4.2 km/L',
      payload: '18,400 / 20,000 kg',
      health: 96,
      status: 'In Transit'
    },
    {
      id: 'KA-01-MJ-8821',
      name: 'Tata Prima 3530.K (Tipper)',
      driver: 'Vikramaditya Rao (HMV Badge #9920)',
      route: 'Bengaluru Peenya ➔ Chennai Ennore Port',
      progress: 44,
      speed: '68 km/h',
      fuelEconomy: '3.9 km/L',
      payload: '24,100 / 25,000 kg',
      health: 91,
      status: 'On Schedule'
    },
    {
      id: 'DL-01-AA-9023',
      name: 'Ashok Leyland 4220 (Multi-Axle)',
      driver: 'Gurpreet Singh (HMV Badge #1024)',
      route: 'Delhi ICD Tughlakabad ➔ Jaipur Hub',
      progress: 88,
      speed: '54 km/h',
      fuelEconomy: '4.5 km/L',
      payload: '14,200 / 18,000 kg',
      health: 98,
      status: 'Approaching Hub'
    }
  ]

  const currentTruck = heroVehicles[activeTruckIndex]

  // Telemetry tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSimProgress((prev) => (prev >= 100 ? 5 : prev + 1))
      setSimSpeed((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2
        const next = prev + delta
        return next > 85 ? 80 : next < 45 ? 55 : next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PERSONA STORYBOARD (DAY IN THE LIFE)
  // ─────────────────────────────────────────────────────────────────────────────
  const [activePersona, setActivePersona] = useState<'manager' | 'dispatcher' | 'safety' | 'finance'>('manager')

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. INTERACTIVE DISPATCH & SAFETY SIMULATOR
  // ─────────────────────────────────────────────────────────────────────────────
  const [selectedTruckClass, setSelectedTruckClass] = useState<'lcv' | 'mcv' | 'hcv'>('mcv')
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(4400)
  const [driverLicenseStatus, setDriverLicenseStatus] = useState<'valid' | 'expired'>('valid')
  const [vehicleYardStatus, setVehicleYardStatus] = useState<'available' | 'in_shop'>('available')

  const truckSpec = useMemo(() => {
    switch (selectedTruckClass) {
      case 'lcv':
        return { name: 'Tata Ace Gold (LCV)', maxCapacity: 1500 }
      case 'mcv':
        return { name: 'Eicher Pro 3019 (MCV)', maxCapacity: 5000 }
      case 'hcv':
        return { name: 'BharatBenz 2823C (HCV)', maxCapacity: 16000 }
    }
  }, [selectedTruckClass])

  const dispatchValidation = useMemo(() => {
    const isOverload = cargoWeightKg > truckSpec.maxCapacity
    const isLicenseExpired = driverLicenseStatus === 'expired'
    const isVehicleUnavailable = vehicleYardStatus === 'in_shop'

    const isPassed = !isOverload && !isLicenseExpired && !isVehicleUnavailable

    let errorReason = ''
    if (isVehicleUnavailable) errorReason = 'Vehicle is in shop for maintenance'
    else if (isLicenseExpired) errorReason = 'Driver commercial license is expired'
    else if (isOverload) errorReason = `Cargo weight (${cargoWeightKg.toLocaleString()} kg) exceeds truck capacity (${truckSpec.maxCapacity.toLocaleString()} kg)`

    return {
      isPassed,
      isOverload,
      isLicenseExpired,
      isVehicleUnavailable,
      errorReason,
      loadPercent: Math.round((cargoWeightKg / truckSpec.maxCapacity) * 100)
    }
  }, [cargoWeightKg, truckSpec, driverLicenseStatus, vehicleYardStatus])

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FLEET ROI & FINANCIAL CALCULATOR
  // ─────────────────────────────────────────────────────────────────────────────
  const [fleetSize, setFleetSize] = useState<number>(30)
  const [monthlyKmPerTruck, setMonthlyKmPerTruck] = useState<number>(5500)
  const [dieselPricePerLiter, setDieselPricePerLiter] = useState<number>(94)

  const roiCalculations = useMemo(() => {
    const totalKmMonth = fleetSize * monthlyKmPerTruck
    const baselineLiters = totalKmMonth / 3.4
    const optimizedLiters = totalKmMonth / 4.3
    const litersSavedMonth = baselineLiters - optimizedLiters
    const monthlyFuelSavings = litersSavedMonth * dieselPricePerLiter
    const annualFuelSavings = monthlyFuelSavings * 12
    const maintenanceSaved = fleetSize * 60000
    const totalBenefit = annualFuelSavings + maintenanceSaved

    return {
      monthlySaved: Math.round(monthlyFuelSavings),
      annualSaved: Math.round(totalBenefit),
      co2TonsReduced: Math.round(((litersSavedMonth * 12 * 2.68) / 1000) * 10) / 10,
      roiMultiplier: (totalBenefit / (fleetSize * 1500 * 12)).toFixed(1)
    }
  }, [fleetSize, monthlyKmPerTruck, dieselPricePerLiter])

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. AI COPILOT DEMO
  // ─────────────────────────────────────────────────────────────────────────────
  const aiPrompts = [
    {
      title: 'High-Risk Vehicles Forecast',
      query: 'Which trucks have overdue servicing and health score < 60?',
      reply: '1 vehicle flagged: MH-14-GH-2201 (Tata Prima) has overdue brake overhaul by 1,420 km (Health Score 48/100). It has been automatically blocked from long-haul trip dispatches until workshop clearance.'
    },
    {
      title: 'Corridor Fuel & Expense Benchmark',
      query: 'What is our average fuel cost on the Mumbai-Pune corridor?',
      reply: 'Across 18 completed trips on Mumbai-Pune in the last 30 days: Average fuel economy is 4.28 km/L (Total spend: ₹2,14,000). Zero unverified fuel receipts detected.'
    },
    {
      title: 'Driver License Expirations',
      query: 'List all commercial drivers whose license expires in the next 30 days.',
      reply: 'Driver Amit Verma (Badge #DRV-004) expired 3 days ago (BLOCKED from dispatch). Driver Karan Mehra (Badge #DRV-019) expires in 12 days — automated renewal alert sent.'
    }
  ]
  const [selectedAiPrompt, setSelectedAiPrompt] = useState(aiPrompts[0])
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false)

  const handleAiSelect = (prompt: typeof aiPrompts[0]) => {
    setIsAiTyping(true)
    setSelectedAiPrompt(prompt)
    setTimeout(() => {
      setIsAiTyping(false)
    }, 350)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. PRICING & FAQ
  // ─────────────────────────────────────────────────────────────────────────────
  const [billingAnnual, setBillingAnnual] = useState<boolean>(true)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqs = [
    {
      q: 'What is TransitOps and how does it help my fleet?',
      a: 'TransitOps is a centralized fleet operating system that brings real-time GPS tracking, automated driver license compliance, payload safety checks, and fuel expense auditing into one easy-to-use platform.'
    },
    {
      q: 'How does the dispatch safety guard prevent overloading?',
      a: 'Before any trip can be dispatched, TransitOps automatically checks the cargo weight against the truck\'s rated capacity limit. If the load is too heavy, the system blocks the dispatch.'
    },
    {
      q: 'Do I need special hardware installed in my vehicles?',
      a: 'No special hardware required! TransitOps connects directly with standard OBD-II GPS trackers, FASTag toll portals, smartphones, and fuel fleet cards via standard APIs.'
    },
    {
      q: 'Is TransitOps easy for non-technical dispatchers to use?',
      a: 'Yes! TransitOps is built with simple visual controls, clear green/red status badges, and an intuitive layout designed for fast day-to-day operations.'
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">

      {/* Ambient Radial Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 blur-[140px] rounded-full opacity-70 dark:opacity-40" />
        <div className="absolute top-[45%] -left-40 w-[600px] h-[600px] bg-amber-500/5 blur-[160px] rounded-full" />
        <div className="absolute top-[70%] -right-40 w-[600px] h-[600px] bg-primary/5 blur-[160px] rounded-full" />
      </div>

      {/* ─── 1. PREMIUM GLASS NAVIGATION BAR ──────────────────────────────── */}
      <header className="sticky top-3 z-50 px-4 sm:px-6 max-w-7xl mx-auto">
        <nav className="backdrop-blur-2xl bg-card/90 dark:bg-card/75 border border-border/80 shadow-2xl shadow-black/[0.05] dark:shadow-black/30 rounded-2xl px-4 sm:px-6 h-16 flex items-center justify-between transition-all relative">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform shrink-0">
              <Truck className="w-5 h-5 text-white stroke-[2.4]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/85 bg-clip-text">
                TransitOps
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold border border-primary/40 text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                OS v2.4
              </span>
            </div>
          </div>

          {/* Desktop Navigation — Strict single line, concise items */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap shrink-0">
            <a href="#cockpit" className="hover:text-primary transition-colors">Features</a>
            <a href="#pillars" className="hover:text-primary transition-colors">Solutions</a>
            <a href="#simulator" className="hover:text-primary transition-colors">Safety Guard</a>
            <a href="#roi" className="hover:text-primary transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex rounded-xl font-bold border-border/80 hover:border-primary/60 text-foreground text-xs px-4 h-9"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/register')}
              className="hidden sm:inline-flex rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 px-4 h-9 text-xs"
            >
              Start Free Trial
            </Button>

            {/* Mobile Menu Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Collapsible Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <div className="absolute top-20 left-0 right-0 p-5 rounded-2xl border border-border/80 bg-card shadow-2xl backdrop-blur-3xl flex flex-col gap-3 lg:hidden z-50 animate-slide-up font-sans">
              <a
                href="#cockpit"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-muted font-bold text-sm text-foreground transition-all"
              >
                Features
              </a>
              <a
                href="#pillars"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-muted font-bold text-sm text-foreground transition-all"
              >
                Solutions
              </a>
              <a
                href="#simulator"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-muted font-bold text-sm text-foreground transition-all"
              >
                Safety Guard
              </a>
              <a
                href="#roi"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-muted font-bold text-sm text-foreground transition-all"
              >
                ROI Calculator
              </a>
              <a
                href="#pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl hover:bg-muted font-bold text-sm text-foreground transition-all"
              >
                Plans & Pricing
              </a>

              <div className="flex gap-2.5 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="flex-1 rounded-xl font-bold border-border text-foreground text-xs h-10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    navigate('/register')
                  }}
                  className="flex-1 rounded-xl font-black bg-primary text-primary-foreground text-xs h-10"
                >
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ─── 2. HERO: STORY-DRIVEN VALUE PROPOSITION ─────────────────────── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 z-10">
        <div className="max-w-6xl mx-auto text-center">

          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-6 backdrop-blur-sm animate-pulse">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="font-semibold">Next-Gen Fleet OS 2.4</span>
            <span className="text-muted-foreground hidden sm:inline">•</span>
            <span className="hidden sm:inline text-muted-foreground">Autonomous Telemetry & AI Dispatch</span>
            <ChevronRight className="w-3.5 h-3.5 text-primary ml-0.5" />
          </div>

          {/* Core Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-foreground">
            From Dispatch to Decisions. <br />
            <span className="bg-gradient-to-r from-primary via-amber-500 to-amber-600 bg-clip-text text-transparent">
              One Operating System for Your Entire Fleet.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 font-normal">
            TransitOps connects live GPS tracking, automated driver license checks, cargo weight safety limits,
            and fuel cost auditing into a single real-time operations console.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 group text-sm"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href={`mailto:${contactEmail}`} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-xl font-medium border-border hover:bg-muted/80 text-foreground transition-all text-sm"
              >
                Schedule Demo Briefing
              </Button>
            </a>
          </div>

          {/* Quick Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-medium text-muted-foreground mb-12">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Real-Time Fleet Visibility</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Zero Illegal Cargo Overloading</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Automated License Expiry Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Audit Fuel Expense & Theft</span>
            </div>
          </div>

          {/* ─── LIVE COCKPIT INTERACTIVE PREVIEW ────────────────────────── */}
          <div
            id="cockpit"
            className="relative rounded-3xl border border-border/80 bg-card/90 dark:bg-card/70 backdrop-blur-2xl p-3 sm:p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden text-left"
          >
            {/* Window Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 mb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono font-semibold text-muted-foreground">transitops-hub // live-telemetry.stream</span>
              </div>

              {/* View Switchers */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 text-xs font-medium overflow-x-auto">
                <button
                  onClick={() => setHeroMode('stream')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    heroTab === 'stream' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-primary" /> Live Radar
                </button>
                <button
                  onClick={() => setHeroMode('dispatch')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    heroTab === 'dispatch' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-primary" /> Active Trips ({heroVehicles.length})
                </button>
                <button
                  onClick={() => setHeroMode('alerts')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    heroTab === 'alerts' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> Smart Alerts (3)
                </button>
                <button
                  onClick={() => setHeroMode('ai')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    heroTab === 'ai' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-primary" /> AI Assistant
                </button>
              </div>
            </div>

            {/* Tab 1: Live Telemetry Stream */}
            {heroTab === 'stream' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {heroVehicles.map((v, i) => (
                      <button
                        key={v.id}
                        onClick={() => setActiveTruckIndex(i)}
                        className={`p-3 rounded-xl border text-left transition-all shrink-0 flex-1 ${
                          activeTruckIndex === i
                            ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm'
                            : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold">{v.id}</span>
                          <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-emerald-500 animate-ping' : 'bg-primary'}`} />
                        </div>
                        <p className="text-[11px] truncate">{v.name.split('(')[0]}</p>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Active Corridor Route</span>
                        <h4 className="text-sm sm:text-base font-bold text-foreground">{currentTruck.route}</h4>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                        {currentTruck.status} • {simSpeed} km/h
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="relative h-3.5 bg-background rounded-full border border-border/60 overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-amber-500 to-amber-600 rounded-full transition-all duration-700 relative"
                          style={{ width: `${simProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground">
                        <span>Dispatch Yard</span>
                        <span className="text-primary font-bold">{simProgress}% Completed</span>
                        <span>Destination Hub</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground font-mono block">Speed</span>
                        <span className="font-bold text-foreground">{simSpeed} km/h</span>
                      </div>
                      <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground font-mono block">Fuel Average</span>
                        <span className="font-bold text-emerald-500">{currentTruck.fuelEconomy}</span>
                      </div>
                      <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground font-mono block">Payload</span>
                        <span className="font-bold text-foreground truncate block">{currentTruck.payload}</span>
                      </div>
                      <div className="bg-background/80 p-2.5 rounded-xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground font-mono block">Health Score</span>
                        <span className="font-bold text-primary">{currentTruck.health}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        Vehicle Health Index
                      </span>
                      <span className="text-lg font-extrabold text-primary">{currentTruck.health}/100</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Fuel Efficiency Factor</span>
                          <span className="font-semibold text-emerald-500">96% Optimal</span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[96%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-muted-foreground">Maintenance Interval Compliance</span>
                          <span className="font-semibold text-emerald-500">92% Good</span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-background/80 rounded-xl border border-border/40 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned Commercial Pilot:</span>
                        <span className="font-bold text-foreground">{currentTruck.driver.split('(')[0]}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                    >
                      Open Live Operations Cockpit
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Active Trips List */}
            {heroTab === 'dispatch' && (
              <div className="p-2 space-y-3">
                {heroVehicles.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-sm">{trip.id}</span>
                        <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                          {trip.name}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground font-medium">{trip.route}</p>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                        <span>Driver: <strong className="text-foreground">{trip.driver.split('(')[0]}</strong></span>
                        <span>Payload: <strong className="text-foreground">{trip.payload}</strong></span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => navigate('/login')}
                      variant="outline"
                      className="text-xs font-semibold rounded-xl self-end sm:self-center"
                    >
                      View Trip Details
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Smart Alerts */}
            {heroTab === 'alerts' && (
              <div className="p-2 space-y-3 text-xs">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">CRITICAL: Driver Commercial License Expired</span>
                    <span className="text-muted-foreground">Driver Amit Verma license expired 3 days ago. Automatically blocked from trip dispatch.</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <Wrench className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">WARNING: Overdue Service Interval</span>
                    <span className="text-muted-foreground">Vehicle MH-14-GH-2201 reached 51,420 km (service limit 50,000 km). Maintenance ticket created.</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground block">AUTO-RESOLVED: Fuel Variance Cleared</span>
                    <span className="text-muted-foreground">Vehicle MH-04-AZ-9901 fuel economy normalized to 4.3 km/L following service. Alert resolved.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: AI Copilot */}
            {heroTab === 'ai' && (
              <div className="p-2 space-y-4 text-xs font-mono">
                <div className="flex gap-2">
                  {aiPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAiSelect(p)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-sans transition-all ${
                        selectedAiPrompt.title === p.title
                          ? 'bg-primary text-white border-primary'
                          : 'bg-muted/40 border-border text-muted-foreground'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>

                <div className="bg-background/90 p-4 rounded-2xl border border-border/60 space-y-3 font-sans">
                  <div className="p-2.5 bg-muted/40 rounded-xl border border-border/40 text-foreground font-mono text-xs">
                    Query: {selectedAiPrompt.query}
                  </div>
                  <div className="p-3 bg-card rounded-xl border border-border/60 text-muted-foreground leading-relaxed">
                    {isAiTyping ? (
                      <span className="text-primary font-mono flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Querying tenant database...
                      </span>
                    ) : (
                      selectedAiPrompt.reply
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ─── 3. THE 4 PILLARS OF TRANSITOPS ─────────────────────────────── */}
      <section id="pillars" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
            Core Operations Cloud
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Built for Extreme Precision in Indian Logistics
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Replace fragmented spreadsheets and WhatsApp groups with a unified operations platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Dispatch & Fleet Hub</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                Assign trips with automated capacity and driver eligibility checks. Prevent double bookings and legal overloads.
              </p>
            </div>
            <div className="text-[11px] font-mono text-primary flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Pre-dispatch capacity lock
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Exception Radar</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                Real-time alerts for expiring driver licenses, fuel anomalies, overdue servicing, and at-risk vehicle scores.
              </p>
            </div>
            <div className="text-[11px] font-mono text-amber-500 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Auto-resolves on recovery
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Fuel & Cost Ledger</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                Log liters, fuel prices, and odometer readings. Automatically track cost-per-kilometer and audit fuel theft.
              </p>
            </div>
            <div className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Reconciled expense log
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">AI Fleet Assistant</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-6">
                Ask plain-English questions about vehicle health, fuel consumption, driver performance, and corridor profit.
              </p>
            </div>
            <div className="text-[11px] font-mono text-primary flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Sub-second Groq queries
            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. PERSONA STORYBOARD (FOR YOUR TEAM) ───────────────────────── */}
      <section id="personas" className="py-24 bg-muted/20 border-y border-border/60 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
              Designed For Your Team
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Empowering Every Role in Your Logistics Business
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Role-based access and tailored dashboards for managers, dispatchers, safety officers, and finance.
            </p>
          </div>

          {/* Persona Tabs */}
          <div className="flex justify-center gap-2 mb-10 overflow-x-auto pb-2">
            <button
              onClick={() => setActivePersona('manager')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'manager'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Fleet Manager
            </button>
            <button
              onClick={() => setActivePersona('dispatcher')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'dispatcher'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Dispatcher
            </button>
            <button
              onClick={() => setActivePersona('safety')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'safety'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Safety Officer
            </button>
            <button
              onClick={() => setActivePersona('finance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePersona === 'finance'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              Financial Analyst
            </button>
          </div>

          {/* Persona View Card */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-10 shadow-xl">
            {activePersona === 'manager' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-3">Role: Fleet Manager</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Complete Fleet Visibility & Health Scores</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Know which trucks are generating profit, which need servicing, and when to replace older units using real-time Health Scores.
                  </p>
                  <ul className="space-y-2.5 text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Overall Fleet Utilization %</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Vehicle Health Scores (0-100)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Centralized Asset & Yard Control</li>
                  </ul>
                </div>
                <div className="p-6 bg-muted/40 rounded-2xl border border-border/60 text-xs font-mono space-y-3">
                  <span className="text-muted-foreground font-bold">Fleet Manager Dashboard KPI View:</span>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-card p-3 rounded-xl border border-border">
                      <span className="text-muted-foreground text-[10px] block">Active Trucks</span>
                      <span className="text-lg font-bold text-foreground">38 Vehicles</span>
                    </div>
                    <div className="bg-card p-3 rounded-xl border border-border">
                      <span className="text-muted-foreground text-[10px] block">Avg Health Score</span>
                      <span className="text-lg font-bold text-emerald-500">92 / 100</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePersona === 'dispatcher' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-3">Role: Dispatcher</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Error-Free Trip Creation & Overload Protection</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Dispatch trips confidently. TransitOps automatically verifies cargo payload limits and driver license validity before allowing dispatch.
                  </p>
                  <ul className="space-y-2.5 text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Smart Vehicle Recommendation</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automatic Capacity Limits</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Real-time Trip Timeline</li>
                  </ul>
                </div>
                <div className="p-6 bg-muted/40 rounded-2xl border border-border/60 text-xs font-mono space-y-3">
                  <span className="text-muted-foreground font-bold">Dispatcher Trip Validation:</span>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    ✓ Cargo (4,200 kg) &lt; Vehicle Limit (5,000 kg)<br />
                    ✓ Driver License Valid (HMV Badge #8841)<br />
                    ✓ DISPATCH CLEARED
                  </div>
                </div>
              </div>
            )}

            {activePersona === 'safety' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-3">Role: Safety Officer</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Automated Driver Safety & Compliance Radar</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Never get caught with an expired commercial driver badge. Receive 30-day advance warnings and automatic dispatch blocks.
                  </p>
                  <ul className="space-y-2.5 text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> License Expiry Alerts (30 Days)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Driver Safety Score Tracking</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Automated Compliance Audits</li>
                  </ul>
                </div>
                <div className="p-6 bg-muted/40 rounded-2xl border border-border/60 text-xs font-mono space-y-3">
                  <span className="text-muted-foreground font-bold">Safety Compliance Stream:</span>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300">
                    ⚠️ Driver Karan Mehra license expires in 12 days.<br />
                    SMS & WhatsApp renewal reminder dispatched.
                  </div>
                </div>
              </div>
            )}

            {activePersona === 'finance' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs mb-3">Role: Financial Analyst</Badge>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Cost Per Kilometer & Fuel Expense Auditing</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Reconcile fuel chits, toll expenses, and maintenance costs to get exact cost-per-kilometer profitability for every route.
                  </p>
                  <ul className="space-y-2.5 text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Exact Cost-Per-Km Metrics</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fuel Theft & Siphoning Audit</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Reconciled Financial Ledgers</li>
                  </ul>
                </div>
                <div className="p-6 bg-muted/40 rounded-2xl border border-border/60 text-xs font-mono space-y-3">
                  <span className="text-muted-foreground font-bold">Financial Summary:</span>
                  <div className="p-3 bg-card rounded-xl border border-border">
                    Avg Route Cost: ₹22.10 / km<br />
                    Fuel Efficiency: 4.28 km/L<br />
                    Monthly Savings: ₹2,14,000
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 5. INTERACTIVE DISPATCH SAFETY SIMULATOR ───────────────────── */}
      <section id="simulator" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
            Interactive Safety Guard
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Test the Dispatch Safety Engine
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Adjust the cargo weight and driver status below to see how TransitOps prevents unsafe trip dispatches in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-card border border-border/80 rounded-3xl p-6 sm:p-10 shadow-xl">

          {/* Controls */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">

              {/* Truck Class */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                  1. Select Vehicle Capacity Rating
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setSelectedTruckClass('lcv')
                      setCargoWeightKg(1200)
                    }}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all ${
                      selectedTruckClass === 'lcv'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>LCV (1,500 kg)</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTruckClass('mcv')
                      setCargoWeightKg(4400)
                    }}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all ${
                      selectedTruckClass === 'mcv'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>MCV (5,000 kg)</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTruckClass('hcv')
                      setCargoWeightKg(14500)
                    }}
                    className={`p-3 rounded-2xl border text-left font-bold transition-all ${
                      selectedTruckClass === 'hcv'
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span>HCV (16,000 kg)</span>
                  </button>
                </div>
              </div>

              {/* Cargo Weight Slider */}
              <div>
                <div className="flex justify-between items-center mb-2 text-xs font-bold">
                  <span className="text-muted-foreground uppercase">2. Assigned Cargo Weight</span>
                  <span className="text-sm font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl">
                    {cargoWeightKg.toLocaleString()} kg
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={selectedTruckClass === 'lcv' ? 2500 : selectedTruckClass === 'mcv' ? 8000 : 22000}
                  step={100}
                  value={cargoWeightKg}
                  onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              {/* Status Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1">Driver Commercial Badge</span>
                  <button
                    onClick={() => setDriverLicenseStatus(driverLicenseStatus === 'valid' ? 'expired' : 'valid')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
                      driverLicenseStatus === 'valid'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <span>{driverLicenseStatus === 'valid' ? '✓ Valid License' : '✕ Expired License'}</span>
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1">Vehicle Yard Status</span>
                  <button
                    onClick={() => setVehicleYardStatus(vehicleYardStatus === 'available' ? 'in_shop' : 'available')}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
                      vehicleYardStatus === 'available'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span>{vehicleYardStatus === 'available' ? '✓ Available' : '⚠️ In Shop'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Validation Verdict */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-muted/60 via-muted/30 to-background border border-border/80 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Dispatch Safety Verdict
                </span>
                <Badge
                  className={`text-xs font-mono font-bold px-3 py-1 ${
                    dispatchValidation.isPassed
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                  }`}
                >
                  {dispatchValidation.isPassed ? 'DISPATCH APPROVED' : 'DISPATCH BLOCKED'}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Payload Ratio:</span>
                  <span className={dispatchValidation.isOverload ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {dispatchValidation.loadPercent}% Capacity
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dispatchValidation.isOverload ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(dispatchValidation.loadPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3 text-xs font-medium">
                <div className="p-3 bg-card rounded-xl border border-border/60 flex justify-between">
                  <span>Weight Limit Check</span>
                  <span className={dispatchValidation.isOverload ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {dispatchValidation.isOverload ? 'OVERLOADED (Rejected)' : 'PASSED'}
                  </span>
                </div>
                <div className="p-3 bg-card rounded-xl border border-border/60 flex justify-between">
                  <span>Driver License Status</span>
                  <span className={dispatchValidation.isLicenseExpired ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {dispatchValidation.isLicenseExpired ? 'EXPIRED (Rejected)' : 'PASSED'}
                  </span>
                </div>
                <div className="p-3 bg-card rounded-xl border border-border/60 flex justify-between">
                  <span>Vehicle Availability</span>
                  <span className={dispatchValidation.isVehicleUnavailable ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                    {dispatchValidation.isVehicleUnavailable ? 'IN SHOP (Rejected)' : 'PASSED'}
                  </span>
                </div>
              </div>

              {!dispatchValidation.isPassed && (
                <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-mono">
                  <strong>Validation Blocked:</strong> {dispatchValidation.errorReason}
                </div>
              )}
            </div>

            <Button
              onClick={() => navigate('/register')}
              className="mt-6 w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md text-xs"
            >
              Enforce Safety Rules on Your Fleet
            </Button>
          </div>

        </div>
      </section>

      {/* ─── 6. DYNAMIC ROI & FUEL SAVINGS CALCULATOR ────────────────────── */}
      <section id="roi" className="py-24 bg-muted/20 border-y border-border/60 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
              Financial ROI Engine
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Calculate Your Net Annual Payback
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Adjust your fleet parameters to see immediate diesel savings and downtime reduction.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card border border-border/80 rounded-3xl p-6 sm:p-10 shadow-xl">

            {/* Sliders */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" /> Active Commercial Vehicles
                  </label>
                  <span className="text-base font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl font-mono">
                    {fleetSize} Trucks
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={fleetSize}
                  onChange={(e) => setFleetSize(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Avg Monthly Distance / Truck
                  </label>
                  <span className="text-base font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl font-mono">
                    {monthlyKmPerTruck.toLocaleString()} km
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={12000}
                  step={500}
                  value={monthlyKmPerTruck}
                  onChange={(e) => setMonthlyKmPerTruck(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-primary" /> Diesel Price Per Liter
                  </label>
                  <span className="text-base font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-xl font-mono">
                    ₹{dieselPricePerLiter} / L
                  </span>
                </div>
                <input
                  type="range"
                  min={85}
                  max={110}
                  step={1}
                  value={dieselPricePerLiter}
                  onChange={(e) => setDieselPricePerLiter(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent border border-primary/30 p-6 sm:p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-2">
                  PROJECTED ANNUAL BENEFIT
                </span>

                <div className="mb-6">
                  <span className="text-3xl sm:text-5xl font-black text-foreground tracking-tight block font-mono">
                    ₹{roiCalculations.annualSaved.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-emerald-500 block mt-1">
                    ≈ ₹{roiCalculations.monthlySaved.toLocaleString('en-IN')} saved every month
                  </span>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">CO₂ Reduced:</span>
                    <span className="font-bold text-emerald-500">{roiCalculations.co2TonsReduced} Tons / yr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Payback Multiple:</span>
                    <span className="font-extrabold text-primary">{roiCalculations.roiMultiplier}x Net ROI</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/register')}
                className="mt-8 w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md text-xs"
              >
                Start Free Fleet Trial
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 7. TRANSPARENT PRICING & SUBSCRIPTION PLANS ─────────────────── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Clear Plans Scaled to Your Fleet Volume
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            All plans include full multi-tenant isolation, real-time telemetry, and manual billing ledger support.
          </p>

          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-card border border-border/80 shadow-sm text-xs font-semibold">
            <button
              onClick={() => setBillingAnnual(false)}
              className={`px-4 py-2 rounded-xl transition-all ${
                !billingAnnual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingAnnual(true)}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                billingAnnual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Starter Plan */}
          <div className="p-8 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Starter Fleet</h3>
              <p className="text-xs text-muted-foreground mb-6">Ideal for small regional carriers & local fleets.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground font-mono">
                  ₹{billingAnnual ? '3,999' : '4,999'}
                </span>
                <span className="text-xs text-muted-foreground font-medium"> / month</span>
              </div>

              <ul className="space-y-3 text-xs text-foreground mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Up to 5 Active Vehicles</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Up to 5 Commercial Drivers</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> End-to-End Trip Dispatch</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Fuel & Expense Tracking</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Basic Exception Alerts</li>
              </ul>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/register')}
              className="w-full font-bold h-11 rounded-xl text-xs"
            >
              Get Started Free
            </Button>
          </div>

          {/* Professional Plan (Featured) */}
          <div className="p-8 rounded-3xl bg-card border-2 border-primary shadow-xl shadow-primary/10 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
              MOST POPULAR FOR LOGISTICS
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Professional Fleet</h3>
              <p className="text-xs text-muted-foreground mb-6">Complete operations cloud for growing commercial carriers.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground font-mono">
                  ₹{billingAnnual ? '11,999' : '14,999'}
                </span>
                <span className="text-xs text-muted-foreground font-medium"> / month</span>
              </div>

              <ul className="space-y-3 text-xs text-foreground mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Up to 25 Active Vehicles</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Up to 25 Commercial Drivers</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Pre-Dispatch Overload Guard</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Vehicle Health Score OS</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Fuel Theft & Mileage Radar</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Analytics & Reports</li>
              </ul>
            </div>

            <Button
              onClick={() => navigate('/register')}
              className="w-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl shadow-md text-xs"
            >
              Try Professional Free
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">Enterprise Scale</h3>
              <p className="text-xs text-muted-foreground mb-6">Custom multi-hub setup with unlimited capacity & AI Copilot.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground font-mono">
                  ₹{billingAnnual ? '39,999' : '49,999'}
                </span>
                <span className="text-xs text-muted-foreground font-medium"> / month</span>
              </div>

              <ul className="space-y-3 text-xs text-foreground mb-8">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Unlimited Vehicles & Drivers</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> AI Fleet Assistant Included</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Custom API & FASTag Integrations</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-primary shrink-0" /> Dedicated Account Manager</li>
              </ul>
            </div>

            <a href={`mailto:${contactEmail}`}>
              <Button
                variant="outline"
                className="w-full font-bold h-11 rounded-xl text-xs"
              >
                Contact Sales
              </Button>
            </a>
          </div>

        </div>
      </section>

      {/* ─── 8. FAQ ACCORDION ───────────────────────────────────────────── */}
      <section className="py-24 bg-muted/20 border-t border-border/60 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 mb-4">
              Got Questions?
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={index}
                  className="border border-border/80 bg-card rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 font-bold text-foreground text-sm sm:text-base hover:bg-muted/30 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── 9. HIGH-IMPACT RADIANT BOTTOM CTA ──────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-card via-card to-primary/10 border border-border/80 p-8 sm:p-16 text-center shadow-2xl relative overflow-hidden flex flex-col items-center">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#D98E04]/5 blur-[100px] rounded-full pointer-events-none" />

          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1 mb-6">
            Get Started In Minutes
          </Badge>

          <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight relative z-10 max-w-3xl">
            Start Running Your Fleet Smarter Today
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Join professional logistics carriers and fleet owners operating with automated safety, verified fuel auditing, and total operational clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 w-full sm:w-auto">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <a href={`mailto:${contactEmail}`} className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-8 rounded-xl font-semibold border-border hover:bg-muted/80 text-foreground transition-all text-xs"
              >
                Request Custom Trial
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground mt-10 border-t border-border/40 pt-8 w-full max-w-2xl font-medium">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No Credit Card Required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 14-Day Free Trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Cancel Anytime</span>
          </div>
        </div>
      </section>

      {/* ─── 10. MODERN ORGANISED FOOTER ───────────────────────────────── */}
      <footer className="border-t border-border/60 bg-card py-16 px-4 sm:px-6 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">

          {/* Logo & Pitch Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Truck className="w-4 h-4 text-white stroke-[2.2]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-foreground">TransitOps</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              TransitOps is a centralized Intelligent Fleet Operating System engineered to connect real-time GPS telemetry, driver compliance alerts, and fuel cost auditing for modern logistics.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>All Systems Operational (99.98% SLA)</span>
            </div>
          </div>

          {/* Links Col 1: Product */}
          <div className="md:col-span-2 space-y-3.5 text-xs">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">Product</h4>
            <ul className="space-y-2.5 font-medium">
              <li><a href="#cockpit" className="text-muted-foreground hover:text-primary transition-colors">Live Telemetry</a></li>
              <li><a href="#simulator" className="text-muted-foreground hover:text-primary transition-colors">Safety Guard</a></li>
              <li><a href="#roi" className="text-muted-foreground hover:text-primary transition-colors">ROI Modeler</a></li>
              <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Plans & Pricing</a></li>
            </ul>
          </div>

          {/* Links Col 2: Company */}
          <div className="md:col-span-2 space-y-3.5 text-xs">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">Company</h4>
            <ul className="space-y-2.5 font-medium">
              <li><a href="#pillars" className="text-muted-foreground hover:text-primary transition-colors">Core Pillars</a></li>
              <li><a href="#personas" className="text-muted-foreground hover:text-primary transition-colors">User Personas</a></li>
              <li><a href={`mailto:${contactEmail}`} className="text-muted-foreground hover:text-primary transition-colors">Enterprise Sales</a></li>
            </ul>
          </div>

          {/* Links Col 3: Resources */}
          <div className="md:col-span-3 space-y-3.5 text-xs">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">Contact & Support</h4>
            <ul className="space-y-2.5 font-medium">
              <li><span className="text-muted-foreground">Email:</span> <a href={`mailto:${contactEmail}`} className="text-foreground hover:text-primary transition-colors font-semibold">{contactEmail}</a></li>
              <li><span className="text-muted-foreground">Operational HQ:</span> <span className="text-foreground">Mumbai, India</span></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground font-medium">
          <div>
            &copy; {new Date().getFullYear()} TransitOps Technologies. All rights reserved.
          </div>
          <div className="flex gap-6">
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-primary cursor-pointer transition-colors">SLA Agreement</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
