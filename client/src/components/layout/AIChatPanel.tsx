import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2 } from 'lucide-react'
import { api } from '../../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  "Which vehicles are available?",
  "Show delayed trips",
  "Who has best safety score?",
  "Highest maintenance cost this month?",
]

export function AIChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: messages.slice(-10),
      })
      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.data.message }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, AI service is unavailable right now.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-sidebar)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm text-[var(--text-primary)]">Fleet Assistant</p>
                  <p className="text-xs text-[var(--text-muted)]">AI-powered help</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]">
                <X className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[var(--bg-sidebar)] text-sm text-[var(--text-secondary)]">
                    Hi! I'm your fleet assistant. Ask me anything about your fleet.
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Quick suggestions:</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="block w-full text-left p-2.5 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    m.role === 'user'
                      ? 'bg-[var(--brand-primary)] text-white rounded-br-sm'
                      : 'bg-[var(--bg-sidebar)] text-[var(--text-primary)] rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-lg bg-[var(--bg-sidebar)] rounded-bl-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--border-default)]">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your fleet..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-page)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
