// src/lib/identitasInstansi.js
//
// Satu sumber identitas instansi untuk semua tenant (sekolah, kantor/KUA,
// puskesmas, polres). Dipakai SampulLaporan.jsx (dan bisa dipakai halaman cetak
// lain) supaya kop/identitas tidak lagi hard-code ke profil_sekolah.
//
// >>> Kalau ada nama tabel / bucket / kolom yang berbeda di database Anda,
// >>> cukup ubah bagian CONFIG di bawah — tidak perlu menyentuh komponen.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

// Bucket storage tempat logo disimpan, per tabel profil.
const BUCKET_LOGO = {
  profil_sekolah: 'profil-sekolah',
  profil_kantor: 'profil-kantor', // sesuaikan bila berbeda
  profil_puskesmas: 'profil-puskesmas', // sesuaikan bila berbeda
  profil_polres: 'profil-polres', // sama dengan BUCKET di ProfilPolres.jsx
}

// Daftar kolom kandidat: dipakai yang pertama kali terisi.
const KOLOM = {
  nama: ['nama_sekolah', 'nama_kantor', 'nama_puskesmas', 'nama_satuan', 'nama_instansi', 'nama'],
  kode: ['npsn', 'kode_puskesmas', 'nsm', 'kode'],
  polda: ['polda'],
  alamat: ['alamat', 'alamat_jalan', 'alamat_lengkap'],
  desa: ['desa_kelurahan', 'desa', 'kelurahan'],
  kecamatan: ['kecamatan'],
  kabupaten: ['kabupaten', 'kabupaten_kota', 'kota'],
  provinsi: ['provinsi'],
  kodePos: ['kode_pos'],
  email: ['email', 'website'],
  pimpinan: ['kepala_sekolah', 'kepala_kantor', 'kepala_puskesmas', 'kapolres', 'pimpinan', 'nama_kepala'],
  namaBank: ['nama_bank', 'bank'],
  nomorRekening: ['nomor_rekening', 'no_rekening'],
  logo: ['logo_path', 'logo'],
}

function ambil(row, kandidat) {
  if (!row) return ''
  for (const k of kandidat) {
    const v = row[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

const kopPemerintah = (jenisWilayah, kab) =>
  `PEMERINTAH ${jenisWilayah.toUpperCase()}${kab ? ` ${kab.toUpperCase()}` : ''}`

export const CONFIG_INSTANSI = {
  sekolah: {
    tabel: ['profil_sekolah'],
    labelInstansi: 'Sekolah',
    labelNama: 'Nama Sekolah',
    labelKode: 'NPSN',
    kopAtas: kopPemerintah,
    namaDinas: () => 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    // Harus sama dengan JENIS_LAPORAN_PRESET di SampulLaporan.jsx
    jenisLaporan: [
      'Laporan Bulanan',
      'Laporan Semester',
      'Laporan Hasil Ujian',
      'Daftar Calon Peserta Ujian (8355)',
      'Laporan Pertanggungjawaban (LPJ) Penggunaan Dana BOS',
      'Laporan Keuangan (BKU)',
      'Laporan Inventaris Sarana & Prasarana',
      'Laporan Kegiatan Sekolah',
      'Lainnya (isi bebas)',
    ],
  },
  kantor: {
    // Dicoba berurutan: profil_kantor dulu, lalu profil_sekolah bila kantor
    // masih memakai tabel yang sama.
    tabel: ['profil_kantor', 'profil_sekolah'],
    labelInstansi: 'Kantor',
    labelNama: 'Nama Kantor',
    labelKode: null,
    kopAtas: () => 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    namaDinas: (i) => `KANTOR KEMENTERIAN AGAMA${i.kabupaten ? ` KABUPATEN ${i.kabupaten.toUpperCase()}` : ''}`,
    jenisLaporan: [
      'Laporan Bulanan',
      'Laporan Tahunan',
      'Laporan Keuangan',
      'Laporan Inventaris & Aset Kantor',
      'Laporan Kegiatan Kantor',
      'Lainnya (isi bebas)',
    ],
  },
  puskesmas: {
    tabel: ['profil_puskesmas'], // datanya diambil dari AuthContext (profilPuskesmas)
    labelInstansi: 'Puskesmas',
    labelNama: 'Nama Puskesmas',
    labelKode: 'Kode Puskesmas',
    kopAtas: kopPemerintah,
    namaDinas: () => 'DINAS KESEHATAN',
    jenisLaporan: [
      'Laporan Bulanan',
      'Laporan Tahunan',
      'Laporan Keuangan BOK',
      'Laporan Inventaris & Aset Puskesmas',
      'Laporan Kegiatan Puskesmas',
      'Lainnya (isi bebas)',
    ],
  },
  polres: {
    tabel: ['profil_polres'], // kunci: sekolah_id (sama seperti ProfilPolres.jsx)
    labelInstansi: 'Polres',
    labelNama: 'Nama Satuan',
    labelKode: null,
    // Kop Polri: KEPOLISIAN NEGARA REPUBLIK INDONESIA / DAERAH <POLDA> / <SATUAN>
    kopAtas: () => 'KEPOLISIAN NEGARA REPUBLIK INDONESIA',
    namaDinas: (i) => {
      const polda = (i.polda || '').replace(/^polda\s+/i, '').trim()
      return polda ? `DAERAH ${polda.toUpperCase()}` : ''
    },
    jenisLaporan: [
      'Laporan Bulanan',
      'Laporan Tahunan',
      'Laporan Keuangan',
      'Laporan Inventaris & Aset Polres',
      'Laporan Kegiatan Polres',
      'Lainnya (isi bebas)',
    ],
  },
}

export function useIdentitasInstansi() {
  const { sekolahId, isKantor, isPuskesmas, isPolres, profilPuskesmas } = useAuth()
  const tenant = isKantor ? 'kantor' : isPuskesmas ? 'puskesmas' : isPolres ? 'polres' : 'sekolah'
  const cfg = CONFIG_INSTANSI[tenant]

  const [state, setState] = useState({ loading: true, error: '', row: null, tabel: null })

  useEffect(() => {
    let aktif = true

    async function muat() {
      if (!sekolahId) {
        if (aktif) setState({ loading: false, error: '', row: null, tabel: null })
        return
      }

      // Puskesmas: datanya sudah dimuat sekali di AuthContext.
      if (tenant === 'puskesmas') {
        if (profilPuskesmas === undefined) return // belum selesai dimuat
        if (aktif) setState({ loading: false, error: '', row: profilPuskesmas, tabel: 'profil_puskesmas' })
        return
      }

      if (aktif) setState((s) => ({ ...s, loading: true }))
      let errorTerakhir = ''
      for (const tabel of cfg.tabel) {
        const { data, error } = await supabase
          .from(tabel)
          .select('*')
          .eq('sekolah_id', sekolahId)
          .maybeSingle()
        if (error) {
          errorTerakhir = error.message || String(error)
          continue
        }
        if (data) {
          if (aktif) setState({ loading: false, error: '', row: data, tabel })
          return
        }
      }
      if (aktif) {
        setState({
          loading: false,
          error: errorTerakhir
            ? `Gagal memuat profil ${cfg.labelInstansi.toLowerCase()}: ${errorTerakhir}`
            : '',
          row: null,
          tabel: null,
        })
      }
    }

    muat()
    return () => {
      aktif = false
    }
  }, [sekolahId, tenant, profilPuskesmas]) // eslint-disable-line react-hooks/exhaustive-deps

  const identitas = useMemo(() => {
    const row = state.row
    const pathLogo = ambil(row, KOLOM.logo)
    let logoUrl = ''
    if (pathLogo) {
      if (pathLogo.startsWith('http')) logoUrl = pathLogo
      else {
        const { data } = supabase.storage.from(BUCKET_LOGO[state.tabel] || 'profil-sekolah').getPublicUrl(pathLogo)
        logoUrl = data?.publicUrl || ''
      }
    }
    return {
      nama: ambil(row, KOLOM.nama),
      kode: ambil(row, KOLOM.kode),
      polda: ambil(row, KOLOM.polda),
      alamat: ambil(row, KOLOM.alamat),
      desa: ambil(row, KOLOM.desa),
      kecamatan: ambil(row, KOLOM.kecamatan),
      kabupaten: ambil(row, KOLOM.kabupaten),
      provinsi: ambil(row, KOLOM.provinsi),
      kodePos: ambil(row, KOLOM.kodePos),
      email: ambil(row, KOLOM.email),
      pimpinan:
        tenant === 'polres' && ambil(row, ['kapolres'])
          ? [ambil(row, ['pangkat_kapolres']), ambil(row, ['kapolres'])].filter(Boolean).join(' ')
          : ambil(row, KOLOM.pimpinan),
      namaBank: ambil(row, KOLOM.namaBank),
      nomorRekening: ambil(row, KOLOM.nomorRekening),
      logoUrl,
    }
  }, [state.row, state.tabel, tenant])

  return { tenant, cfg, identitas, loading: state.loading, error: state.error }
}
