// src/components/AdministrasiKepsekIsian.jsx
//
// Tambahan untuk AdministrasiKepsekKomponen.jsx, dipakai BukuKerjaKepsek, SupervisiAkademik,
// dan KinerjaTendik: sel isian, panel "tarik dari data guru", isian tempat/tanggal TTD,
// hook tarik otomatis, dan hitung nilai.

import { useEffect, useRef } from 'react'
import { RefreshCw, UserPlus } from 'lucide-react'
import { gabungkanGuru } from '../lib/administrasiKepsek'
import { tombolKecil } from './AdministrasiKepsekKomponen'

// Sel isian dalam tabel. Tanpa `children` = <input>; `area` = <textarea>; `children` = <select>.
export function Isian({ value, onChange, area = false, kiri = false, type = 'text', placeholder = '', className = '', children, ...rest }) {
  const kelas = `sel-input ${kiri ? 'sel-kiri' : ''} ${className}`
  if (children) {
    return (
      <select value={value ?? ''} onChange={onChange} className={kelas} {...rest}>
        {children}
      </select>
    )
  }
  if (area) {
    return (
      <textarea
        rows={2}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={kelas}
        style={{ fieldSizing: 'content' }}
        {...rest}
      />
    )
  }
  return <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} className={kelas} {...rest} />
}

// Panel di atas tabel: berapa guru di data, berapa yang belum masuk tabel, dan tombol aksinya.
export function BilahGuru({ daftar, rows, onTambah, onSegarkan, onMuatUlang, galat, memuat, satuan = 'guru' }) {
  const sudah = new Set(rows.map((r) => String(r.uid)))
  const belum = daftar.filter((g) => !sudah.has(String(g.id))).length
  return (
    <div className="no-print mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">
          {memuat
            ? 'Membaca data guru…'
            : `${daftar.length} ${satuan} terbaca dari data guru; ${belum} belum masuk tabel.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${tombolKecil} inline-flex items-center gap-1`} disabled={memuat || belum === 0} onClick={onTambah}>
            <UserPlus size={13} /> Tambah {belum > 0 ? `${belum} ` : ''}{satuan} baru
          </button>
          <button type="button" className={`${tombolKecil} inline-flex items-center gap-1`} disabled={memuat || rows.length === 0} onClick={onSegarkan}>
            <RefreshCw size={13} /> Segarkan nama, NIP, golongan
          </button>
          <button type="button" className={tombolKecil} disabled={memuat} onClick={onMuatUlang}>
            Muat ulang data guru
          </button>
        </div>
      </div>
      {galat && <p className="mt-2 text-xs text-amber-700">{galat}</p>}
    </div>
  )
}

// Isian tempat dan tanggal tanda tangan (tidak ikut dicetak).
export function IsianTtd({ tempat, tanggal, onTempat, onTanggal, tempatBawaan }) {
  return (
    <div className="no-print mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
      <label className="flex flex-col gap-1">
        Tempat tanda tangan
        <input
          value={tempat}
          onChange={(e) => onTempat(e.target.value)}
          placeholder={tempatBawaan || 'mis. Dobo'}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        Tanggal
        <input
          type="date"
          value={tanggal}
          onChange={(e) => onTanggal(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
      </label>
    </div>
  )
}

// Saat dokumen belum pernah disimpan, isi tabel otomatis dari data guru (satu kali).
export function useTarikOtomatis({ siap, adaTersimpan, daftar, setData, kunci, buat }) {
  const sudah = useRef(false)
  useEffect(() => {
    if (!siap || adaTersimpan || sudah.current || daftar.length === 0) return
    sudah.current = true
    setData((d) => ({ ...d, [kunci]: gabungkanGuru(d[kunci] || [], daftar, buat).rows }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, adaTersimpan, daftar])
}

// Skor 1-4 -> nilai 0-100 (rata-rata dari butir yang terisi). null jika belum ada yang diisi.
export function hitungNilai(skorList, maks = 4) {
  const isiSkor = skorList.map((s) => Number(s)).filter((s) => s >= 1 && s <= maks)
  if (isiSkor.length === 0) return null
  return (isiSkor.reduce((a, b) => a + b, 0) / (isiSkor.length * maks)) * 100
}

export function kategoriNilai(n) {
  if (n === null || n === undefined) return ''
  if (n >= 90) return 'Sangat Baik'
  if (n >= 75) return 'Baik'
  if (n >= 60) return 'Cukup'
  return 'Kurang'
}

// Hapus satu baris tertentu (kolom "Hapus" di tabel yang barisnya berasal dari data guru).
export const hapusBarisKe = (setData, kunci, i) =>
  setData((d) => ({ ...d, [kunci]: d[kunci].filter((_, j) => j !== i) }))
