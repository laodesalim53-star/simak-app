import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  KopSK,
  LembarSK,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  urutkanGuru,
} from './CetakSK'

// --- Dipinjam dari DaftarHadirSiswaUjian.jsx / KartuPesertaUjian.jsx: ---
// pengenal Kelas 6 & status peserta, supaya sumber datanya sama persis
// dengan halaman Kartu Peserta Ujian / Pengaturan Ruang.

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
// resmi dan boleh dihitung di berita acara.
function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
}

// Urut alami berdasarkan No. Peserta (mis. "...-9" sebelum "...-10").
function urutkanNoPeserta(a, b) {
  return String(a.noPeserta).localeCompare(String(b.noPeserta), undefined, { numeric: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// BeritaAcaraUjianSekolah — lembar Berita Acara Penyelenggara Ujian Sekolah,
// dibuat mengikuti format contoh (Berita Acara Penyelenggara Ujian Sekolah
// Tahun Pelajaran 2025/2026) dan pola tampilan/kop yang sama dengan halaman SK
// lain (lihat PaktaIntegritas.jsx / CetakSK.jsx). Berbeda dari SK: tidak ada
// Menimbang/Mengingat/Memutuskan — hanya judul, tiga butir berlabel huruf
// (a, b, c), dan tanda tangan DUA Pengawas berdampingan (bukan Kepala Sekolah
// seorang diri, jadi tidak memakai BlokTTD bawaan).
//
// Route: /gudang-sk/portal-ujian/berita-acara — dipakai untuk kartu
// "Berita Acara Ujian" (id: 'berita-acara') di PortalUjian.jsx.
// ─────────────────────────────────────────────────────────────────────────────

const HARI_NAMA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu']
const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Pecah tanggal ISO (yyyy-mm-dd) menjadi {hari, tanggal, bulan, tahun} dalam
// kata-kata Indonesia, dipakai untuk mengisi kalimat pembuka berita acara.
function pecahTanggalIndo(iso) {
  if (!iso) return { hari: '', tanggal: '', bulan: '', tahun: '' }
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return { hari: '', tanggal: '', bulan: '', tahun: '' }
  return {
    hari: HARI_NAMA[d.getDay()],
    tanggal: String(d.getDate()),
    bulan: BULAN_NAMA[d.getMonth()],
    tahun: String(d.getFullYear()),
  }
}

const TAHUN_PELAJARAN_AWAL = (() => {
  const t = new Date().getFullYear()
  return `${t}/${t + 1}`
})()

const CATATAN_AWAL = 'Berjalan aman dan baik'

// Daftar bernomor angka (1. 2. 3. …) — sama gaya dengan diktum Mengingat di SK.
function DaftarAngka({ items }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{i + 1}.</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

// CSS pemadatan khusus supaya lembar (judul + butir a/b/c + dua kolom TTD
// Pengawas) muat di satu halaman A4, sama semangatnya dengan .pi-print-compact
// di PaktaIntegritas.jsx tapi di-scope terpisah (.ba-print-compact).
function GayaPadatSatuHalaman() {
  return (
    <style>{`
      .ba-print-compact .lembar-sk {
        font-size: 11pt;
        line-height: 1.4;
      }
      .ba-print-compact .sk-kop {
        padding-bottom: 4px;
        margin-bottom: 10px;
      }
      .ba-print-compact .ba-judul {
        text-align: center;
        font-weight: bold;
        text-decoration: underline;
        margin: 2px 0;
      }
      .ba-print-compact .ba-pembuka {
        margin: 14px 0 10px;
        text-align: justify;
      }
      .ba-print-compact .ba-butir {
        margin: 0 0 12px;
      }
      .ba-print-compact .ba-butir > .huruf {
        font-weight: bold;
        margin-right: 6px;
      }
      .ba-print-compact table.ba-rincian {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0 0;
      }
      .ba-print-compact table.ba-rincian td {
        vertical-align: top;
        padding: 1px 4px 1px 0;
      }
      .ba-print-compact table.ba-rincian td.label {
        width: 46%;
        white-space: nowrap;
      }
      .ba-print-compact table.ba-rincian td.titik {
        width: 10px;
      }
      .ba-print-compact table.ba-rincian td.nilai {
        border-bottom: 1px dotted #000;
      }
      .ba-print-compact .ba-penutup {
        margin: 14px 0 0;
        text-align: justify;
      }
      .ba-print-compact .ba-ttd-wrap {
        margin-top: 8px;
      }
      .ba-print-compact .ba-ttd-judul {
        margin-bottom: 10px;
      }
      .ba-print-compact .ba-ttd-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 4px;
      }
      .ba-print-compact .ba-ttd-kolom .judul {
        font-weight: bold;
        margin-bottom: 40px;
      }
      .ba-print-compact .ba-ttd-kolom table {
        border-collapse: collapse;
      }
      .ba-print-compact .ba-ttd-kolom table td {
        vertical-align: top;
        padding: 0 4px 2px 0;
      }
      .ba-print-compact .ba-ttd-kolom table td.no {
        width: 16px;
      }
      .ba-print-compact .ba-ttd-kolom table td.label {
        width: 90px;
        white-space: nowrap;
      }
      .ba-print-compact .ba-ttd-kolom table td.titik {
        width: 10px;
      }
    `}</style>
  )
}

// Satu baris "Label : nilai....." memakai garis titik-titik seperti formulir
// aslinya (dipakai di bagian a dan b).
function BarisRincian({ label, nilai, satuan }) {
  return (
    <tr>
      <td className="label">{label}</td>
      <td className="titik">:</td>
      <td className="nilai">
        {nilai}
        {satuan ? ` ${satuan}` : ''}
      </td>
    </tr>
  )
}

export default function BeritaAcaraUjianSekolah() {
  const navigate = useNavigate()
  // Aman untuk dua bentuk AuthContext: ada `sekolahId` langsung, atau hanya
  // lewat profil.sekolah_id (sama seperti DaftarHadirSiswaUjian.jsx).
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id
  const sudahMuat = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)

  // --- Guru (untuk dipilih sebagai Pengawas I & II) ---
  const [guru, setGuru] = useState([])

  // --- Peserta (ditarik otomatis dari tabel siswa, sama sumbernya dengan
  //     Kartu Peserta Ujian / Daftar Hadir Siswa Ujian) ---
  const [siswaSemua, setSiswaSemua] = useState([])
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')
  // Kehadiran per siswa (id -> true/false). Default semua hadir; dicentang-
  // hilangkan satu per satu kalau ada yang tidak hadir saat pelaksanaan.
  const [kehadiran, setKehadiran] = useState({})

  const [sk, setSk] = useState({
    tanggalPelaksanaan: isoHariIni(),
    tahunPelajaran: TAHUN_PELAJARAN_AWAL,
    pukulMulai: '',
    pukulSelesai: '',
    ruang: '',
    // Dipakai hanya sebagai cadangan kalau ruang ini belum punya data siswa
    // di sistem (mis. sekolah belum mengisi Pengaturan Ruang) — begitu ada
    // data siswa untuk ruang tersebut, angka & nomor di bawah dihitung
    // otomatis dan field manual ini diabaikan.
    jumlahSeharusnya: '',
    jumlahTidakHadir: '',
    nomorTidakHadir: '',
    jumlahHadir: '',
    nomorHadir: '',
    mapel: '',
    kodeSoal: '',
    jumlahSoal: '',
    jumlahJawaban: '',
    jumlahBlankoBA: '',
    jumlahDaftarHadir: '',
    catatan: CATATAN_AWAL,
    pengawas1Id: '',
    pengawas2Id: '',
  })

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  async function muatDariData() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
      ])
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      sudahMuat.current = true
    } catch (e) {
      console.error('Gagal memuat data Berita Acara Ujian Sekolah:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  // Sama seperti muatSiswa() di DaftarHadirSiswaUjian.jsx: ambil semua siswa
  // sekolah (join kelas), filter Kelas 6 di sisi client, lalu filter lagi
  // hanya yang sudah punya No. Peserta Ujian.
  async function muatSiswa() {
    if (!sekolahId) {
      setMemuatSiswa(false)
      return
    }
    setMemuatSiswa(true)
    setGalatSiswa('')
    try {
      const { data, error } = await supabase
        .from('siswa')
        .select('id, nama_lengkap, nisn, no_peserta_ujian, ruang_ujian, kelas(nama_kelas)')
        .eq('sekolah_id', sekolahId)
        .order('nama_lengkap')

      if (error) throw error

      const peserta = (data || [])
        .filter((s) => isKelas6(s.kelas?.nama_kelas))
        .filter(sudahTerdaftarPeserta)
        .map((s) => ({
          id: s.id,
          nama: s.nama_lengkap,
          noPeserta: s.no_peserta_ujian,
          noInduk: s.nisn,
          ruangUjian: s.ruang_ujian || '',
        }))
      setSiswaSemua(peserta)
    } catch (e) {
      console.error('Gagal memuat daftar peserta ujian:', e)
      setGalatSiswa(e?.message || 'Daftar peserta tidak dapat dibaca.')
      setSiswaSemua([])
    } finally {
      setMemuatSiswa(false)
    }
  }

  useEffect(() => {
    muatDariData()
    muatSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))

  // ── Guru / Pengawas ──
  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  // Pengawas II tidak boleh sama dengan Pengawas I, dan sebaliknya.
  const pilihanPengawas1 = useMemo(() => guru.filter((g) => g.id !== sk.pengawas2Id), [guru, sk.pengawas2Id])
  const pilihanPengawas2 = useMemo(() => guru.filter((g) => g.id !== sk.pengawas1Id), [guru, sk.pengawas1Id])

  const pengawas1 = guruPerId[sk.pengawas1Id]
  const pengawas2 = guruPerId[sk.pengawas2Id]

  // ── Ruang & peserta ──
  // Daftar ruang = nilai ruang_ujian unik yang sudah diisi lewat halaman
  // Kartu Peserta Ujian > Pengaturan Ruang, diurutkan alami (1, 2, 10, ...).
  const daftarRuang = useMemo(
    () =>
      [...new Set(siswaSemua.map((s) => s.ruangUjian).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
    [siswaSemua]
  )

  // Begitu daftar ruang termuat, otomatis pilih ruang pertama kalau form
  // belum punya pilihan (atau pilihan lama sudah tidak ada lagi).
  useEffect(() => {
    if (daftarRuang.length === 0) return
    if (!sk.ruang || !daftarRuang.includes(sk.ruang)) {
      setSk((s) => ({ ...s, ruang: daftarRuang[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarRuang])

  // Peserta pada ruang yang sedang dipilih, terurut sesuai No. Peserta.
  const siswaRuang = useMemo(
    () => siswaSemua.filter((s) => s.ruangUjian === sk.ruang).sort(urutkanNoPeserta),
    [siswaSemua, sk.ruang]
  )

  // Begitu daftar peserta ruang berubah, kehadiran defaultnya HADIR semua —
  // hanya siswa yang belum ada di state yang diisi default true, supaya
  // centang yang sudah diubah tangan sebelumnya tidak ikut ter-reset.
  useEffect(() => {
    setKehadiran((k) => {
      const next = { ...k }
      let berubah = false
      siswaRuang.forEach((s) => {
        if (!(s.id in next)) {
          next[s.id] = true
          berubah = true
        }
      })
      return berubah ? next : k
    })
  }, [siswaRuang])

  const pesertaHadir = useMemo(() => siswaRuang.filter((s) => kehadiran[s.id] !== false), [siswaRuang, kehadiran])
  const pesertaTidakHadir = useMemo(() => siswaRuang.filter((s) => kehadiran[s.id] === false), [siswaRuang, kehadiran])

  const adaDataPeserta = siswaRuang.length > 0
  const toggleHadir = (id) => setKehadiran((k) => ({ ...k, [id]: !(k[id] !== false) }))

  // Nilai yang dicetak: pakai hasil hitung otomatis kalau ruang ini sudah
  // punya data peserta di sistem, kalau belum (data kosong) pakai isian
  // manual di form sebagai cadangan.
  const jumlahSeharusnyaCetak = adaDataPeserta ? String(siswaRuang.length) : sk.jumlahSeharusnya
  const jumlahHadirCetak = adaDataPeserta ? String(pesertaHadir.length) : sk.jumlahHadir
  const jumlahTidakHadirCetak = adaDataPeserta ? String(pesertaTidakHadir.length) : sk.jumlahTidakHadir
  const nomorHadirCetak = adaDataPeserta ? pesertaHadir.map((s) => s.noPeserta).join(', ') : sk.nomorHadir
  const nomorTidakHadirCetak = adaDataPeserta
    ? pesertaTidakHadir.map((s) => s.noPeserta).join(', ')
    : sk.nomorTidakHadir

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const { hari, tanggal, bulan, tahun } = pecahTanggalIndo(sk.tanggalPelaksanaan)

  const teksPembuka =
    `Pada hari ini ${isi(hari, '…')}, tanggal ${isi(tanggal, '…')} bulan ${isi(bulan, '…')} ` +
    `tahun ${isi(tahun, '…')}.`

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadatSatuHalaman />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk/portal-ujian')} judul="Berita Acara Ujian Sekolah" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data sekolah belum bisa dibaca ({galat}). Anda tetap bisa mengetik data secara manual.
          </div>
        )}

        <Bagian judul="Tahun pelajaran" keterangan="Tercetak di judul lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahunPelajaran} onChange={ubahSk('tahunPelajaran')} placeholder="mis. 2025/2026" />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="a. Pelaksanaan Ujian Sekolah"
          keterangan={
            adaDataPeserta
              ? `Jumlah & nomor peserta dihitung otomatis dari data siswa Kelas 6 (Ruang ${sk.ruang}) — ${siswaRuang.length} peserta. Centang untuk menandai yang TIDAK hadir.`
              : 'Ruang ini belum punya data peserta di sistem — isi jumlah & nomor peserta secara manual di bawah.'
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal pelaksanaan">
              <input type="date" className={inputCls} value={sk.tanggalPelaksanaan} onChange={ubahSk('tanggalPelaksanaan')} />
            </Field>
            <Field label="Ruang" keterangan={daftarRuang.length > 0 ? 'Daftar diambil dari ruang yang sudah diisi lewat Pengaturan Ruang.' : undefined}>
              {daftarRuang.length > 0 ? (
                <select className={inputCls} value={sk.ruang} onChange={ubahSk('ruang')}>
                  {daftarRuang.map((r) => (
                    <option key={r} value={r}>Ruang {r}</option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={sk.ruang} onChange={ubahSk('ruang')} placeholder="mis. I (Satu)" />
              )}
            </Field>
            <Field label="Pukul mulai">
              <input type="time" className={inputCls} value={sk.pukulMulai} onChange={ubahSk('pukulMulai')} />
            </Field>
            <Field label="Pukul selesai">
              <input type="time" className={inputCls} value={sk.pukulSelesai} onChange={ubahSk('pukulSelesai')} />
            </Field>
          </div>

          {memuatSiswa ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Memuat daftar peserta…
            </p>
          ) : galatSiswa ? (
            <p className="mt-3 text-sm text-amber-700">Daftar peserta belum bisa dibaca ({galatSiswa}).</p>
          ) : adaDataPeserta ? (
            <div className="mt-3 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {siswaRuang.map((s) => {
                const hadir = kehadiran[s.id] !== false
                return (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
                    <input type="checkbox" checked={!hadir} onChange={() => toggleHadir(s.id)} className="rounded" />
                    <span className={hadir ? 'text-slate-700' : 'text-red-600 line-through'}>
                      {s.noPeserta} — {s.nama}
                    </span>
                    {!hadir && <span className="ml-auto text-xs text-red-500">tidak hadir</span>}
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Jumlah peserta seharusnya">
                <input className={inputCls} value={sk.jumlahSeharusnya} onChange={ubahSk('jumlahSeharusnya')} inputMode="numeric" />
              </Field>
              <Field label="Jumlah peserta tidak hadir">
                <input className={inputCls} value={sk.jumlahTidakHadir} onChange={ubahSk('jumlahTidakHadir')} inputMode="numeric" />
              </Field>
              <Field label="Nomor peserta tidak hadir" className="sm:col-span-2">
                <input className={inputCls} value={sk.nomorTidakHadir} onChange={ubahSk('nomorTidakHadir')} placeholder="kosongkan jika tidak ada" />
              </Field>
              <Field label="Jumlah peserta hadir">
                <input className={inputCls} value={sk.jumlahHadir} onChange={ubahSk('jumlahHadir')} inputMode="numeric" />
              </Field>
              <Field label="Nomor peserta hadir" className="sm:col-span-2">
                <input className={inputCls} value={sk.nomorHadir} onChange={ubahSk('nomorHadir')} placeholder="mis. 1 s.d. 6" />
              </Field>
            </div>
          )}
        </Bagian>

        <Bagian judul="b. Pembukaan sampul ujian" keterangan="Mata pelajaran, kode soal, dan jumlah eksemplar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Mata pelajaran">
              <input className={inputCls} value={sk.mapel} onChange={ubahSk('mapel')} placeholder="mis. PKN" />
            </Field>
            <Field label="Kode soal">
              <input className={inputCls} value={sk.kodeSoal} onChange={ubahSk('kodeSoal')} placeholder="mis. A.S.-PKN-D-26" />
            </Field>
            <Field label="Jumlah lembar soal (eksemplar)">
              <input className={inputCls} value={sk.jumlahSoal} onChange={ubahSk('jumlahSoal')} inputMode="numeric" />
            </Field>
            <Field label="Jumlah lembar jawaban (eksemplar)">
              <input className={inputCls} value={sk.jumlahJawaban} onChange={ubahSk('jumlahJawaban')} inputMode="numeric" />
            </Field>
            <Field label="Blanko Berita Acara (eksemplar)">
              <input className={inputCls} value={sk.jumlahBlankoBA} onChange={ubahSk('jumlahBlankoBA')} inputMode="numeric" />
            </Field>
            <Field label="Blanko Daftar Hadir (eksemplar)">
              <input className={inputCls} value={sk.jumlahDaftarHadir} onChange={ubahSk('jumlahDaftarHadir')} inputMode="numeric" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="c. Catatan pelaksanaan" keterangan="Diisi apabila ada hal-hal khusus (perangkat soal, kehadiran, tata tertib), atau tuliskan ringkasan seperti contoh.">
          <Field label="Catatan">
            <textarea className={inputCls} rows={3} value={sk.catatan} onChange={ubahSk('catatan')} />
          </Field>
        </Bagian>

        <Bagian judul="Pengawas" keterangan="Dipilih dari data guru; nama dan NIP di lembar cetak terisi otomatis.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pengawas I">
              <select className={inputCls} value={sk.pengawas1Id} onChange={ubahSk('pengawas1Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas1.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Pengawas II">
              <select className={inputCls} value={sk.pengawas2Id} onChange={ubahSk('pengawas2Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas2.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Kop sekolah" keterangan="Kop diambil dari Profil Sekolah.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama sekolah" className="sm:col-span-2">
              <input className={inputCls} value={sekolah.nama} readOnly />
            </Field>
          </div>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak ── */}
      <AreaLembar>
        <div className="ba-print-compact">
          <LembarSK>
            <KopSK sekolah={sekolah} />

            <p className="ba-judul">BERITA ACARA</p>
            <p className="ba-judul">PENYELENGGARA UJIAN SEKOLAH TAHUN PELAJARAN {isi(sk.tahunPelajaran, '…')}</p>

            <p className="ba-pembuka">{teksPembuka}</p>

            <div className="ba-butir">
              <span className="huruf">a.</span>
              <span>
                Telah diselenggarakan Ujian Sekolah dari pukul {isi(sk.pukulMulai, '…')} sampai dengan pukul {isi(sk.pukulSelesai, '…')}
              </span>
              <table className="ba-rincian">
                <tbody>
                  <BarisRincian label="Pada Sekolah" nilai={namaSekolah} />
                  <BarisRincian label="Ruang" nilai={isi(sk.ruang, '…')} />
                  <BarisRincian label="Jumlah Peserta Seharusnya" nilai={isi(jumlahSeharusnyaCetak, '…')} satuan="Orang" />
                  <BarisRincian label="Jumlah Peserta Yang Tidak Hadir" nilai={isi(jumlahTidakHadirCetak, '0')} satuan="Orang" />
                  <BarisRincian label="Yaitu Nomor" nilai={isi(nomorTidakHadirCetak, '-')} />
                  <BarisRincian label="Jumlah Peserta yang Hadir" nilai={isi(jumlahHadirCetak, '…')} satuan="Orang" />
                  <BarisRincian label="Yaitu Nomor" nilai={isi(nomorHadirCetak, '-')} />
                </tbody>
              </table>
            </div>

            <div className="ba-butir">
              <span className="huruf">b.</span>
              <span>
                Telah dibuka Sampul Ujian Sekolah untuk Mata Pelajaran <u>{isi(sk.mapel, '…')}</u>*) dengan nomor Kode{' '}
                <u>{isi(sk.kodeSoal, '…')}</u>**) di ruang Ujian Sekolah dengan disaksikan oleh para peserta, yang berisi
                lembar soal sebanyak {isi(sk.jumlahSoal, '…')} eksemplar, Lembar jawaban sebanyak {isi(sk.jumlahJawaban, '…')}{' '}
                eksemplar. Lembar Blanko Berita Acara {isi(sk.jumlahBlankoBA, '…')} eksemplar, dan Blanko Daftar Hadir sebanyak{' '}
                {isi(sk.jumlahDaftarHadir, '…')} eksemplar.
              </span>
              <p style={{ margin: '6px 0 0' }}>Sebelum dibuka sampul Ujian Sekolah tersebut dalam keadaan baik.</p>
            </div>

            <div className="ba-butir">
              <span className="huruf">c.</span>
              <span>Catatan selama pelaksanaan Ujian Sekolah ***)</span>
              <p style={{ margin: '6px 0 0' }}>{isi(sk.catatan, '-')}</p>
            </div>

            <div className="ba-penutup">
              <p>Berita acara ini dibuat dengan sesungguhnya.</p>
            </div>

            <div className="ba-ttd-wrap">
              <p className="ba-ttd-judul">Yang membuat berita acara</p>
              <div className="ba-ttd-grid">
                <div className="ba-ttd-kolom">
                  <p className="judul">Pengawas I</p>
                  <table>
                    <tbody>
                      <tr>
                        <td className="no">1.</td>
                        <td className="label">Tanda Tangan</td>
                        <td className="titik">:</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td className="no">2.</td>
                        <td className="label">Nama</td>
                        <td className="titik">:</td>
                        <td>{isi(pengawas1?.nama_lengkap, '…')}</td>
                      </tr>
                      <tr>
                        <td className="no">3.</td>
                        <td className="label">NIP</td>
                        <td className="titik">:</td>
                        <td>{isi(pengawas1?.nip, '…')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="ba-ttd-kolom">
                  <p className="judul">Pengawas II</p>
                  <table>
                    <tbody>
                      <tr>
                        <td className="no">1.</td>
                        <td className="label">Tanda Tangan</td>
                        <td className="titik">:</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td className="no">2.</td>
                        <td className="label">Nama</td>
                        <td className="titik">:</td>
                        <td>{isi(pengawas2?.nama_lengkap, '…')}</td>
                      </tr>
                      <tr>
                        <td className="no">3.</td>
                        <td className="label">NIP</td>
                        <td className="titik">:</td>
                        <td>{isi(pengawas2?.nip, '…')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '9pt', marginTop: 14 }}>
              *)&nbsp;&nbsp;Diisi dengan mata pelajaran pada waktu itu
              <br />
              **)&nbsp;Diisi sesuai dengan kode/nomor yang tercantum pada sampul soal
              <br />
              ***) Diisi apabila terjadi antara lain hal-hal sebagai berikut:
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;1. Ketidaksesuaian perangkat soal yang diterima
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;2. Ketidaksesuaian jumlah siswa yang hadir [alasan ketidakhadiran].
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;3. Pelanggaran tata tertib oleh peserta ujian, dan lain-lain.
            </p>
          </LembarSK>
        </div>
      </AreaLembar>
    </div>
  )
}
