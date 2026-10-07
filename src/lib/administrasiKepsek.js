// src/lib/administrasiKepsek.js
//
// Pembantu bersama untuk halaman Administrasi Kepala Sekolah:
//   - BukuKerjaKepsek.jsx, SupervisiAkademik.jsx, KinerjaTendik.jsx
//
// Isi:
//   useDataSekolah(sekolahId)   -> profil sekolah (kop, logo, Kepala Sekolah) + daftar guru
//                                  dari tabel `guru` (difilter sekolah_id)
//   useDokumenTersimpan(...)    -> simpan / muat satu dokumen (jsonb) ke tabel
//                                  `administrasi_kepsek_tersimpan`, lengkap dengan penanda
//                                  "ada perubahan belum disimpan"
//   pembantu baris guru         -> tarik, tambah, dan segarkan baris dari data guru
//
// Tabel yang dibutuhkan: lihat SQL di akhir jawaban / bagian bawah file ini.

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { SEKOLAH_KOSONG, ambilProfilSekolah } from '../components/CetakSK'

export const TABEL_DOKUMEN = 'administrasi_kepsek_tersimpan'

// ---------- Pembantu umum ----------

export function tanggalPanjang(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function labelWaktu(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

// Angka 1 desimal dengan koma: 83.333 -> "83,3"
export function fmt1(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return ''
  return String(Math.round(x * 10) / 10).replace('.', ',')
}

// Cari nilai teks pertama dari objek berdasarkan pola nama kolom. Kolom berakhiran _id
// dan nilai yang berbentuk UUID dilewati supaya tidak tampil sebagai "nama".
export function cariKolomTeks(obj, pola) {
  const hit = Object.entries(obj || {}).find(
    ([k, v]) =>
      pola.test(k) &&
      !/(^|_)id$/i.test(k) &&
      v !== null &&
      v !== undefined &&
      typeof v !== 'object' &&
      String(v).trim() !== '' &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(v))
  )
  return hit ? String(hit[1]).trim() : ''
}

function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// ---------- Data guru ----------

// Bentuk seragam satu guru / tenaga kependidikan dari baris tabel `guru`. Nama kolom dicari
// bertahap (tidak bergantung pada nama persis); semua hasil tetap bisa diedit di halaman.
export function petaGuru(g) {
  return {
    id: g.id,
    nama: String(g.nama_lengkap || g.nama || cariKolomTeks(g, /^nama/i) || '').trim(),
    nip: String(g.nip || cariKolomTeks(g, /(^|_)nip($|_)/i) || '').trim(),
    gol: cariKolomTeks(g, /golongan|pangkat|(^|_)gol($|_)/i),
    jabatan: cariKolomTeks(g, /jabatan|jenis_ptk|jenis_guru|tugas/i),
    mapel: cariKolomTeks(g, /mapel|mata_pelajaran|bidang_studi/i),
    kelas: cariKolomTeks(g, /kelas|wali_kelas|mengajar/i),
  }
}

// Tenaga kependidikan = jabatan memuat kata-kata berikut. Kalau kolom jabatan di tabel guru
// tidak ada / tidak terisi, hasilnya kosong dan pengguna memilih manual lewat daftar.
const POLA_TENDIK =
  /operator|tata usaha|\btu\b|penjaga|pustakawan|laboran|tenaga kependidikan|tendik|staf|staff|satpam|keamanan|kebersihan|cleaning|bendahara|administrasi/i

export function adalahTendik(g) {
  return POLA_TENDIK.test(`${g.jabatan || ''}`)
}

export const urutNama = (a, b) => String(a.nama).localeCompare(String(b.nama), 'id')

// Tambahkan baris untuk guru yang belum ada di tabel. `buat(g)` membentuk satu baris baru.
// Baris dikenali lewat `uid` (= id guru).
export function gabungkanGuru(rows, daftar, buat) {
  const sudah = new Set(rows.map((r) => String(r.uid)))
  const baru = daftar.filter((g) => !sudah.has(String(g.id))).map(buat)
  return { rows: [...rows, ...baru], jumlahBaru: baru.length }
}

// Perbarui identitas (nama, NIP, golongan, jabatan) baris dari data guru terbaru, tanpa
// menyentuh nilai/isian lain. Mapel & kelas hanya diisi kalau di baris masih kosong.
export function segarkanIdentitas(rows, guruList) {
  const peta = new Map(guruList.map((g) => [String(g.id), g]))
  return rows.map((r) => {
    const g = peta.get(String(r.uid))
    if (!g) return r
    return {
      ...r,
      nama: g.nama || r.nama,
      nip: g.nip || r.nip,
      gol: g.gol || r.gol,
      jabatan: g.jabatan || r.jabatan,
      ...('mapel' in r ? { mapel: r.mapel || g.mapel } : {}),
      ...('kelas' in r ? { kelas: r.kelas || g.kelas } : {}),
    }
  })
}

// ---------- Pengubah isian tabel (dipakai semua halaman) ----------

// <input onChange={ubahBaris(setData, 'jurnal', i, 'kegiatan')} />
export const ubahBaris = (setData, kunci, i, k) => (e) => {
  const v = e.target.value
  setData((d) => ({ ...d, [kunci]: d[kunci].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))
}

export const tambahBaris = (setData, kunci, barisBaru) =>
  setData((d) => ({ ...d, [kunci]: [...d[kunci], barisBaru] }))

export const hapusBarisTerakhir = (setData, kunci) =>
  setData((d) => ({ ...d, [kunci]: d[kunci].length > 1 ? d[kunci].slice(0, -1) : d[kunci] }))

// ---------- Hook: data sekolah & guru ----------

const INFO_KOSONG = {
  sekolah: SEKOLAH_KOSONG,
  kabupaten: '',
  dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  kecamatan: '',
  alamat: '',
  kepalaNama: '',
  kepalaNip: '',
  tempat: '',
  logoSekolahUrl: '',
  logoKabupatenUrl: '',
}

export function useDataSekolah(sekolahId) {
  const [info, setInfo] = useState(INFO_KOSONG)
  const [guruList, setGuruList] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, profRes, guruRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
        supabase.from('guru').select('*').eq('sekolah_id', sekolahId),
      ])
      const prof = profRes?.data || {}
      const s = ps.sekolah || {}
      const barisGuru = guruRes.error ? [] : guruRes.data || []

      // Kepala Sekolah dicari di SEMUA kolom teks tabel guru (nama kolom jabatan bisa berbeda-beda).
      const barisKepsek = barisGuru.find((r) =>
        Object.values(r).some((v) => typeof v === 'string' && /^kepala\s+(sekolah|madrasah)$|^kepsek$/i.test(v.trim()))
      )
      const kepsek = barisKepsek ? petaGuru(barisKepsek) : null

      setInfo({
        sekolah: s,
        kabupaten: prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || INFO_KOSONG.dinas,
        kecamatan: prof.kecamatan || '',
        alamat: prof.alamat || '',
        kepalaNama:
          prof.kepala_sekolah || s.kepala_sekolah || s.nama_kepala_sekolah || s.kepala || kepsek?.nama || '',
        kepalaNip:
          prof.nip_kepala_sekolah ||
          cariKolomTeks(prof, /nip.*(kepala|kepsek)|(kepala|kepsek).*nip/i) ||
          s.nip_kepala_sekolah ||
          s.nip_kepala ||
          s.nip_kepsek ||
          kepsek?.nip ||
          '',
        tempat: prof.tempat_ttd || '',
        logoSekolahUrl: urlLogo(prof.logo_path),
        logoKabupatenUrl: urlLogo(prof.logo_kabupaten_path),
      })
      if (guruRes.error) {
        setGuruList([])
        setGalat(`Data guru belum bisa dibaca (${guruRes.error.message || 'galat tidak diketahui'}).`)
      } else {
        setGuruList(barisGuru.map(petaGuru).filter((g) => g.nama).sort(urutNama))
      }
    } catch (e) {
      console.error('Gagal memuat data sekolah/guru:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  return { info, guruList, memuat, galat, muatUlang: muat }
}

// ---------- Hook: simpan / muat dokumen ----------

function pesanGalatSimpan(e, aksi) {
  const m = String(e?.message || '')
  const kata = aksi === 'memuat' ? 'dimuat' : 'disimpan'
  if (e?.code === '42P01' || /does not exist|schema cache|could not find the table/i.test(m)) {
    return `Tabel ${TABEL_DOKUMEN} belum ada di Supabase, jadi data belum bisa ${kata}. Jalankan SQL pembuatan tabelnya lalu muat ulang halaman.`
  }
  if (/row-level security/i.test(m)) {
    return `Data belum bisa ${kata}: izin (RLS) tabel ${TABEL_DOKUMEN} belum diatur untuk akun ini.`
  }
  return `Data belum bisa ${kata} (${m || 'galat tidak diketahui'}).`
}

// buatBawaan: fungsi yang mengembalikan isi awal dokumen (objek). Data tersimpan digabung
// di atas isi awal, jadi kolom baru yang ditambahkan di kode kelak tetap punya nilai awal.
export function useDokumenTersimpan({ sekolahId, dokumen, buatBawaan }) {
  const [data, setData] = useState(buatBawaan)
  const [memuat, setMemuat] = useState(true)
  const [adaTersimpan, setAdaTersimpan] = useState(false)
  const [snap, setSnap] = useState(null)
  const [waktu, setWaktu] = useState(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState(null)

  useEffect(() => {
    if (!sekolahId) return undefined
    let batal = false
    ;(async () => {
      setMemuat(true)
      try {
        const { data: baris, error } = await supabase
          .from(TABEL_DOKUMEN)
          .select('data, updated_at')
          .eq('sekolah_id', sekolahId)
          .eq('dokumen', dokumen)
          .maybeSingle()
        if (error) throw error
        if (batal) return
        if (baris) {
          const tersimpan = baris.data && typeof baris.data === 'object' ? baris.data : {}
          const gabung = { ...buatBawaan(), ...tersimpan }
          setData(gabung)
          setSnap(JSON.stringify(gabung))
          setWaktu(baris.updated_at)
          setAdaTersimpan(true)
        } else {
          setSnap(null)
          setAdaTersimpan(false)
        }
      } catch (e) {
        console.error(`Gagal memuat dokumen ${dokumen}:`, e)
        if (!batal) setPesan({ tipe: 'galat', teks: pesanGalatSimpan(e, 'memuat') })
      } finally {
        if (!batal) setMemuat(false)
      }
    })()
    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, dokumen])

  const json = useMemo(() => JSON.stringify(data), [data])
  const status = snap === null ? 'belum' : json !== snap ? 'berubah' : 'tersimpan'

  // Peringatan bila halaman ditutup padahal ada perubahan pada dokumen yang sudah tersimpan.
  useEffect(() => {
    if (status !== 'berubah') return undefined
    const tahan = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', tahan)
    return () => window.removeEventListener('beforeunload', tahan)
  }, [status])

  async function simpan() {
    if (!sekolahId) {
      setPesan({ tipe: 'galat', teks: 'Data sekolah belum terbaca, belum bisa menyimpan.' })
      return
    }
    setMenyimpan(true)
    setPesan(null)
    const jsonSaatSimpan = json
    try {
      const sekarang = new Date().toISOString()
      const { error } = await supabase
        .from(TABEL_DOKUMEN)
        .upsert(
          { sekolah_id: sekolahId, dokumen, data, updated_at: sekarang },
          { onConflict: 'sekolah_id,dokumen' }
        )
      if (error) throw error
      setSnap(jsonSaatSimpan)
      setWaktu(sekarang)
      setAdaTersimpan(true)
      setPesan({ tipe: 'ok', teks: 'Berhasil disimpan.' })
    } catch (e) {
      console.error(`Gagal menyimpan dokumen ${dokumen}:`, e)
      setPesan({ tipe: 'galat', teks: pesanGalatSimpan(e, 'menyimpan') })
    } finally {
      setMenyimpan(false)
    }
  }

  return { data, setData, memuat, adaTersimpan, status, waktu, menyimpan, pesan, simpan }
}

// ---------- SQL (jalankan sekali di Supabase SQL Editor) ----------
//
// create table if not exists public.administrasi_kepsek_tersimpan (
//   id uuid primary key default gen_random_uuid(),
//   sekolah_id uuid not null,        -- samakan tipenya dengan laporan_asesmen_tersimpan / my_sekolah_id()
//   dokumen text not null,           -- 'buku-kerja' | 'supervisi-akademik' | 'kinerja-tendik'
//   data jsonb not null default '{}'::jsonb,
//   updated_at timestamptz not null default now(),
//   unique (sekolah_id, dokumen)
// );
// alter table public.administrasi_kepsek_tersimpan enable row level security;
//
// create policy "adm_kepsek_baca" on public.administrasi_kepsek_tersimpan
//   for select to authenticated
//   using (sekolah_id = my_sekolah_id() or is_superadmin());
// create policy "adm_kepsek_tambah" on public.administrasi_kepsek_tersimpan
//   for insert to authenticated
//   with check ((is_admin_or_kepsek() and sekolah_id = my_sekolah_id()) or is_superadmin());
// create policy "adm_kepsek_ubah" on public.administrasi_kepsek_tersimpan
//   for update to authenticated
//   using ((is_admin_or_kepsek() and sekolah_id = my_sekolah_id()) or is_superadmin())
//   with check ((is_admin_or_kepsek() and sekolah_id = my_sekolah_id()) or is_superadmin());
// create policy "adm_kepsek_hapus" on public.administrasi_kepsek_tersimpan
//   for delete to authenticated
//   using (is_superadmin());
