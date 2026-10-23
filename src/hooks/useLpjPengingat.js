import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Selisih hari antara hari ini dan tanggal batas ('YYYY-MM-DD', zona waktu lokal)
export function sisaHari(tanggalBatas) {
  const [y, m, d] = tanggalBatas.split('-').map(Number)
  const hariIni = new Date()
  hariIni.setHours(0, 0, 0, 0)
  return Math.round((new Date(y, m - 1, d) - hariIni) / 86400000)
}

// Mengembalikan daftar LPJ yang perlu diingatkan (belum terkirim, <= 14 hari / terlambat).
// Dipakai oleh lonceng notifikasi di Layout. Hanya untuk admin.
export default function useLpjPengingat() {
  const { profil, isAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id
  const [daftar, setDaftar] = useState([])

  const muat = useCallback(async () => {
    if (!sekolahId || !isAdmin) {
      setDaftar([])
      return
    }
    const { data } = await supabase
      .from('lpj_jadwal')
      .select('id, judul, periode, tanggal_batas, status')
      .eq('sekolah_id', sekolahId)
      .neq('status', 'terkirim')
      .order('tanggal_batas', { ascending: true })

    const hasil = (data || [])
      .map((j) => ({ ...j, sisa: sisaHari(j.tanggal_batas) }))
      .filter((j) => j.sisa <= 14)
      .map((j) => ({
        id: j.id,
        judul: `${j.judul}${j.periode ? ` — ${j.periode}` : ''}`,
        deskripsi:
          j.sisa < 0 ? `Terlambat ${Math.abs(j.sisa)} hari. Segera selesaikan LPJ.`
          : j.sisa === 0 ? 'Batas penyerahan LPJ adalah hari ini.'
          : `Batas penyerahan ${j.sisa} hari lagi.`,
        sisa: j.sisa,
        urgent: j.sisa <= 3,
      }))
    setDaftar(hasil)
  }, [sekolahId, isAdmin])

  useEffect(() => {
    muat()
    // segarkan tiap 30 menit & saat jadwal diubah dari komponen LpjReminder
    const timer = setInterval(muat, 30 * 60 * 1000)
    window.addEventListener('lpj-berubah', muat)
    return () => {
      clearInterval(timer)
      window.removeEventListener('lpj-berubah', muat)
    }
  }, [muat])

  return daftar
}
