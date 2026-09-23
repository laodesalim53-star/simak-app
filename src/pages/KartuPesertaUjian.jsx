// src/pages/KartuPesertaUjian.jsx
//
// Gabungan:
// - TEMPLATE kartu (model panjang/potret) dari versi React yang sudah disetujui.
// - LOGIKA pengambilan data (Supabase, profil sekolah, filter Kelas 6, peserta
//   yang sudah punya No. Peserta Ujian, filter ruang) dari versi sebelumnya.
//
// CATATAN SKEMA:
// - "No. Induk" di kartu diambil dari kolom `nisn` di tabel siswa.
// - Ruang ujian diambil dari kolom `ruang_ujian` di tabel siswa. Kalau kolom
//   ini belum ada:
//     alter table siswa add column ruang_ujian text;
//   Selama kolom ini kosong, kartu menampilkan "-" pada Ruang Ujian dan siswa
//   itu tidak muncul di filter dropdown ruang.
//
// PERUBAHAN UKURAN (tinggi kartu berkurang sekitar 2,5 cm / 94 px):
//   - baris "Sekolah Asal" dihapus (sudah ada di header)       -32 px
//   - baris "Tahun Pelajaran" di header dihapus (sudah ada di
//     badge TP)                                                -16 px
//   - garis pemisah my-5 -> my-3                                -16 px
//   - padding header pt-5/pb-4 -> pt-4/pb-3                      -8 px
//   - padding body py-5 -> py-4                                  -8 px
//   - jarak antarbaris data gap-3 -> gap-2                       -8 px
//   - jarak tempat/tanggal ke nama kepsek mb-6 -> mb-4           -5 px
//   Lebar kartu tidak berubah (max 340 px).

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { GraduationCap, Loader2, Printer, User } from 'lucide-react'

// Kelas 6 bisa ditulis dengan angka ("6A", "Kelas 6") atau angka Romawi
// ("VIA", "Kelas VI"), jadi kecocokan dicek dari kedua kemungkinan itu.
function isKelas6(namaKelas) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false
  if (/^6\b/.test(nama)) return true
  if (/KELAS\s*6\b/.test(nama)) return true
  if (/^VI([^I]|$)/.test(nama)) return true
  if (/KELAS\s*VI([^I]|$)/.test(nama)) return true
  return false
}

// Hanya siswa yang No. Peserta Ujian-nya sudah terisi yang dianggap "peserta"
// resmi dan boleh dicetak kartunya.
function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
}

function formatTanggalIndonesia(tanggalIso) {
  if (!tanggalIso) return '-'
  const d = new Date(tanggalIso)
  if (Number.isNaN(d.getTime())) return tanggalIso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Tahun pelajaran tidak disimpan di tabel profil_sekolah, jadi dihitung
// otomatis dari tanggal hari ini. Asumsi: tahun ajaran baru dimulai bulan Juli
// (Juli-Des = tahun ini/tahun depan, Jan-Jun = tahun lalu/tahun ini).
function tahunAjaranBerjalan() {
  const sekarang = new Date()
  const tahun = sekarang.getFullYear()
  const bulan = sekarang.getMonth() + 1
  return bulan >= 7 ? `${tahun}/${tahun + 1}` : `${tahun - 1}/${tahun}`
}

// Menggabungkan `tempat_ttd` dari profil sekolah dengan tanggal hari ini,
// mis. "Masidang, 30 Juni 2026".
function formatTempatTanggalHariIni(tempat) {
  if (!tempat) return null
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${tempat}, ${tanggal}`
}

// Identitas sekolah default — fallback kalau tabel/kolom profil sekolah belum
// ada di database, atau datanya masih kosong. Begitu profil sekolah tersambung
// (lihat muatProfilSekolah), nilai-nilai ini otomatis ditimpa data asli.
const IDENTITAS_SEKOLAH_DEFAULT = {
  namaSekolah: 'SD Negeri Waria',
  tapel: tahunAjaranBerjalan(),
  tempatTanggal: 'Waria, 5 Mei 2025',
  kepalaSekolah: 'La Ode Salim, S.Pd',
}

// QR code lewat layanan publik QR Server (tanpa dependensi tambahan).
// Untuk versi offline: `npm install qrcode.react` lalu ganti jadi
// <QRCodeSVG value={qrValue} size={60} />.
function QRImg({ value, size = 60 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 3}x${size * 3}&data=${encodeURIComponent(value)}`
  return <img src={src} alt="QR peserta" width={size} height={size} style={{ display: 'block' }} />
}

function KartuUjian({ siswa, sekolah }) {
  const qrValue = `PESERTA:${siswa.noPeserta}|NAMA:${siswa.nama}|SEKOLAH:${sekolah.namaSekolah}`

  return (
    <div className="kartu-ujian w-full max-w-[340px] rounded-[22px] border border-teal-900/10 bg-white shadow-lg shadow-teal-900/10 overflow-hidden relative">
      <div
        className="h-1.5 w-full"
        style={{ backgroundImage: 'linear-gradient(90deg, #0f6e5e 0%, #0f6e5e 65%, #e8a33d 65%, #e8a33d 100%)' }}
      />

      {/* Header */}
      <div className="relative px-5 pt-4 pb-3 text-white bg-gradient-to-br from-[#0a4a40] to-[#0f6e5e]">
        <span className="absolute top-4 right-5 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
          TP {sekolah.tapel}
        </span>
        <div className="flex items-center gap-3 pr-16">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-wide text-white/70">Kartu Peserta</p>
            <p className="font-display text-[17px] font-bold leading-tight">Asesmen {sekolah.namaSekolah}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[110px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <User size={44} className="text-slate-300" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10.5px] tracking-wide text-slate-500">Nama Peserta</p>
            <p className="font-display text-[18px] font-bold leading-snug mb-2.5">{siswa.nama}</p>
            <div className="inline-flex items-baseline gap-1.5 rounded-[9px] border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="font-display text-[15px] font-bold text-teal-700">{siswa.ruangUjian || '-'}</span>
              <span className="text-[10.5px] text-slate-500">Ruang Ujian</span>
            </div>
          </div>
        </div>

        <div className="my-3 h-px bg-slate-200" />

        <div className="flex flex-col gap-2">
          <Baris label="No. Peserta" nilai={siswa.noPeserta} />
          <Baris label="No. Induk" nilai={siswa.noInduk || '-'} />
          <Baris label="Tanggal Lahir" nilai={siswa.tanggalLahir} />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="text-[11.5px] leading-relaxed text-slate-500">
            <p className="mb-4">{sekolah.tempatTanggal}</p>
            <p className="font-semibold text-slate-900">{sekolah.kepalaSekolah}</p>
            <p className="text-[11px] text-slate-500">Kepala Sekolah</p>
          </div>
          <div className="shrink-0 rounded-[10px] border border-slate-200 bg-white p-1.5">
            <QRImg value={qrValue} size={60} />
          </div>
        </div>
      </div>

      <div
        className="h-2.5 w-full opacity-90"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #0f6e5e 0 16px, #e8a33d 16px 32px)' }}
      />
    </div>
  )
}

function Baris({ label, nilai }) {
  return (
    <div className="grid grid-cols-[118px_1fr] items-baseline gap-2.5">
      <span className="text-[11.5px] text-slate-500">{label}</span>
      <span className="text-[13.5px] font-semibold text-slate-900">{nilai}</span>
    </div>
  )
}

export default function KartuPesertaUjian() {
  const { profil, isAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [loading, setLoading] = useState(true)
  const [siswaList, setSiswaList] = useState([])
  const [jumlahKelas6, setJumlahKelas6] = useState(0)
  const [ruangFilter, setRuangFilter] = useState('semua')
  const [identitasSekolah, setIdentitasSekolah] = useState(IDENTITAS_SEKOLAH_DEFAULT)

  useEffect(() => {
    if (isAdmin) {
      muatData()
      muatProfilSekolah()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, isAdmin])

  // Profil sekolah disimpan di tabel `profil_sekolah`, satu baris per
  // `sekolah_id`, dengan kolom (antara lain) nama_sekolah, kepala_sekolah,
  // nip_kepala_sekolah, tempat_ttd.
  //
  // Tidak ada kolom "tahun pelajaran" di profil_sekolah, jadi badge "TP" di
  // kartu dihitung otomatis lewat tahunAjaranBerjalan().
  //
  // Kalau baris profil_sekolah belum ada / gagal dimuat, otomatis balik ke
  // IDENTITAS_SEKOLAH_DEFAULT supaya kartu tetap bisa dicetak.
  async function muatProfilSekolah() {
    if (!sekolahId) return
    try {
      const { data, error } = await supabase
        .from('profil_sekolah')
        .select('nama_sekolah, kepala_sekolah, nip_kepala_sekolah, tempat_ttd')
        .eq('sekolah_id', sekolahId)
        .maybeSingle()

      if (error || !data) {
        console.warn('Profil sekolah belum tersedia, memakai identitas default:', error?.message)
        return
      }

      setIdentitasSekolah({
        namaSekolah: data.nama_sekolah || IDENTITAS_SEKOLAH_DEFAULT.namaSekolah,
        tapel: tahunAjaranBerjalan(),
        tempatTanggal: formatTempatTanggalHariIni(data.tempat_ttd) || IDENTITAS_SEKOLAH_DEFAULT.tempatTanggal,
        kepalaSekolah: data.kepala_sekolah || IDENTITAS_SEKOLAH_DEFAULT.kepalaSekolah,
      })
    } catch (err) {
      console.warn('Gagal memuat profil sekolah, memakai identitas default:', err)
    }
  }

  async function muatData() {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)

    // Ambil semua siswa sekolah (join kelas), filter Kelas 6 di sisi client
    // (supaya kelas dengan penamaan Romawi ikut kena), lalu filter lagi hanya
    // yang sudah punya No. Peserta Ujian.
    const { data, error } = await supabase
      .from('siswa')
      .select('id, nama_lengkap, nisn, tanggal_lahir, no_peserta_ujian, ruang_ujian, kelas(nama_kelas)')
      .eq('sekolah_id', sekolahId)
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat siswa peserta ujian:', error)
      setSiswaList([])
      setJumlahKelas6(0)
      setLoading(false)
      return
    }

    const kelas6 = (data || []).filter((s) => isKelas6(s.kelas?.nama_kelas))
    setJumlahKelas6(kelas6.length)

    const peserta = kelas6.filter(sudahTerdaftarPeserta).map((s) => ({
      id: s.id,
      nama: s.nama_lengkap,
      noPeserta: s.no_peserta_ujian,
      noInduk: s.nisn,
      tanggalLahir: formatTanggalIndonesia(s.tanggal_lahir),
      ruangUjian: s.ruang_ujian,
    }))

    setSiswaList(peserta)
    setLoading(false)
  }

  const daftarRuang = useMemo(
    () => ['semua', ...new Set(siswaList.map((s) => s.ruangUjian).filter(Boolean))],
    [siswaList]
  )

  const siswaTampil = useMemo(
    () => (ruangFilter === 'semua' ? siswaList : siswaList.filter((s) => s.ruangUjian === ruangFilter)),
    [siswaList, ruangFilter]
  )

  const jumlahBelumTerdaftar = jumlahKelas6 - siswaList.length

  if (!isAdmin) {
    return (
      <Layout title="Kartu Peserta Ujian" subtitle="Cetak kartu peserta untuk setiap siswa, per ruang ujian.">
        <div className="card p-6 text-center text-sm text-ink-700/60">
          Halaman ini khusus untuk Admin, Admin Utama, dan Superadmin.
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout title="Kartu Peserta Ujian" subtitle="Cetak kartu peserta untuk setiap siswa, per ruang ujian.">
        <p className="text-center py-8 text-ink-700/50 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Memuat data peserta ujian Kelas 6...
        </p>
      </Layout>
    )
  }

  return (
    <Layout title="Kartu Peserta Ujian" subtitle="Cetak kartu peserta untuk setiap siswa Kelas 6 yang sudah terdaftar sebagai peserta ujian.">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #area-cetak-kartu, #area-cetak-kartu * { visibility: visible; }
          #area-cetak-kartu { position: absolute; left: 0; top: 0; width: 100%; }
          .kartu-ujian { break-inside: avoid; }

          /* Browser default-nya sering TIDAK mencetak warna latar dan gradient.
             Baris di bawah memaksa warna ikut tercetak, tapi hanya bekerja
             kalau opsi "Background graphics" / "Grafik latar belakang" di
             dialog Print juga dicentang. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Kontrol — sembunyi saat print */}
      <div className="print:hidden mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="filter-ruang" className="text-sm text-slate-600">
            Ruang ujian:
          </label>
          <select
            id="filter-ruang"
            value={ruangFilter}
            onChange={(e) => setRuangFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {daftarRuang.map((r) => (
              <option key={r} value={r}>
                {r === 'semua' ? 'Semua ruang' : `Ruang ${r}`}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
        >
          <Printer size={16} /> Cetak Kartu
        </button>
      </div>

      {jumlahBelumTerdaftar > 0 && (
        <p className="print:hidden mb-4 text-xs text-amber-600">
          Ada {jumlahBelumTerdaftar} siswa Kelas 6 lain yang belum punya No. Peserta Ujian, jadi kartunya belum
          bisa dicetak. Isi dulu No. Peserta-nya di halaman Data Siswa atau Data Ujian 8355.
        </p>
      )}

      <p className="print:hidden mb-1 text-xs text-slate-500">
        Nama sekolah, kepala sekolah, dan tempat/tanggal diambil otomatis dari halaman Profil Sekolah. Tahun
        pelajaran dihitung otomatis dari tanggal hari ini.
      </p>
      <p className="print:hidden mb-4 text-xs text-slate-500">
        Agar warna kartu ikut tercetak: buka dialog Print → "More settings" / "Lainnya" → centang
        "Background graphics" / "Grafik latar belakang", baru klik Print.
      </p>

      {siswaList.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-700/60">
          {jumlahKelas6 === 0
            ? 'Belum ada siswa di Kelas 6, atau data siswa belum diisi.'
            : 'Belum ada siswa Kelas 6 yang No. Peserta Ujian-nya terisi.'}
        </div>
      ) : (
        <div
          id="area-cetak-kartu"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 place-items-center print:grid-cols-2 print:gap-4"
        >
          {siswaTampil.map((siswa) => (
            <KartuUjian key={siswa.id} siswa={siswa} sekolah={identitasSekolah} />
          ))}
        </div>
      )}
    </Layout>
  )
}
