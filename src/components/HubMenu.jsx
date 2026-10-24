import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Kartu-kartu menu untuk halaman "hub" (Alat / Media, Toko, dst).
// items: [{ to, label, desc, icon: IconComponent }]
export default function HubMenu({ items }) {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] touch-manipulation"
          >
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-sm"
              style={{ background: 'var(--sidebar-active-gradient, #1e3a8a)' }}
            >
              <Icon size={24} strokeWidth={1.8} />
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 leading-tight">{label}</p>
              {desc && <p className="text-sm text-slate-500 mt-1 leading-snug">{desc}</p>}
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 group-hover:gap-2 transition-all">
              Buka <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
