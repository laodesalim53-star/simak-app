import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Printer, Loader2, Save, Check } from 'lucide-react'

function formatTanggal(tgl) {
  if (!tgl) return '-'
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return tgl
  }
}

// Usia dihitung terhadap tanggal acuan (bisa diubah admin, default hari ini)
// — hasilnya format "X Th Y Bl" seperti biasa dipakai di formulir sekolah.
function hitungUsia(tanggalLahir, tanggalAcuan) {
  if (!tanggalLahir) return '-'
  const lahir = new Date(tanggalLahir)
  const acuan = new Date(tanggalAcuan)
  if (isNaN(lahir) || isNaN(acuan)) return '-'

  let tahun = acuan.getFullYear() - lahir.getFullYear()
  let bulan = acuan.getMonth() - lahir.getMonth()
  if (acuan.getDate() < lahir.getDate()) bulan--
  if (bulan < 0) {
    tahun--
    bulan += 12
  }
  if (tahun < 0) return '-'
  return `${tahun} Th ${bulan} Bl`
}

// Field kecamatan/kabupaten di database disimpan lengkap dengan awalannya
// (misal "KECAMATAN ARU UTARA TIMUR", "PEMERINTAH KABUPATEN KEPULAUAN ARU")
// karena teks itu dipakai apa adanya di kop surat. Tapi di grid info sekolah
// labelnya sendiri sudah menyebut "Kecamatan"/"Kabupaten", jadi kalau nilai
// mentahnya ditampilkan langsung jadi dobel: "Kecamatan : KECAMATAN ...".
// Fungsi ini HANYA dipakai di grid info — kop surat tetap pakai teks asli.
function bersihkanAwalan(nilai, awalanList) {
  if (!nilai) return nilai
  let hasil = nilai.trim()
  for (const awalan of awalanList) {
    const regex = new RegExp(`^${awalan}\\s+`, 'i')
    if (regex.test(hasil)) {
      hasil = hasil.replace(regex, '')
      break
    }
  }
  return hasil || '-'
}

// ---------------------------------------------------------------------------
// Formulir 8355 aslinya (lihat 8355_TEMPLATE.docx) terdiri dari 3 tabel
// TERPISAH — masing-masing dicetak sebagai satu lembar/lampiran sendiri,
// bukan digabung jadi satu tabel raksasa. Kalau digabung, kolomnya kepepet
// jadi font super kecil dan sebagian kepotong (itu bug yang dilaporkan).
// Definisi kolom di bawah ini persis mengikuti pembagian 3 tabel di template.
// ---------------------------------------------------------------------------
// `w` di sini adalah PERSENTASE lebar (bukan px) — dipakai lewat <colgroup>
// dengan table-layout: fixed, supaya tabel selalu pas dengan lebar kertas
// A4 landscape berapa pun jumlah kolomnya, tidak melebar/kepotong.
const LAMPIRAN_1_KOLOM = [
  { key: 'no', label: 'No', w: 3 },
  { key: 'kode_provinsi', label: 'Kode Provinsi', w: 6, dariSekolah: 'kode_provinsi_ujian' },
  { key: 'kode_rayon', label: 'Kode Rayon', w: 6, dariSekolah: 'kode_rayon_ujian' },
  { key: 'kode_sekolah', label: 'Kode Sekolah', w: 6, dariSekolah: 'kode_sekolah_ujian' },
  { key: 'paralel', label: 'Paralel', w: 5 },
  { key: 'no_absen', label: 'Absen', w: 5 },
  { key: 'kode_peserta_ujian', label: 'Kode Peserta', w: 7 },
  { key: 'cek_kode', label: 'Cek Kode Peserta', w: 7 },
  { key: 'no_peserta_ujian', label: 'No Peserta', w: 7 },
  { key: 'nisn', label: 'NISN', w: 8 },
  { key: 'nis', label: 'NIS', w: 5 },
  { key: 'nama_lengkap', label: 'Nama Peserta', w: 16 },
  { key: 'tempat_lahir', label: 'Tempat Lahir', w: 8 },
  { key: 'tanggal_lahir_fmt', label: 'Tanggal Lahir', w: 11 },
]

const LAMPIRAN_2_KOLOM = [
  { key: 'no', label: 'No', w: 4 },
  { key: 'tanggal_lahir_fmt', label: 'Tanggal Lahir', w: 9 },
  { key: 'jenis_kelamin', label: 'L/P', w: 4 },
  { key: 'nama_ayah', label: 'Nama Ayah', w: 15 },
  { key: 'alamat', label: 'Alamat 1', w: 17 },
  { key: 'alamat_tinggal', label: 'Alamat 2', w: 17 },
  { key: 'kode_pos', label: 'Kode Pos', w: 6 },
  { key: 'mengulang_fmt', label: 'Ket', w: 7 },
  { key: 'no_peserta_mengulang', label: 'No Peserta Mengulang', w: 9 },
  { key: 'agama', label: 'Agama', w: 5 },
  { key: 'pekerjaan_ayah', label: 'Pekerjaan Ayah', w: 7 },
]

const LAMPIRAN_3_KOLOM = [
  { key: 'nama_ibu', label: 'Nama Ibu', w: 14 },
  { key: 'pekerjaan_ibu', label: 'Pekerjaan Ibu', w: 9 },
  { key: 'hobi_anak', label: 'Hobi Anak', w: 8 },
  { key: 'cita_cita_anak', label: 'Cita-cita Anak', w: 8 },
  { key: 'pendidikan_ayah', label: 'Pendidikan Ayah', w: 8 },
  { key: 'pendidikan_ibu', label: 'Pendidikan Ibu', w: 8 },
  { key: 'gaji_orang_tua', label: 'Gaji Orang Tua', w: 9 },
  { key: 'jarak_rumah_sekolah', label: 'Jarak Rumah-Sekolah', w: 9 },
  { key: 'transportasi_ke_sekolah', label: 'Transportasi', w: 9 },
  { key: 'jumlah_saudara', label: 'Jumlah Saudara', w: 6 },
  { key: 'usia_fmt', label: 'Usia', w: 6 },
  { key: 'no_skhun', label: 'No SKHUN', w: 6 },
]

export default function Cetak8355() {
  const { profil, isSuperAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [loading, setLoading] = useState(true)
  const [siswaList, setSiswaList] = useState([])
  const [sekolah, setSekolah] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')

  const [tahunPelajaran, setTahunPelajaran] = useState('')
  const [statusSekolah, setStatusSekolah] = useState('')
  const [tanggalAcuanUsia, setTanggalAcuanUsia] = useState(
    new Date().toISOString().slice(0, 10)
  )

  // Kode Provinsi / Kode Rayon / Kode Sekolah (khusus formulir 8355) —
  // sebelumnya cuma dibaca dari tabel profil_sekolah lewat kolom
  // kode_provinsi_ujian / kode_rayon_ujian / kode_sekolah_ujian, TAPI
  // tidak ada satupun menu/form di aplikasi ini untuk mengisinya, jadi
  // selalu tampil "-". Ditambahkan input + tombol Simpan di sini supaya
  // bisa langsung diisi dan disimpan ke profil_sekolah.
  const [kodeProvinsi, setKodeProvinsi] = useState('')
  const [kodeRayon, setKodeRayon] = useState('')
  const [kodeSekolah, setKodeSekolah] = useState('')
  const [menyimpanKode, setMenyimpanKode] = useState(false)
  const [kodeTersimpan, setKodeTersimpan] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) muatSemua()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, isSuperAdmin])

  async function muatSemua() {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const [{ data: siswaRows }, { data: sekolahRow }] = await Promise.all([
      supabase
        .from('siswa')
        .select('*, kelas!inner(nama_kelas)')
        .eq('sekolah_id', sekolahId)
        .ilike('kelas.nama_kelas', '6%')
        .order('kelas(nama_kelas)')
        .order('nama_lengkap'),
      supabase.from('profil_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle(),
    ])

    setSiswaList(siswaRows || [])
    setSekolah(sekolahRow || null)
    setKodeProvinsi(sekolahRow?.kode_provinsi_ujian || '')
    setKodeRayon(sekolahRow?.kode_rayon_ujian || '')
    setKodeSekolah(sekolahRow?.kode_sekolah_ujian || '')
    if (sekolahRow?.logo_path) {
      const { data: pub } = supabase.storage.from('profil-sekolah').getPublicUrl(sekolahRow.logo_path)
      setLogoUrl(pub.publicUrl)
    }
    setLoading(false)
  }

  // Simpan Kode Provinsi/Rayon/Sekolah ke tabel profil_sekolah. Pakai upsert
  // (bukan update biasa) berjaga-jaga kalau baris profil_sekolah untuk
  // sekolah ini belum pernah dibuat sama sekali (sekolahRow bisa null).
  async function simpanKodeUjian() {
    if (!sekolahId) return
    setMenyimpanKode(true)
    setKodeTersimpan(false)

    const { error } = await supabase.from('profil_sekolah').upsert(
      {
        sekolah_id: sekolahId,
        kode_provinsi_ujian: kodeProvinsi || null,
        kode_rayon_ujian: kodeRayon || null,
        kode_sekolah_ujian: kodeSekolah || null,
      },
      { onConflict: 'sekolah_id' }
    )

    if (!error) {
      setSekolah((prev) => ({
        ...(prev || {}),
        kode_provinsi_ujian: kodeProvinsi,
        kode_rayon_ujian: kodeRayon,
        kode_sekolah_ujian: kodeSekolah,
      }))
      setKodeTersimpan(true)
      setTimeout(() => setKodeTersimpan(false), 2000)
    } else {
      alert('Gagal menyimpan Kode Provinsi/Rayon/Sekolah: ' + error.message)
    }
    setMenyimpanKode(false)
  }

  // Sumber nilai untuk 3 kolom yang sekarang bisa diedit langsung di halaman
  // ini (lihat input Kode Provinsi/Rayon/Sekolah di toolbar) — diprioritaskan
  // dari state lokal (yang langsung berubah saat diketik) daripada menunggu
  // reload dari tabel profil_sekolah.
  const kodeUjian = {
    kode_provinsi_ujian: kodeProvinsi,
    kode_rayon_ujian: kodeRayon,
    kode_sekolah_ujian: kodeSekolah,
  }

  function nilaiSel(siswa, kolom) {
    if (kolom.key === 'no') return siswaList.indexOf(siswa) + 1
    if (kolom.dariSekolah) return kodeUjian[kolom.dariSekolah] || '-'
    if (kolom.key === 'paralel') return siswa.kelas?.nama_kelas || '-'
    if (kolom.key === 'tanggal_lahir_fmt') return formatTanggal(siswa.tanggal_lahir)
    if (kolom.key === 'jenis_kelamin') return siswa.jenis_kelamin === 'L' ? 'L' : siswa.jenis_kelamin === 'P' ? 'P' : '-'
    if (kolom.key === 'mengulang_fmt') return siswa.mengulang ? 'Mengulang' : '-'
    if (kolom.key === 'usia_fmt') return hitungUsia(siswa.tanggal_lahir, tanggalAcuanUsia)
    if (kolom.key === 'cek_kode') return '-'
    const v = siswa[kolom.key]
    return v === null || v === undefined || v === '' ? '-' : v
  }

  if (!isSuperAdmin) {
    return <div className="p-10 text-center text-ink-700/60">Halaman ini khusus untuk Superadmin.</div>
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-ink-700/60">
        <Loader2 size={18} className="animate-spin" /> Memuat data Kelas 6...
      </div>
    )
  }

  if (!sekolahId) {
    return <div className="p-10 text-center text-ink-700/60">Akun ini tidak terhubung ke satu sekolah spesifik.</div>
  }

  // Kop surat + info sekolah diulang di tiap lampiran (tiap lampiran = 1 halaman cetak sendiri)
  function KopSurat() {
    return (
      <>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            {logoUrl && <img src={logoUrl} alt="Logo sekolah" className="w-full h-full object-contain" />}
          </div>
          <div className="text-center flex-1">
            {sekolah?.kabupaten && <p className="font-display font-bold uppercase text-xs">{sekolah.kabupaten}</p>}
            {sekolah?.dinas_pendidikan && <p className="font-display font-bold uppercase text-xs">{sekolah.dinas_pendidikan}</p>}
            <h1 className="font-display text-lg font-bold uppercase">{sekolah?.nama_sekolah || 'Nama Sekolah'}</h1>
            {sekolah?.kecamatan && <p className="font-display font-bold uppercase text-[11px]">{sekolah.kecamatan}</p>}
          </div>
          <div className="w-16 shrink-0" />
        </div>
        <div className="border-t-4 border-double border-ink-950 mb-0.5" />
        <div className="border-t border-ink-950 mb-3" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs mb-4">
          <p><span className="text-ink-700/60">Nama Sekolah</span> : {sekolah?.nama_sekolah || '-'}</p>
          <p><span className="text-ink-700/60">NPSN</span> : {sekolah?.npsn || '-'}</p>
          <p><span className="text-ink-700/60">Status Sekolah</span> : {statusSekolah || '-'}</p>
          <p><span className="text-ink-700/60">Alamat Sekolah</span> : {sekolah?.alamat || '-'}</p>
          <p><span className="text-ink-700/60">Kecamatan</span> : {bersihkanAwalan(sekolah?.kecamatan, ['KECAMATAN'])}</p>
          <p><span className="text-ink-700/60">Kabupaten</span> : {bersihkanAwalan(sekolah?.kabupaten, ['PEMERINTAH KABUPATEN', 'KABUPATEN', 'PEMERINTAH KOTA', 'KOTA'])}</p>
          <p><span className="text-ink-700/60">Provinsi</span> : {sekolah?.provinsi || '-'}</p>
        </div>
      </>
    )
  }

  function Judul({ nomorLampiran }) {
    return (
      <>
        <h2 className="text-center font-display font-bold text-base uppercase mb-0.5">
          Daftar Calon Peserta Ujian (8355)
        </h2>
        <p className="text-center text-xs text-ink-700/60 mb-1">
          Kelas 6 · Tahun Pelajaran {tahunPelajaran || '.......................'}
        </p>
        <p className="text-center text-xs font-semibold uppercase mb-3">Lampiran {nomorLampiran}</p>
      </>
    )
  }

  function TabelLampiran({ kolom }) {
    return (
      <table className="tabel-8355 w-full border-collapse mb-6" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {kolom.map((k) => (
            <col key={k.key} style={{ width: `${k.w}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {kolom.map((k) => (
              <th key={k.key}>{k.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {siswaList.map((s) => (
            <tr key={s.id}>
              {kolom.map((k) => (
                <td key={k.key}>{nilaiSel(s, k)}</td>
              ))}
            </tr>
          ))}
          {siswaList.length === 0 && (
            <tr>
              <td colSpan={kolom.length} className="text-center py-3 text-ink-700/50">
                Belum ada siswa Kelas 6.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    )
  }

  return (
    <div className="min-h-screen bg-ink-950/5 py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .lembar-cetak { box-shadow: none !important; margin: 0 !important; max-width: none !important; width: 100% !important; }
          body { background: white; }
          @page { size: A4 landscape !important; margin: 8mm !important; }
          .lampiran-break { page-break-before: always; }

          /* CSS global (index.css) punya aturan:
               body * { visibility: hidden; }
               .print-only, .print-only * { visibility: visible; }
             yang tadinya dibuat khusus untuk Kuitansi/Nota (1 lembar).
             Halaman ini pakai .print-only juga (lihat 3 div lampiran di
             bawah) supaya isinya kasat mata saat print, TAPI di sini ada
             3 lembar terpisah dengan page-break, jadi override posisi
             "fixed" bawaan .print-only global menjadi "static" — supaya
             page-break-before antar lampiran tetap jalan mengikuti alur
             dokumen normal, bukan menumpuk di satu titik fixed. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
        .tabel-8355 th, .tabel-8355 td {
          border: 1px solid #0B1220;
          padding: 3px 4px;
          font-size: 10.5px;
          line-height: 1.3;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .tabel-8355 th {
          background: #f1f0ea;
        }
      `}</style>

      <div className="no-print max-w-[1200px] mx-auto mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label-field">Tahun Pelajaran</label>
            <input
              className="input-field"
              placeholder="Contoh: 2026/2027"
              value={tahunPelajaran}
              onChange={(e) => setTahunPelajaran(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Status Sekolah</label>
            <input
              className="input-field"
              placeholder="Negeri / Swasta"
              value={statusSekolah}
              onChange={(e) => setStatusSekolah(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Tanggal Acuan Usia</label>
            <input
              type="date"
              className="input-field"
              value={tanggalAcuanUsia}
              onChange={(e) => setTanggalAcuanUsia(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Cetak / Simpan PDF
        </button>
      </div>

      {/* Kode Provinsi / Kode Rayon / Kode Sekolah — sebelumnya tidak ada
          menu untuk mengisi ini sama sekali (dibaca dari profil_sekolah
          tapi tidak pernah ada form-nya), makanya di kolom Lampiran 1
          selalu tampil "-" dan tidak bisa diinput. Ditambahkan di sini
          supaya bisa langsung diisi dan disimpan untuk sekolah ini. */}
      <div className="no-print max-w-[1200px] mx-auto mb-6 card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label-field">Kode Provinsi</label>
          <input
            className="input-field w-32"
            placeholder="Contoh: 21"
            value={kodeProvinsi}
            onChange={(e) => setKodeProvinsi(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">Kode Rayon</label>
          <input
            className="input-field w-32"
            placeholder="Contoh: 01"
            value={kodeRayon}
            onChange={(e) => setKodeRayon(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">Kode Sekolah</label>
          <input
            className="input-field w-32"
            placeholder="Contoh: 123"
            value={kodeSekolah}
            onChange={(e) => setKodeSekolah(e.target.value)}
          />
        </div>
        <button
          className="btn-secondary"
          onClick={simpanKodeUjian}
          disabled={menyimpanKode}
        >
          {kodeTersimpan ? (
            <>
              <Check size={16} /> Tersimpan
            </>
          ) : (
            <>
              <Save size={16} /> {menyimpanKode ? 'Menyimpan...' : 'Simpan Kode'}
            </>
          )}
        </button>
        <p className="text-xs text-ink-700/50 basis-full">
          Kode ini dipakai untuk kolom Kode Provinsi / Kode Rayon / Kode Sekolah di Lampiran 1 dan tersimpan per sekolah (tidak perlu diisi ulang tiap cetak).
        </p>
      </div>

      {/* ---------------- LAMPIRAN 1 ---------------- */}
      {/* Class "print-only" ditambahkan: CSS global menyembunyikan SEMUA
          elemen (body *) saat print kecuali yang berkelas print-only.
          Tanpa class ini, 3 lembar lampiran di bawah ikut tersembunyi
          walau tinggi/jumlah halamannya tetap terhitung — itu sebabnya
          hasil cetak sebelumnya "5 halaman" tapi kosong semua. */}
      <div className="lampiran lembar-cetak print-only max-w-[1200px] mx-auto bg-white shadow-lg p-6 text-sm text-ink-950">
        <KopSurat />
        <Judul nomorLampiran={1} />
        <TabelLampiran kolom={LAMPIRAN_1_KOLOM} />
      </div>

      {/* ---------------- LAMPIRAN 2 ---------------- */}
      <div className="lampiran lampiran-break lembar-cetak print-only max-w-[1200px] mx-auto bg-white shadow-lg p-6 mt-8 print:mt-0 text-sm text-ink-950">
        <KopSurat />
        <Judul nomorLampiran={2} />
        <TabelLampiran kolom={LAMPIRAN_2_KOLOM} />
      </div>

      {/* ---------------- LAMPIRAN 3 ---------------- */}
      <div className="lampiran lampiran-break lembar-cetak print-only max-w-[1200px] mx-auto bg-white shadow-lg p-6 mt-8 print:mt-0 text-sm text-ink-950">
        <KopSurat />
        <Judul nomorLampiran={3} />
        <TabelLampiran kolom={LAMPIRAN_3_KOLOM} />

        {/* ---------------- TANDA TANGAN (hanya di lampiran terakhir) ---------------- */}
        <div className="flex justify-end mt-8 text-xs">
          <div className="text-center">
            <p>
              {sekolah?.tempat_ttd || '.......................'}, {formatTanggal(new Date().toISOString())}
            </p>
            <p className="mb-1 font-semibold">Kepala Sekolah</p>
            <div className="h-14" />
            <p className="font-semibold border-t border-ink-950/40 pt-1 inline-block px-6">
              {sekolah?.kepala_sekolah || '(.......................................)'}
            </p>
            {sekolah?.nip_kepala_sekolah && (
              <p className="text-[11px] text-ink-700/60">NIP. {sekolah.nip_kepala_sekolah}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
