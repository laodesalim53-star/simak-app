// Helper untuk tab ATP/KKTP, Prota, dan Promes (src/components/rpp/PerangkatAjarTab.jsx).
// Semua perhitungan minggu efektif bersumber dari kalender yang sama dengan
// halaman Kalender Pendidikan (lib/kalenderPendidikan + tabel kalender_overrides).

import {
  BULAN,
  SEMESTER,
  toISODate,
  jumlahHariDalamBulan,
  getStatusTanggal,
} from './kalenderPendidikan'

export const JENIS = {
  atp: {
    label: 'ATP/KKTP',
    judul: 'Alur Tujuan Pembelajaran (ATP) dan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)',
  },
  prota: { label: 'Prota', judul: 'Program Tahunan (PROTA)' },
  promes: { label: 'Promes', judul: 'Program Semester (PROMES)' },
}

const ROMAWI = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }

export function angkaKelas(kelas = '') {
  const s = String(kelas).trim().toLowerCase()
  const m = s.match(/\d+/)
  if (m) return Number(m[0])
  const r = s.match(/\b(xii|xi|x|ix|viii|vii|vi|iv|v|iii|ii|i)\b/)
  return r ? ROMAWI[r[1]] : null
}

// Fase Kurikulum Merdeka: A (1-2), B (3-4), C (5-6), D (7-9), E (10), F (11-12)
export function faseDariKelas(kelas) {
  const n = angkaKelas(kelas)
  if (!n) return ''
  if (n <= 2) return 'A'
  if (n <= 4) return 'B'
  if (n <= 6) return 'C'
  if (n <= 9) return 'D'
  if (n === 10) return 'E'
  return 'F'
}

// ---------------------------------------------------------------------------
// Minggu efektif per bulan dalam satu semester.
//
// Tiap bulan dibagi jadi maksimal 5 kolom minggu (minggu ke-6 yang parsial
// digabung ke kolom 5). Hanya hari Senin..(Jumat atau Sabtu) yang dihitung
// sebagai hari belajar; hari yang punya status di kalender (libur, ujian,
// dsb.) dianggap tidak efektif.
// ---------------------------------------------------------------------------
export function hitungMinggu(semesterKey, overrides = {}, hariPerMinggu = 5) {
  const sem = semesterKey === 'Genap' ? SEMESTER.GENAP : SEMESTER.GANJIL
  return BULAN.filter((b) => sem.bulan.includes(b.key)).map((b) => {
    const total = jumlahHariDalamBulan(b.tahun, b.bulan)
    const offset = (new Date(b.tahun, b.bulan - 1, 1).getDay() + 6) % 7 // Senin = 0
    const minggu = Array.from({ length: 5 }, (_, i) => ({
      key: `${b.key}-${i + 1}`,
      no: i + 1,
      hariEfektif: 0,
      hariKalender: 0,
      alasan: new Set(),
    }))

    for (let tgl = 1; tgl <= total; tgl++) {
      const dow = new Date(b.tahun, b.bulan - 1, tgl).getDay()
      if (dow < 1 || dow > hariPerMinggu) continue
      const w = minggu[Math.min(Math.floor((tgl - 1 + offset) / 7), 4)]
      w.hariKalender += 1
      const st = getStatusTanggal(toISODate(b.tahun, b.bulan, tgl), overrides)
      if (st) w.alasan.add(st.keterangan || st.kode)
      else w.hariEfektif += 1
    }

    return {
      bulan: b,
      minggu: minggu.map((w) => ({
        key: w.key,
        no: w.no,
        hariEfektif: w.hariEfektif,
        hariKalender: w.hariKalender,
        ada: w.hariKalender > 0,
        alasan: [...w.alasan],
      })),
    }
  })
}

// JP yang bisa dipakai pada satu kolom minggu (dibagi rata menurut hari efektif).
export function kapasitasMinggu(w, jpPerMinggu, hariPerMinggu = 5) {
  if (!w.ada || w.hariEfektif <= 0) return 0
  return Math.max(1, Math.round((jpPerMinggu * w.hariEfektif) / hariPerMinggu))
}

export function kapasitasSemester(bulanData, jpPerMinggu, hariPerMinggu = 5) {
  return bulanData.reduce(
    (t, bd) => t + bd.minggu.reduce((s, w) => s + kapasitasMinggu(w, jpPerMinggu, hariPerMinggu), 0),
    0
  )
}

export function jumlahMingguEfektif(bulanData) {
  return bulanData.reduce((t, bd) => t + bd.minggu.filter((w) => w.hariEfektif > 0).length, 0)
}

// Sebar JP tiap materi berurutan ke minggu-minggu efektif.
export function distribusiPromes(rows, bulanData, jpPerMinggu, hariPerMinggu = 5) {
  const slots = []
  bulanData.forEach((bd) =>
    bd.minggu.forEach((w) => {
      const k = kapasitasMinggu(w, jpPerMinggu, hariPerMinggu)
      if (k > 0) slots.push({ key: w.key, sisa: k })
    })
  )
  let i = 0
  let melebihi = false
  const hasil = rows.map((r) => {
    let perlu = Math.max(0, Number(r.jp) || 0)
    const keys = []
    while (perlu > 0 && i < slots.length) {
      if (!keys.includes(slots[i].key)) keys.push(slots[i].key)
      const pakai = Math.min(perlu, slots[i].sisa)
      slots[i].sisa -= pakai
      perlu -= pakai
      if (slots[i].sisa <= 0) i += 1
    }
    if (perlu > 0) melebihi = true
    return { ...r, minggu: keys }
  })
  return { rows: hasil, melebihi }
}

// ---------------------------------------------------------------------------
// Baris data
// ---------------------------------------------------------------------------
export function barisKosong(jenis, semester = 'Ganjil') {
  if (jenis === 'atp') return { elemen: '', tujuan: '', materi: '', kktp: '', jp: 0, semester }
  if (jenis === 'prota') return { semester, materi: '', jp: 0 }
  return { materi: '', jp: 0, minggu: [] }
}

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))

export function normalisasiBaris(jenis, arr) {
  return (Array.isArray(arr) ? arr : []).map((r) => {
    const semester = /genap/i.test(String(r?.semester)) ? 'Genap' : 'Ganjil'
    const jp = Math.max(0, Math.round(Number(r?.jp) || 0))
    if (jenis === 'atp') {
      return {
        elemen: str(r?.elemen),
        tujuan: str(r?.tujuan),
        materi: str(r?.materi),
        kktp: str(r?.kktp),
        jp,
        semester,
      }
    }
    if (jenis === 'prota') return { semester, materi: str(r?.materi), jp }
    return { materi: str(r?.materi), jp, minggu: Array.isArray(r?.minggu) ? r.minggu : [] }
  })
}

export function jumlahJp(rows, semester) {
  return rows
    .filter((r) => !semester || r.semester === semester)
    .reduce((t, r) => t + (Number(r.jp) || 0), 0)
}
