import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { GraduationCap, Loader2, Printer, User } from 'lucide-react'

// CATATAN SKEMA (konfirmasi dengan pengguna):
// - "No. Induk" di kartu diambil dari kolom `nisn` di tabel siswa.
// - Ruang ujian diambil dari kolom `ruang_ujian` di tabel siswa — kolom ini
//   BELUM ADA saat berkas ini dibuat, jadi kalau Anda belum menambahkannya:
//     alter table siswa add column ruang_ujian text;
//   lalu isi nilainya per siswa (mis. lewat form Data Siswa, atau bulk update).
//   Selama kolom ini kosong, kartu akan menampilkan "-" pada baris Ruang Ujian
//   dan siswa itu tidak akan muncul di filter dropdown ruang.

// Sama seperti di DataUjian8355.jsx — kelas 6 bisa ditulis dengan angka
// ("6A", "Kelas 6") atau angka Romawi ("VIA", "Kelas VI"), jadi kecocokan
// dicek dari kedua kemungkinan itu.
function isKelas6(namaKelas) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false
  if (/^6\b/.test(nama)) return true
  if (/KELAS\s*6\b/.test(nama)) return true
  if (/^VI([^I]|$)/.test(nama)) return true
  if (/KELAS\s*VI([^I]|$)/.test(nama)) return true
  return false
}

// Sama seperti di DataUjian8355.jsx — hanya siswa yang No. Peserta Ujian-nya
// sudah terisi yang dianggap "peserta" resmi dan boleh dicetak kartunya.
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
// otomatis dari tanggal hari ini. Asumsi umum: tahun ajaran baru dimulai
// bulan Juli (Juli-Des = tahun ini/tahun depan, Jan-Jun = tahun lalu/tahun ini).
function tahunAjaranBerjalan() {
  const sekarang = new Date()
  const tahun = sekarang.getFullYear()
  const bulan = sekarang.getMonth() + 1
  return bulan >= 7 ? `${tahun}/${tahun + 1}` : `${tahun - 1}/${tahun}`
}

// Menggabungkan `tempat_ttd` dari profil sekolah dengan tanggal hari ini,
// mengikuti format yang sama dipakai di ProfilSekolah.jsx, mis. "Masidang, 30 Juni 2026".
function formatTempatTanggalHariIni(tempat) {
  if (!tempat) return null
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${tempat}, ${tanggal}`
}

// Identitas sekolah default — dipakai sebagai fallback kalau tabel/kolom
// profil sekolah belum ada di database Anda, atau datanya masih kosong.
// Begitu tabel profil sekolah tersambung dengan benar (lihat muatProfilSekolah
// di bawah), nilai-nilai ini otomatis ditimpa oleh data asli.
const IDENTITAS_SEKOLAH_DEFAULT = {
  namaSekolah: 'SD Negeri Waria',
  tapel: '2024/2025',
  tempatTanggal: 'Waria, 5 Mei 2025',
  kepalaSekolah: 'La Ode Salim, S.Pd',
}

// QR code lewat layanan publik (tanpa dependensi tambahan) — lihat catatan
// di percakapan sebelumnya kalau mau ganti ke qrcode.react untuk versi
// offline.
function QRImg({ value, size = 20 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 3}x${size * 3}&data=${encodeURIComponent(value)}`
  return <img src={src} alt="QR peserta" width={size} height={size} style={{ display: 'block' }} />
}

// Bucket & kolom foto sama persis dengan Siswa.jsx (fitur "Foto" di tabel
// Data Siswa): kolom `foto_path` di tabel siswa, bucket Storage "foto-siswa"
// (public), path disimpan sebagai "{siswa_id}/foto.{ext}".
function fotoUrl(path) {
  if (!path) return null
  return supabase.storage.from('foto-siswa').getPublicUrl(path).data.publicUrl
}

// Ukuran kartu disamakan dengan kartu ID standar (kartu pelajar/ATM, CR80)
// 85.6mm x 54mm — ukuran fisik yang sama juga dipakai kartu peserta ujian
// pada umumnya. Karena ruangnya jadi jauh lebih kecil dari versi sebelumnya,
// tanda tangan kepala sekolah dan tempat/tanggal ditampilkan ringkas di
// footer (tanpa spasi tanda tangan basah — kalau perlu itu, sebaiknya jadi
// halaman terpisah, bukan di kartu sekecil ini).
//
// FOTO SISWA: diambil dari kolom `foto_path` di tabel siswa + bucket Storage
// "foto-siswa" (sama persis dengan fitur upload foto di halaman Data Siswa /
// Siswa.jsx). Kalau siswa belum punya foto, kotak foto otomatis menampilkan
// ikon placeholder seperti sebelumnya.
function KartuUjian({ siswa, sekolah }) {
  const qrValue = `PESERTA:${siswa.noPeserta}|NAMA:${siswa.nama}|SEKOLAH:${sekolah.namaSekolah}`

  return (
    <div
      className="kartu-ujian shrink-0 flex flex-col overflow-hidden rounded-[3mm] border border-teal-900/10 bg-white shadow-md shadow-teal-900/10"
      style={{ width: '85.6mm', height: '54mm' }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#0a4a40] to-[#0f6e5e] px-[2.5mm] py-[1.3mm] text-white">
        <GraduationCap size={11} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[6.5px] font-bold leading-tight">{sekolah.namaSekolah}</p>
          <p className="text-[5.5px] uppercase tracking-wide text-white/70 leading-tight">Kartu Peserta Asesmen</p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-400 px-[1.5mm] py-[0.3mm] text-[5.5px] font-semibold text-amber-950">
          TP {sekolah.tapel}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-[2mm] px-[2.5mm] py-[1.5mm]">
        <div className="flex h-[19mm] w-[15mm] shrink-0 items-center justify-center overflow-hidden rounded-[1.5mm] border border-slate-200 bg-slate-50">
          {siswa.fotoUrl ? (
            <img src={siswa.fotoUrl} alt={siswa.nama} className="h-full w-full object-cover" />
          ) : (
            <User size={16} className="text-slate-300" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="truncate text-[8px] font-bold leading-tight text-slate-900">{siswa.nama}</p>
            <div className="mt-[0.8mm] flex items-center gap-[1mm]">
              <span className="rounded-[1mm] bg-teal-50 px-[1.2mm] py-[0.3mm] text-[6px] font-semibold text-teal-700">
                No. {siswa.noPeserta}
              </span>
              <span className="rounded-[1mm] bg-amber-50 px-[1.2mm] py-[0.3mm] text-[6px] font-semibold text-amber-700">
                Ruang {siswa.ruangUjian || '-'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-[1.5mm] text-[6px] leading-tight">
            <BarisKecil label="No. Induk" nilai={siswa.noInduk || '-'} />
            <BarisKecil label="Tgl Lahir" nilai={siswa.tanggalLahir} />
          </div>
        </div>

        <div className="shrink-0 self-end rounded-[1mm] border border-slate-200 bg-white p-[0.5mm]">
          <QRImg value={qrValue} size={19} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-[2mm] border-t border-slate-100 px-[2.5mm] py-[1mm] text-[5.5px] text-slate-500">
        <span className="truncate">{sekolah.tempatTanggal}</span>
        <span className="shrink-0 truncate font-semibold text-slate-700">{sekolah.kepalaSekolah}</span>
      </div>
    </div>
  )
}

function BarisKecil({ label, nilai }) {
  return (
    <div className="truncate">
      <span className="text-slate-400">{label}: </span>
      <span className="font-semibold text-slate-800">{nilai}</span>
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

  // Diambil dari halaman ProfilSekolah.jsx: profil sekolah disimpan di tabel
  // `profil_sekolah`, satu baris per `sekolah_id`, dengan kolom (antara lain)
  // nama_sekolah, kepala_sekolah, nip_kepala_sekolah, tempat_ttd.
  //
  // CATATAN: tidak ada kolom "tahun pelajaran" di profil_sekolah, jadi badge
  // "TP 2024/2025" di kartu dihitung OTOMATIS dari tanggal hari ini lewat
  // tahunAjaranBerjalan() di bawah (asumsi tahun ajaran mulai bulan Juli).
  // Kalau aturan sekolah Anda beda, atau Anda mau ini bisa diedit manual per
  // tahun (bukan otomatis), beri tahu saya — saya tambahkan field-nya di
  // halaman Profil Sekolah.
  //
  // Kalau baris profil_sekolah untuk sekolah ini belum ada / gagal dimuat,
  // otomatis balik ke IDENTITAS_SEKOLAH_DEFAULT supaya kartu tetap bisa
  // dicetak.
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

    // Sama seperti DataUjian8355.jsx: ambil semua siswa sekolah (join kelas),
    // filter Kelas 6 di sisi client (supaya kelas dengan penamaan Romawi
    // ikut kena), lalu filter lagi hanya yang sudah punya No. Peserta Ujian.
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

          /* PENTING untuk warna: browser secara default sering TIDAK mencetak
             warna latar (background-color) dan gradient, walau tampilan di
             layar berwarna. Baris di bawah ini memaksa browser mencetak
             warna apa adanya. Ini hanya bekerja KALAU opsi "Background
             graphics" / "Grafik latar belakang" di dialog Print (biasanya
             ada di bagian "More settings" / "Lainnya") juga dicentang —
             CSS ini tidak bisa menyalakan opsi itu untuk Anda. */
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
      <p className="print:hidden mb-1 text-xs text-slate-500">
        Ukuran kartu sekarang mengikuti standar kartu ID (85,6mm x 54mm, seukuran kartu ATM/kartu pelajar) —
        cocok untuk dicetak di kertas kartu/PVC lalu digunting per kartu, atau dilaminasi dan dipasang di
        gantungan ID card.
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
        <div id="area-cetak-kartu" className="flex flex-wrap justify-center gap-[3mm] print:justify-start">
          {siswaTampil.map((siswa) => (
            <KartuUjian key={siswa.id} siswa={siswa} sekolah={identitasSekolah} />
          ))}
        </div>
      )}
    </Layout>
  )
}
