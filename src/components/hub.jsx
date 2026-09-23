// src/components/hub.jsx
//
// Berkas bersama untuk semua halaman "hub" bergaya kartu (GudangSK,
// PortalUjian, dan hub-hub baru berikutnya). Dipindahkan dari
// GudangSK.jsx sesuai catatan di berkas itu supaya tidak duplikasi.

import { Lock } from 'lucide-react'

// Palet warna per kartu. Tambah entri baru di sini kalau butuh warna lain.
export const PALET_WARNA = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-400',
    hoverShadow: 'hover:shadow-blue-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-400',
    hoverShadow: 'hover:shadow-emerald-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-400',
    hoverShadow: 'hover:shadow-purple-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-400',
    hoverShadow: 'hover:shadow-amber-100',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    border: 'border-rose-100',
    hoverBorder: 'hover:border-rose-400',
    hoverShadow: 'hover:shadow-rose-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-600',
    border: 'border-cyan-100',
    hoverBorder: 'hover:border-cyan-400',
    hoverShadow: 'hover:shadow-cyan-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
    hoverBorder: 'hover:border-indigo-400',
    hoverShadow: 'hover:shadow-indigo-100',
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'text-teal-600',
    border: 'border-teal-100',
    hoverBorder: 'hover:border-teal-400',
    hoverShadow: 'hover:shadow-teal-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-orange-100',
    hoverBorder: 'hover:border-orange-400',
    hoverShadow: 'hover:shadow-orange-100',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'text-sky-600',
    border: 'border-sky-100',
    hoverBorder: 'hover:border-sky-400',
    hoverShadow: 'hover:shadow-sky-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-100',
    hoverBorder: 'hover:border-green-400',
    hoverShadow: 'hover:shadow-green-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    border: 'border-violet-100',
    hoverBorder: 'hover:border-violet-400',
    hoverShadow: 'hover:shadow-violet-100',
  },
  slate: {
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-400',
    hoverShadow: 'hover:shadow-slate-100',
  },
}

// Motif batik banner — dipakai di semua header hub supaya identitas visual
// konsisten di seluruh aplikasi.
export function BatikOverlay({ patternId, strokeColor = '#d4af37', opacity = 1, size = 72 }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(8)"
        >
          <g fill="none" stroke={strokeColor} strokeWidth="1.1" opacity={opacity}>
            <ellipse cx={size / 2} cy={size * 0.333} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size / 2} cy={size * 0.667} rx={size * 0.125} ry={size * 0.194} opacity="0.55" />
            <ellipse cx={size * 0.333} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <ellipse cx={size * 0.667} cy={size / 2} rx={size * 0.194} ry={size * 0.125} opacity="0.55" />
            <circle cx={size / 2} cy={size / 2} r={size * 0.042} opacity="0.7" />
          </g>
          <path
            d={`M0 ${size} L${size * 0.25} ${size * 0.75} L${size * 0.5} ${size} L${size * 0.75} ${size * 0.75} L${size} ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.35}
          />
          <path
            d={`M0 0 L${size * 0.25} ${size * 0.25} L0 ${size * 0.5}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.8"
            opacity={opacity * 0.3}
          />
          <circle cx={size * 0.11} cy={size * 0.11} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.89} cy={size * 0.22} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
          <circle cx={size * 0.22} cy={size * 0.89} r="1.3" fill={strokeColor} opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}

// Isi satu kartu hub (ikon + judul + deskripsi + badge "Segera Hadir").
// Dipakai oleh GudangSK, PortalUjian, dan hub-hub lain berikutnya.
export function IsiKartuHub({ item, warna }) {
  const Icon = item.icon
  return (
    <>
      <div
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center mb-3 shrink-0 ${
          item.siap ? `${warna.bg} ${warna.icon}` : 'bg-slate-100 text-slate-300'
        }`}
      >
        <Icon size={20} />
      </div>
      <h3
        className={`font-display text-sm sm:text-[15px] font-semibold mb-1 leading-snug ${
          item.siap ? 'text-slate-900' : 'text-slate-300'
        }`}
      >
        {item.judul}
      </h3>
      <p
        className={`text-xs sm:text-[13px] leading-relaxed ${
          item.siap ? 'text-slate-600' : 'text-slate-300'
        }`}
      >
        {item.deskripsi}
      </p>
      {!item.siap && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
          <Lock size={10} /> Segera Hadir
        </span>
      )}
    </>
  )
}
