import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import { Truck, Users, MapPin, Wrench, Droplets, Bot, Moon, Sun } from 'lucide-react'
import { Button } from '../components/ui/ButtonWrapper'
import { Card, CardContent } from '../components/ui/CardWrapper'

const features = [
  { icon: Truck, title: 'Vehicle Tracking & Status', desc: 'Real-time vehicle health monitoring, assignment, and status tracking.' },
  { icon: Users, title: 'Driver Management', desc: 'Manage driver licenses, availability, and performance scoring.' },
  { icon: MapPin, title: 'Trip Lifecycle Management', desc: 'Track end-to-end trips from draft to dispatch and completion.' },
  { icon: Droplets, title: 'Fuel & Expense Monitoring', desc: 'Log fuel fill-ups and track all operational expenses by vehicle.' },
  { icon: Wrench, title: 'Maintenance Scheduling', desc: 'Plan scheduled maintenance and log repair costs effectively.' },
  { icon: Bot, title: 'AI-Powered Fleet Assistant', desc: 'Chat with AI to instantly query your fleet data and metrics.' },
]

const steps = [
  { step: '01', title: 'Add your fleet', desc: 'Easily input your vehicles and driver details into the system.' },
  { step: '02', title: 'Assign drivers and dispatch trips', desc: 'Create trips, assign the right drivers and vehicles, and dispatch.' },
  { step: '03', title: 'Monitor everything in real-time', desc: 'Track costs, fuel, and trip statuses from the central dashboard.' }
]

export function Landing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useUIStore()
  
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'contact@transitops.com'

  const handleDemoLogin = () => {
    navigate('/login', { state: { email: 'demo@transitops.com', password: 'Demo@12345' } })
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">TransitOps</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </Button>
            <Button onClick={() => navigate('/login')} className="bg-primary hover:bg-[#b57703] text-white">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 bg-primary opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 50% -20%, hsl(var(--primary)) 0%, transparent 60%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
            Fleet Management Built for <br className="hidden sm:block" />
            <span className="text-primary">Indian Logistics</span>
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-10">
            Track vehicles, manage drivers, monitor fuel and expenses — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={`mailto:${contactEmail}`}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-shadow bg-foreground text-background hover:bg-muted-foreground">
                Request a Demo
              </Button>
            </a>
            <Button variant="outline" size="lg" onClick={handleDemoLogin} className="w-full sm:w-auto text-lg px-8 py-4 h-auto border-primary text-primary hover:bg-primary hover:text-white transition-colors">
              Try Demo Account
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">500+</p>
              <p className="text-sm sm:text-base font-medium text-muted-foreground uppercase tracking-wider">Vehicles Managed</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">10,000+</p>
              <p className="text-sm sm:text-base font-medium text-muted-foreground uppercase tracking-wider">Trips Completed</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">30%</p>
              <p className="text-sm sm:text-base font-medium text-muted-foreground uppercase tracking-wider">Fuel Cost Reduction</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">99.9%</p>
              <p className="text-sm sm:text-base font-medium text-muted-foreground uppercase tracking-wider">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to run your fleet</h2>
            <p className="text-xl text-muted-foreground">Powerful modules built specifically for transportation businesses.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(f => (
              <Card key={f.title} className="border-border bg-card hover:border-primary transition-colors group">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-muted-foreground">Get up and running in minutes, not months.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-border z-0" />
            {steps.map((s) => (
              <div key={s.step} className="relative z-10 text-center">
                <div className="w-24 h-24 mx-auto bg-background border-4 border-card rounded-full flex items-center justify-center text-2xl font-bold text-primary shadow-lg mb-6">
                  {s.step}
                </div>
                <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to modernize your fleet?</h2>
          <p className="text-xl text-white/90 mb-10">Join the next generation of logistics companies running on TransitOps.</p>
          <a href={`mailto:${contactEmail}`}>
            <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-xl px-10 py-4 h-auto shadow-xl">
              Get in Touch
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">TransitOps</span>
          </div>
          <div className="text-muted-foreground">
            &copy; {new Date().getFullYear()} TransitOps. All rights reserved.
          </div>
          <div className="flex gap-6 text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
