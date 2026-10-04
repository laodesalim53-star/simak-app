// src/pages/DaftarHadirPengawasUjian.jsx
//
// Daftar hadir pengawas ruang ujian. Pengawas = guru aktif (dari
// ambilGuruDanKelas); ruang & jam jaga bisa diubah manual.
//
// ISIAN OTOMATIS DARI JADWAL (BARU):
// - Daftar pengawas, ruang, dan jam jaga diisi otomatis dari halaman
//   "Jadwal Pengawas Ruang" (lib/jadwalPengawasStore, tersimpan di Supabase)
//   sesuai TANGGAL yang dipilih. Contoh: pilih Senin, 05 Oktober 2026 -> semua
//   Pengawas I & II yang bertugas pada hari itu langsung muncul, urut menurut
//   jam jaga lalu ruang.
// - Saat halaman dibuka, tanggal yang dipilih adalah hari ini (atau tanggal
//   jadwal terdekat berikutnya, atau tanggal jadwal pertama).
// - Mengganti tanggal (input tanggal atau dropdown "Ambil dari jadwal")
//   mengisi ulang daftar kalau pada tanggal itu ada jadwal. Kalau tidak ada
//   jadwal, daftar yang sudah ada dibiarkan.
// - Setelah terisi, semua baris tetap bisa diubah, ditambah, atau dihapus.
//
// Kop surat & sistem cetak mengikuti DaftarHadirSiswaUjian.jsx:
// - Kop resmi: Pemerintah Kabupaten > Dinas Pendidikan > Nama Sekolah > Kecamatan,
//   dengan logo kabupaten (kiri) dan logo sekolah (kanan) dari tabel
//   profil_sekolah (kolom logo_kabupaten_path & logo_path, bucket 'profil-sekolah').
// - Field kop terisi otomatis dari profil_sekolah, tetap bisa diubah manual;
//   perubahan manual TIDAK menimpa isian yang sudah diketik.
// - CSS cetak: mode satu halaman, semua teks hitam, huruf Times New Roman,
//   gambar kop dikunci supaya tidak kebawa aturan CSS global.
// - Kolom Tanda Tangan: nomor berselang-seling kiri/tengah (zigzag) lewat
//   posisiSilang(i), sama seperti daftar hadir siswa.
// - sekolahId dari useAuth().sekolahId, cadangan useAuth().profil.sekolah_id.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { muatJadwalPengawas, ratakanSesiJadwal } from '../lib/jadwalPengawasStore'
import Layout from '../components/Layout'
import {
  BagianSK as Bagian,
  FieldSK as Field,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  tahunPelajaranSekarang,
  urutkanGuru,
} from '../components/CetakSK'

function isKelasEnam(k) {
  const t = String(k?.tingkat ?? '').trim().toUpperCase()
  return t === '6' || t === 'VI'
}

// Format lengkap dengan nama hari: "Rabu, 23 September 2026".
function formatHariTanggal(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// "Senin, 05 Okt 2026" untuk label dropdown tanggal jadwal.
function labelTanggal(iso) {
  if (!iso) return '…'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// Posisi nomor di kolom Tanda Tangan, berselang-seling kiri/tengah per baris
// (baris ke-0 -> kiri, baris ke-1 -> tengah, dst.) supaya membentuk pola zigzag.
function posisiSilang(i) {
  return i % 2 === 0 ? 'text-left pl-4' : 'text-center'
}

const idBaru = () => Math.random().toString(36).slice(2, 9)
// `ruang` = teks yang dicetak (nama kelas VI atau nomor ruang dari jadwal).
const barisBaru = (ruang = '', guruId = '', jamJaga = '08.00 – 10.00') => ({
  id: idBaru(),
  guruId,
  ruang,
  jamJaga,
})

export default function DaftarHadirPengawasUjian() {
  // Aman untuk dua bentuk AuthContext: `sekolahId` langsung, atau lewat profil.sekolah_id.
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [kelasEnam, setKelasEnam] = useState([])
  const [baris, setBaris] = useState([barisBaru()])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // --- Jadwal pengawas (dari halaman Jadwal Pengawas Ruang) ---
  const [sesiJadwal, setSesiJadwal] = useState([])
  const sudahOtomatis = useRef(false)

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    jenisUjian: 'Ujian Tulis / Praktek',
    tanggal: isoHariIni(),
  })

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, alamat, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
      }))
      const enam = gk.kelas.filter(isKelasEnam)
      setKelasEnam(enam)
      setBaris((d) => d.map((b) => ({ ...b, ruang: b.ruang || enam[0]?.nama_kelas || '' })))
    } catch (e) {
      console.error('Gagal memuat data Daftar Hadir Pengawas:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  // Baca jadwal pengawas yang tersimpan dari halaman Jadwal Pengawas Ruang.
  useEffect(() => {
    let batal = false
    sudahOtomatis.current = false
    if (!sekolahId) return undefined
    ;(async () => {
      const t = await muatJadwalPengawas(sekolahId)
      if (!batal) setSesiJadwal(ratakanSesiJadwal(t))
    })()
    return () => { batal = true }
  }, [sekolahId])

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const kelasPerNama = useMemo(() => {
    const m = {}
    kelasEnam.forEach((k) => { m[k.nama_kelas] = k })
    return m
  }, [kelasEnam])

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  // Tanggal unik yang punya jadwal, untuk dropdown "Ambil dari jadwal".
  const tanggalJadwal = useMemo(
    () => [...new Set(sesiJadwal.map((s) => s.tanggal).filter(Boolean))].sort(),
    [sesiJadwal]
  )

  // Isi daftar pengawas dari jadwal pada satu tanggal: tiap sesi menghasilkan
  // satu baris untuk Pengawas I dan satu untuk Pengawas II (kalau ada), diurut
  // menurut jam jaga lalu ruang. Mengembalikan false kalau tidak ada jadwal.
  function isiDariJadwal(tanggal, sesi = sesiJadwal) {
    const harian = sesi
      .filter((s) => s.tanggal === tanggal)
      .sort(
        (a, b) =>
          String(a.waktu).localeCompare(String(b.waktu), undefined, { numeric: true }) ||
          String(a.ruang).localeCompare(String(b.ruang), undefined, { numeric: true })
      )
    const hasil = []
    harian.forEach((s) => {
      ;[s.guru1Id, s.guru2Id].forEach((idGuru) => {
        if (!idGuru || !guruPerId[idGuru]) return
        hasil.push(barisBaru(s.ruang || kelasEnam[0]?.nama_kelas || '', idGuru, s.waktu || ''))
      })
    })
    if (hasil.length === 0) return false
    setBaris(hasil)
    return true
  }

  // Otomatis: setelah jadwal dan data guru termuat, pilih tanggal hari ini (atau
  // tanggal jadwal terdekat berikutnya, atau yang pertama) dan isi sekali saja.
  useEffect(() => {
    if (sudahOtomatis.current || memuat || sesiJadwal.length === 0 || guru.length === 0) return
    if (tanggalJadwal.length === 0) return
    sudahOtomatis.current = true
    const hariIni = isoHariIni()
    const pilih = tanggalJadwal.find((t) => t === hariIni) || tanggalJadwal.find((t) => t >= hariIni) || tanggalJadwal[0]
    setForm((f) => ({ ...f, tanggal: pilih }))
    isiDariJadwal(pilih)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesiJadwal, guru, memuat, tanggalJadwal])

  // Ganti tanggal lewat input: isi ulang kalau tanggal itu punya jadwal.
  const ubahTanggal = (e) => {
    const tanggal = e.target.value
    setForm((f) => ({ ...f, tanggal }))
    if (tanggal) isiDariJadwal(tanggal)
  }

  // Ganti tanggal lewat dropdown jadwal.
  const pilihTanggalJadwal = (e) => {
    const tanggal = e.target.value
    if (!tanggal) return
    setForm((f) => ({ ...f, tanggal }))
    isiDariJadwal(tanggal)
  }

  const ubahBaris = (id, k, v) => setBaris((d) => d.map((b) => (b.id === id ? { ...b, [k]: v } : b)))

  // Baris baru langsung memakai ruang pertama, sama seperti yang tampil di dropdown.
  const tambahBaris = () => setBaris((d) => [...d, barisBaru(kelasEnam[0]?.nama_kelas || '')])
  const hapusBaris = (id) => setBaris((d) => d.filter((b) => b.id !== id))

  // Ganti ruang: kalau guru yang sudah dipilih ternyata wali kelas ruang baru, kosongkan.
  const ubahRuang = (id, ruang) =>
    setBaris((d) =>
      d.map((b) => {
        if (b.id !== id) return b
        const wali = kelasPerNama[ruang]?.wali_kelas_id
        return { ...b, ruang, guruId: wali && b.guruId === wali ? '' : b.guruId }
      })
    )

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  const hariTanggal = formatHariTanggal(form.tanggal)

  return (
    <Layout title="Daftar Hadir Pengawas" subtitle="Daftar hadir pengawas ruang ujian, siap cetak.">
      <style>{`
        @page { size: A4; margin: 12mm 16mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-pengawas, #area-cetak-pengawas * { visibility: visible; }
          #area-cetak-pengawas {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-pengawas .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-pengawas .ttd-blok { page-break-inside: avoid; }
          #area-cetak-pengawas * { color: #000 !important; }
          #area-cetak-pengawas table { border-color: #000 !important; }
          #area-cetak-pengawas th, #area-cetak-pengawas td { border-color: #000 !important; }
          #area-cetak-pengawas thead { display: table-header-group; }
          #area-cetak-pengawas tr { page-break-inside: avoid; }
          #area-cetak-pengawas thead tr { background: #fff !important; }

          /* === MODE SATU HALAMAN === */
          /* Ukuran huruf cetak: turunkan lagi kalau isi masih meluber. */
          #area-cetak-pengawas { font-size: 10.5pt !important; line-height: 1.3 !important; break-inside: avoid; }
          #area-cetak-pengawas .kop-surat { padding-bottom: 6px !important; margin-bottom: 10px !important; }
          #area-cetak-pengawas .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-pengawas .judul-blok { margin-bottom: 10px !important; }
          #area-cetak-pengawas .info-blok { margin-bottom: 8px !important; }
          #area-cetak-pengawas td, #area-cetak-pengawas th { padding: 2px 6px !important; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-pengawas .kop-logo img {
          position: static !important; float: none !important;
          display: block; max-width: 100%; max-height: 100%; object-fit: contain;
        }
      `}</style>

      <div className="no-print max-w-3xl mx-auto mb-5">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}).
          </div>
        )}

        <Bagian judul="Kop surat" keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini, kosongkan yang tidak perlu ditampilkan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={form.kabupaten} onChange={ubah('kabupaten')} placeholder="PEMERINTAH KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={form.dinas} onChange={ubah('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={form.kecamatan} onChange={ubah('kecamatan')} placeholder="KECAMATAN …" />
            </Field>
            <Field label="Jenis ujian">
              <input className={inputCls} value={form.jenisUjian} onChange={ubah('jenisUjian')} placeholder="Ujian Tulis / Praktek" />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Tanggal"
          keterangan="Pengawas yang bertugas pada tanggal ini terisi otomatis dari Jadwal Pengawas Ruang. Mengganti tanggal mengisi ulang daftar di bawah."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Hari, tanggal ujian">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubahTanggal} />
            </Field>
            <Field label="Ambil dari jadwal pengawas">
              {tanggalJadwal.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                  Belum ada jadwal pengawas tersimpan. Isi dulu di halaman Jadwal Pengawas Ruang, lalu buka
                  halaman ini lagi.
                </p>
              ) : (
                <select
                  className={inputCls}
                  value={tanggalJadwal.includes(form.tanggal) ? form.tanggal : ''}
                  onChange={pilihTanggalJadwal}
                >
                  <option value="">— pilih tanggal jadwal —</option>
                  {tanggalJadwal.map((t) => (
                    <option key={t} value={t}>{labelTanggal(t)}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          {tanggalJadwal.length > 0 && !tanggalJadwal.includes(form.tanggal) && (
            <p className="mt-2 text-xs text-amber-700">
              Tidak ada jadwal pengawas pada tanggal ini, jadi daftar tidak diisi otomatis.
            </p>
          )}
        </Bagian>

        <Bagian
          judul="Pengawas per ruang"
          keterangan="Terisi otomatis sesuai jadwal pada tanggal terpilih; bisa diganti, ditambah, atau dihapus. Wali kelas ruang yang sama disembunyikan dari pilihannya sendiri."
          aksi={
            <button
              type="button"
              onClick={tambahBaris}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
            >
              <Plus size={13} /> Tambah baris
            </button>
          }
        >
          <div className="space-y-3">
            {baris.map((b, i) => {
              const ruangTerpilih = kelasPerNama[b.ruang]
              const pilihanGuru = guru.filter((g) => !ruangTerpilih || g.id !== ruangTerpilih.wali_kelas_id)
              // Ruang dari jadwal (mis. "1") belum tentu nama kelas VI; tetap ditampilkan sebagai pilihan.
              const ruangDiLuarKelas = b.ruang && !kelasPerNama[b.ruang]
              return (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Nomor {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus nomor ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Ruang">
                      <select className={inputCls} value={b.ruang} onChange={(e) => ubahRuang(b.id, e.target.value)}>
                        {kelasEnam.length === 0 && !ruangDiLuarKelas && <option value="">— tidak ada kelas VI —</option>}
                        {ruangDiLuarKelas && <option value={b.ruang}>Ruang {b.ruang}</option>}
                        {kelasEnam.map((k) => (
                          <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Nama pengawas">
                      <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, 'guruId', e.target.value)}>
                        <option value="">— pilih guru —</option>
                        {pilihanGuru.map((g) => (
                          <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Jam jaga">
                      <input className={inputCls} value={b.jamJaga} onChange={(e) => ubahBaris(b.id, 'jamJaga', e.target.value)} />
                    </Field>
                  </div>
                </div>
              )
            })}
          </div>
        </Bagian>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <div id="area-cetak-pengawas" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800">
        <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
          {/* Logo kiri: kabupaten. Kotak tetap ada walau kosong supaya teks tetap di tengah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoKabupatenUrl && (
              <img
                src={logoKabupatenUrl}
                alt="Logo kabupaten"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
          <div className="flex-1 text-center">
            {form.kabupaten && <p className="font-bold uppercase tracking-wide">{form.kabupaten}</p>}
            {form.dinas && <p className="font-bold uppercase tracking-wide">{form.dinas}</p>}
            <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
            {form.kecamatan && <p className="font-bold uppercase tracking-wide">{form.kecamatan}</p>}
          </div>
          {/* Logo kanan: sekolah. */}
          <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
            {logoSekolahUrl && (
              <img
                src={logoSekolahUrl}
                alt="Logo sekolah"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>
        </div>

        <div className="judul-blok text-center mb-6">
          <p className="font-display text-base font-bold uppercase">Daftar Hadir Pengawas</p>
          <p className="font-bold uppercase">{form.jenisUjian} Tahun Pelajaran {tapel}</p>
        </div>

        <div className="info-blok mb-4">
          <p>Hari / Tanggal : <strong>{hariTanggal}</strong></p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr>
              <Th className="w-10">No</Th>
              <Th>Nama Pengawas</Th>
              <Th className="w-24">Ruang</Th>
              <Th className="w-32">Jam Jaga</Th>
              <Th className="w-32">Tanda Tangan</Th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b, i) => (
              <tr key={b.id}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{isi(guruPerId[b.guruId]?.nama_lengkap, '')}</Td>
                <Td className="text-center">{isi(b.ruang, '')}</Td>
                <Td className="text-center">{isi(b.jamJaga, '')}</Td>
                <Td className={`text-slate-400 ${posisiSilang(i)}`}>{i + 1}.</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ttd-blok mt-10 flex justify-end">
          <div className="text-center">
            <p className="font-medium mb-16">Kepala Sekolah</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(sekolah.kepala, '________________________')}
            </p>
            {sekolah.nipKepala && <p>NIP. {sekolah.nipKepala}</p>}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Th({ children, className = '' }) {
  return <th className={`border border-slate-300 px-2 py-1.5 text-left font-semibold ${className}`}>{children}</th>
}
function Td({ children, className = '' }) {
  return <td className={`border border-slate-300 px-2 py-1.5 ${className}`}>{children}</td>
}
