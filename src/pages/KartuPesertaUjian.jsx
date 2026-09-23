// src/pages/KartuPesertaUjian.jsx
//
// - TEMPLATE kartu: model panjang (potret) yang sudah disetujui.
// - LOGIKA data: Supabase (siswa + profil_sekolah), filter Kelas 6, hanya
//   siswa yang sudah punya No. Peserta Ujian, filter ruang.
// - FOTO SISWA: kolom `foto_path` di tabel siswa + bucket Storage "foto-siswa"
//   (public), sama persis dengan fitur "Foto" di Siswa.jsx.
// - PENGATURAN RUANG: tombol "Pengaturan Ruang" membuka modal untuk mengisi
//   kolom `ruang_ujian` per siswa (manual, bagi otomatis per kapasitas, atau
//   samakan semua), lalu disimpan ke tabel siswa.
//
// CATATAN SKEMA:
// - "No. Induk" di kartu diambil dari kolom `nisn` di tabel siswa.
// - Ruang ujian diambil dari kolom `ruang_ujian` di tabel siswa. Kalau kolom
//   ini belum ada, jalankan di Supabase SQL Editor:
//     alter table siswa add column if not exists ruang_ujian text;
//   Selama kolom ini kosong, kartu menampilkan "-" pada Ruang Ujian dan siswa
//   itu tidak muncul di filter dropdown ruang.
// - Menyimpan ruang butuh policy UPDATE pada tabel siswa untuk admin (biasanya
//   sudah ada karena halaman Data Siswa juga mengedit data).
//
// UKURAN KARTU: 8 cm x 10,7 cm, ditetapkan lewat style={{ width, height }} di
// KartuUjian supaya semua kartu sama besar dan ukuran cetaknya pasti.
// Nama siswa dan nama sekolah dibatasi maksimal 2 baris supaya isi kartu
// tidak melebihi tinggi tetap tersebut.

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { GraduationCap, Loader2, Printer, User, Settings, X, Save } from 'lucide-react'

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

// Bucket & kolom foto sama persis dengan Siswa.jsx (fitur "Foto" di tabel
// Data Siswa): kolom `foto_path` di tabel siswa, bucket Storage "foto-siswa"
// (public), path disimpan sebagai "{siswa_id}/foto.{ext}".
function fotoUrl(path) {
  if (!path) return null
  return supabase.storage.from('foto-siswa').getPublicUrl(path).data.publicUrl
}

// Batasi teks maksimal 2 baris (tanpa perlu plugin line-clamp Tailwind).
const BATAS_2_BARIS = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

// QR code lewat layanan publik QR Server (tanpa dependensi tambahan).
// Untuk versi offline: `npm install qrcode.react` lalu ganti jadi
// <QRCodeSVG value={qrValue} size={60} />.
function QRImg({ value, size = 60 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 3}x${size * 3}&data=${encodeURIComponent(value)}`
  return <img src={src} alt="QR peserta" width={size} height={size} style={{ display: 'block' }} />
}

function KartuUjian({ siswa, sekolah }) {
  // Kalau foto gagal dimuat (file terhapus / URL salah), balik ke ikon placeholder.
  const [fotoGagal, setFotoGagal] = useState(false)
  const qrValue = `PESERTA:${siswa.noPeserta}|NAMA:${siswa.nama}|SEKOLAH:${sekolah.namaSekolah}`

  return (
    <div
      className="kartu-ujian relative flex shrink-0 flex-col overflow-hidden rounded-[22px] border border-teal-900/10 bg-white shadow-lg shadow-teal-900/10"
      style={{ width: '8cm', height: '10.7cm' }}
    >
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundImage: 'linear-gradient(90deg, #0f6e5e 0%, #0f6e5e 65%, #e8a33d 65%, #e8a33d 100%)' }}
      />

      {/* Header — badge TP ditaruh sejajar label "Kartu Peserta" supaya tidak
          menimpa nama sekolah yang panjang. */}
      <div className="shrink-0 bg-gradient-to-br from-[#0a4a40] to-[#0f6e5e] px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <GraduationCap size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] uppercase tracking-wide text-white/70">Kartu Peserta</p>
              <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10.5px] font-semibold leading-4 text-amber-950">
                TP {sekolah.tapel}
              </span>
            </div>
            <p className="font-display text-[16px] font-bold leading-tight" style={BATAS_2_BARIS}>
              Asesmen {sekolah.namaSekolah}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col justify-between px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-[100px] w-[75px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {siswa.fotoUrl && !fotoGagal ? (
              <img
                src={siswa.fotoUrl}
                alt={siswa.nama}
                className="h-full w-full object-cover"
                onError={() => setFotoGagal(true)}
              />
            ) : (
              <User size={36} className="text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10.5px] tracking-wide text-slate-500">Nama Peserta</p>
            <p className="mb-2 font-display text-[16px] font-bold leading-snug" style={BATAS_2_BARIS}>
              {siswa.nama}
            </p>
            <div className="inline-flex items-baseline gap-1.5 rounded-[9px] border border-slate-200 bg-slate-50 px-2.5 py-1">
              <span className="font-display text-[15px] font-bold text-teal-700">{siswa.ruangUjian || '-'}</span>
              <span className="text-[10.5px] text-slate-500">Ruang Ujian</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 border-t border-slate-200 pt-2.5">
          <div className="flex flex-col gap-1">
            <Baris label="No. Peserta" nilai={siswa.noPeserta} />
            <Baris label="No. Induk" nilai={siswa.noInduk || '-'} />
            <Baris label="Tanggal Lahir" nilai={siswa.tanggalLahir} />
          </div>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0 text-[11.5px] leading-relaxed text-slate-500">
            <p className="mb-3">{sekolah.tempatTanggal}</p>
            <p className="font-semibold text-slate-900">{sekolah.kepalaSekolah}</p>
            <p className="text-[11px] text-slate-500">Kepala Sekolah</p>
          </div>
          <div className="shrink-0 rounded-[10px] border border-slate-200 bg-white p-1.5">
            <QRImg value={qrValue} size={60} />
          </div>
        </div>
      </div>

      <div
        className="h-2 w-full shrink-0 opacity-90"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #0f6e5e 0 16px, #e8a33d 16px 32px)' }}
      />
    </div>
  )
}

function Baris({ label, nilai }) {
  return (
    <div className="grid grid-cols-[104px_1fr] items-baseline gap-2.5">
      <span className="text-[11.5px] text-slate-500">{label}</span>
      <span className="text-[13.5px] font-semibold text-slate-900">{nilai}</span>
    </div>
  )
}

// Modal untuk mengisi ruang ujian setiap peserta.
function ModalPengaturanRuang({ siswaList, onClose, onSimpan }) {
  // Urutkan berdasarkan No. Peserta supaya pembagian ruang berurutan.
  const urut = useMemo(
    () =>
      [...siswaList].sort((a, b) =>
        String(a.noPeserta).localeCompare(String(b.noPeserta), undefined, { numeric: true })
      ),
    [siswaList]
  )

  const [nilai, setNilai] = useState(() =>
    Object.fromEntries(siswaList.map((s) => [s.id, s.ruangUjian || '']))
  )
  const [kapasitas, setKapasitas] = useState(20)
  const [semuaRuang, setSemuaRuang] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesanError, setPesanError] = useState('')

  function isiOtomatis() {
    const k = Math.max(1, parseInt(kapasitas, 10) || 1)
    const baru = {}
    urut.forEach((s, i) => {
      baru[s.id] = String(Math.floor(i / k) + 1)
    })
    setNilai(baru)
  }

  function isiSemua() {
    const v = semuaRuang.trim()
    setNilai(Object.fromEntries(urut.map((s) => [s.id, v])))
  }

  function kosongkanSemua() {
    setNilai(Object.fromEntries(urut.map((s) => [s.id, ''])))
  }

  async function simpan() {
    setPesanError('')
    const berubah = urut.filter((s) => (nilai[s.id] || '').trim() !== (s.ruangUjian || ''))
    if (berubah.length === 0) {
      onClose()
      return
    }

    setMenyimpan(true)
    const hasil = await Promise.all(
      berubah.map((s) =>
        supabase
          .from('siswa')
          .update({ ruang_ujian: (nilai[s.id] || '').trim() || null })
          .eq('id', s.id)
      )
    )
    setMenyimpan(false)

    const gagal = hasil.filter((h) => h.error)
    if (gagal.length > 0) {
      console.error('Gagal menyimpan ruang ujian:', gagal[0].error)
      setPesanError(
        `${gagal.length} data gagal disimpan: ${gagal[0].error.message}. Pastikan kolom ruang_ujian sudah ada di tabel siswa.`
      )
      return
    }

    onClose()
    onSimpan()
  }

  return (
    <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">Pengaturan Ruang Ujian</h2>
            <p className="text-xs text-slate-500">
              Isi ruang untuk setiap peserta. Contoh: 1, 2, 3 atau A, B.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Alat bantu pengisian cepat */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex items-end gap-2">
            <label className="text-xs text-slate-600">
              Siswa per ruang
              <input
                type="number"
                min="1"
                value={kapasitas}
                onChange={(e) => setKapasitas(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={isiOtomatis}
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
            >
              Bagi otomatis
            </button>
          </div>

          <div className="flex items-end gap-2">
            <label className="text-xs text-slate-600">
              Samakan semua
              <input
                type="text"
                value={semuaRuang}
                onChange={(e) => setSemuaRuang(e.target.value)}
                placeholder="mis. 1"
                className="mt-1 block w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={isiSemua}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Terapkan
            </button>
          </div>

          <button
            type="button"
            onClick={kosongkanSemua}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Kosongkan
          </button>
        </div>

        {/* Daftar siswa */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="w-8 py-1.5">No</th>
                <th className="py-1.5">Nama</th>
                <th className="py-1.5">No. Peserta</th>
                <th className="w-24 py-1.5">Ruang</th>
              </tr>
            </thead>
            <tbody>
              {urut.map((s, i) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-500">{i + 1}</td>
                  <td className="py-1.5 font-medium text-slate-900">{s.nama}</td>
                  <td className="py-1.5 text-slate-600">{s.noPeserta}</td>
                  <td className="py-1.5">
                    <input
                      type="text"
                      value={nilai[s.id] ?? ''}
                      onChange={(e) => setNilai((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          {pesanError && <p className="mb-2 text-xs text-red-600">{pesanError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpan}
              disabled={menyimpan}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-60"
            >
              {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan
            </button>
          </div>
        </div>
      </div>
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
  const [modalRuang, setModalRuang] = useState(false)

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
      .select('id, nama_lengkap, nisn, tanggal_lahir, no_peserta_ujian, ruang_ujian, foto_path, kelas(nama_kelas)')
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
      fotoUrl: fotoUrl(s.foto_path),
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

  // Kalau ruang yang sedang difilter hilang setelah pengaturan ulang, kembalikan ke "semua".
  useEffect(() => {
    if (ruangFilter !== 'semua' && !daftarRuang.includes(ruangFilter)) {
      setRuangFilter('semua')
    }
  }, [daftarRuang, ruangFilter])

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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalRuang(true)}
            disabled={siswaList.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Settings size={16} /> Pengaturan Ruang
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak Kartu
          </button>
        </div>
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
      <p className="print:hidden mb-1 text-xs text-slate-500">
        Foto siswa diambil dari fitur Foto di halaman Data Siswa. Siswa yang belum punya foto tampil dengan ikon
        placeholder.
      </p>
      <p className="print:hidden mb-1 text-xs text-slate-500">
        Ruang ujian diisi lewat tombol Pengaturan Ruang (manual, bagi otomatis per kapasitas, atau samakan semua).
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
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center print:grid-cols-2 print:gap-4"
        >
          {siswaTampil.map((siswa) => (
            <KartuUjian key={siswa.id} siswa={siswa} sekolah={identitasSekolah} />
          ))}
        </div>
      )}

      {modalRuang && (
        <ModalPengaturanRuang
          siswaList={siswaList}
          onClose={() => setModalRuang(false)}
          onSimpan={muatData}
        />
      )}
    </Layout>
  )
}
