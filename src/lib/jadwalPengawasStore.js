// src/lib/jadwalPengawasStore.js
//
// Penyimpanan bersama Jadwal Pengawas Ruang -> dipakai juga oleh Daftar Hadir
// Peserta Ujian (dan halaman lain yang butuh data pengawas per sesi).
//
// Sumber utama: tabel Supabase `jadwal_pengawas_ruang` (satu baris per sekolah,
// lihat jadwal_pengawas_ruang.sql), jadi jadwal terbaca di semua perangkat dan
// akun satu sekolah. localStorage dipakai sebagai cadangan/cache: tetap bekerja
// kalau tabel belum dibuat atau sedang offline, dan jadwal lama yang cuma ada
// di browser otomatis ikut terkirim ke Supabase saat disimpan berikutnya.

import { supabase } from './supabaseClient'

const TABEL = 'jadwal_pengawas_ruang'
const JEDA_KIRIM_MS = 800

const kunci = (sekolahId) => `jadwal-pengawas-ruang:${sekolahId}`

function bacaLokal(sekolahId) {
  try {
    const mentah = localStorage.getItem(kunci(sekolahId))
    return mentah ? JSON.parse(mentah) : null
  } catch {
    return null
  }
}

function tulisLokal(sekolahId, data) {
  try {
    localStorage.setItem(kunci(sekolahId), JSON.stringify(data))
  } catch (e) {
    console.warn('Jadwal pengawas tidak dapat disimpan di browser:', e)
  }
}

// Simpan: cadangan lokal langsung, kirim ke Supabase ditunda sebentar
// (supaya tidak menembak server tiap ketikan). Aman dipanggil berulang.
const timer = {}
export function simpanJadwalPengawas(sekolahId, data) {
  if (!sekolahId) return
  tulisLokal(sekolahId, data)
  clearTimeout(timer[sekolahId])
  timer[sekolahId] = setTimeout(async () => {
    try {
      const { error } = await supabase
        .from(TABEL)
        .upsert({ sekolah_id: sekolahId, data }, { onConflict: 'sekolah_id' })
      if (error) throw error
    } catch (e) {
      console.warn('Jadwal pengawas belum terkirim ke server (tersimpan di browser):', e?.message || e)
    }
  }, JEDA_KIRIM_MS)
}

// Muat (async): utamakan Supabase, cadangkan ke lokal; kalau kosong/gagal pakai lokal.
export async function muatJadwalPengawas(sekolahId) {
  if (!sekolahId) return null
  try {
    const { data, error } = await supabase
      .from(TABEL)
      .select('data')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
    if (error) throw error
    if (data?.data && Object.keys(data.data).length > 0) {
      tulisLokal(sekolahId, data.data)
      return data.data
    }
  } catch (e) {
    console.warn('Jadwal pengawas dibaca dari browser (server belum bisa dibaca):', e?.message || e)
  }
  return bacaLokal(sekolahId)
}

// Ratakan jadwal tersimpan menjadi daftar sesi, tiap sesi sudah memuat id guru
// pengawas 1 & 2 (bukan id baris pengawas), siap dipakai halaman lain.
export function ratakanSesiJadwal(data) {
  if (!data || !Array.isArray(data.hari)) return []
  const guruPerBaris = {}
  ;(data.pengawas || []).forEach((p) => { guruPerBaris[p.id] = p.guruId || '' })
  const hasil = []
  data.hari.forEach((h) => {
    ;(h.sesi || []).forEach((s) => {
      hasil.push({
        key: `${h.id}:${s.id}`,
        tanggal: h.tanggal || '',
        ruang: h.ruang || '',
        waktu: s.waktu || '',
        mapel: s.mapel || '',
        guru1Id: guruPerBaris[s.p1] || '',
        guru2Id: guruPerBaris[s.p2] || '',
      })
    })
  })
  return hasil
}
