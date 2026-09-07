import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient' // sesuaikan path ke file client Supabase Anda

/**
 * Widget "Tanya AI" — floating button di pojok kanan bawah.
 * Saat diklik, terbuka panel chat kecil yang mengirim pertanyaan
 * ke Supabase Edge Function `ask-ai`, yang meneruskannya ke Claude API.
 *
 * Cara pakai di Beranda.jsx:
 *   import TanyaAI from '../components/TanyaAI'
 *   ...
 *   return (
 *     <>
 *       {... isi halaman Beranda yang sudah ada ...}
 *       <TanyaAI />
 *     </>
 *   )
 */
export default function TanyaAI() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo! Ada yang bisa saya bantu terkait rapat atau akun Anda?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    const nextMessages = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          question,
          // kirim histori singkat supaya AI paham konteks lanjutan percakapan
          history: nextMessages.slice(-6),
        },
      })

      if (error) throw error

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data?.answer || 'Maaf, saya belum bisa menjawab itu.' },
      ])
    } catch (err) {
      console.error('TanyaAI error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Maaf, sedang ada gangguan. Coba lagi sebentar lagi, ya.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 50 }}>
      {open && (
        <div
          style={{
            width: 320,
            maxWidth: '90vw',
            height: 420,
            marginBottom: 12,
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: '#1E293B',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14 }}>Tanya AI</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: '#F8FAFC',
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? '#1E293B' : '#E2E8F0',
                  color: m.role === 'user' ? '#fff' : '#1E293B',
                  padding: '8px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.4,
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#64748B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="animate-spin" />
                Sedang mengetik...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{ display: 'flex', borderTop: '1px solid #E2E8F0', padding: 8, gap: 8 }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan..."
              style={{
                flex: 1,
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Kirim"
              style={{
                background: '#1E293B',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0 12px',
                cursor: loading ? 'default' : 'pointer',
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tanya AI"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#1E293B',
          color: '#fff',
          border: 'none',
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginLeft: 'auto',
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}
