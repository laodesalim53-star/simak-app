// src/pages/DaftarHadirSiswaUjian.jsx
//
// Daftar hadir peserta ujian per ruang, mengikuti format kop surat resmi:
// Pemerintah Kabupaten > Dinas Pendidikan > Nama Sekolah > Kecamatan.
//
// Dua sumber pola dipakai:
// - Kop surat, form editor, pengawas ruang (dipilih dari guru), dan CSS cetak
//   satu-halaman: mengikuti BeritaAcaraSerahTerimaAS.jsx (CetakSK,
//   ambilProfilSekolah, ambilGuruDanKelas, useAuth).
// - Daftar peserta ditarik OTOMATIS dari Supabase, mengikuti logika di
//   KartuPesertaUjian.jsx: tabel `siswa`, filter Kelas 6 (isKelas6), hanya
//   siswa yang `no_peserta_ujian`-nya sudah terisi (sudahTerdaftarPeserta),
//   lalu difilter lagi per `ruang_ujian` sesuai ruang yang dipilih. Tidak ada
//   input/tempel manual lagi untuk daftar utama — data selalu sinkron dengan
//   halaman Kartu Peserta Ujian / Pengaturan Ruang.
//
// CATATAN SKEMA (sama dengan KartuPesertaUjian.jsx):
// - "No. Peserta" & status "terdaftar" diambil dari kolom `no_peserta_ujian`.
// - Ruang ujian diambil dari kolom `ruang_ujian` (diisi lewat halaman Kartu
//   Peserta Ujian > Pengaturan Ruang). Selama siswa belum punya ruang, dia
//   tidak akan muncul di daftar ruang mana pun di halaman ini.
// - Kelas 6 dikenali baik penomoran angka ("6A") maupun Romawi ("VIA").
//
// CATATAN LAIN:
// - Field kop surat (kabupaten, dinas, kecamatan) dan alamat kantor otomatis
//   diisi dari tabel profil_sekolah begitu halaman dibuka. Tetap bisa diubah
//   manual di form; perubahan manual TIDAK menimpa isian yang sudah diketik.
// - Logo kop: logo kabupaten (kiri) dan logo sekolah (kanan) diambil otomatis
//   dari profil_sekolah (kolom logo_kabupaten_path & logo_path, bucket
//   storage 'profil-sekolah').
// - Pengawas I & II dipilih dari data guru (opsional, boleh dikosongkan dan
//   diisi tangan saat pelaksanaan).
// - Kalau ada peserta yang belum sempat masuk sistem, masih bisa ditambahkan
//   satu-satu lewat "Tambah peserta manual" di bagian bawah daftar — baris
//   ini murni tampilan tambahan dan tidak diambil dari database.
// - sekolahId diambil dari useAuth().sekolahId, dan kalau tidak tersedia
//   memakai useAuth().profil.sekolah_id (dua-duanya dicoba supaya aman).
// - KOLOM TANDA TANGAN (BARU): nomor urut di kolom ini sengaja ditulis
//   berselang-seling posisi kiri/tengah per baris (1 di kiri, 2 di tengah, 3
//   di kiri, 4 di tengah, dst.) lewat posisiSilang(i) di bawah, supaya kalau
//   dilihat menurun membentuk pola menyilang/zigzag — konvensi umum daftar
//   hadir resmi supaya baris tidak gampang disisipi nama tambahan.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
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

// --- Dipinjam dari KartuPesertaUjian.jsx: pengenal Kelas 6 & status peserta ---

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
// resmi dan boleh muncul di daftar hadir.
function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
}

// Urut alami berdasarkan No. Peserta (mis. "...-9" sebelum "...-10").
function urutkanNoPeserta(a, b) {
  return String(a.noPeserta).localeCompare(String(b.noPeserta), undefined, { numeric: true })
}

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// Posisi nomor di kolom Tanda Tangan, berselang-seling kiri/tengah per baris
// (baris ke-0 -> kiri, baris ke-1 -> tengah, baris ke-2 -> kiri, dst.),
// supaya kalau dilihat menurun kolomnya membentuk pola menyilang/zigzag.
function posisiSilang(i) {
  return i % 2 === 0 ? 'text-left pl-4' : 'text-center'
}

export default function DaftarHadirSiswaUjian() {
  // Aman untuk dua bentuk AuthContext: ada `sekolahId` langsung, atau hanya
  // lewat profil.sekolah_id (seperti di ProfilSekolah.jsx / KartuPesertaUjian.jsx).
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // --- Daftar peserta (ditarik otomatis dari tabel siswa) ---
  const [siswaSemua, setSiswaSemua] = useState([])
  const [jumlahKelas6, setJumlahKelas6] = useState(0)
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')
  const [siswaManual, setSiswaManual] = useState([])

  const [form, setForm] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
    jenisUjian: 'Ujian Tulis / Praktek',
    tanggal: isoHariIni(),
    pukulMulai: '',
    pukulSelesai: '',
    mataPelajaran: '',
    ruang: '',
    pengawas1Id: '',
    pengawas2Id: '',
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
    } catch (e) {
      console.error('Gagal memuat data Daftar Hadir Siswa:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  // Sama seperti muatData() di KartuPesertaUjian.jsx: ambil semua siswa
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

      const kelas6 = (data || []).filter((s) => isKelas6(s.kelas?.nama_kelas))
      setJumlahKelas6(kelas6.length)

      const peserta = kelas6.filter(sudahTerdaftarPeserta).map((s) => ({
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
    muat()
    muatSiswa()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  // Pengawas II tidak boleh sama dengan Pengawas I, dan sebaliknya.
  const pilihanPengawas2 = useMemo(() => guru.filter((g) => g.id !== form.pengawas1Id), [guru, form.pengawas1Id])
  const pilihanPengawas1 = useMemo(() => guru.filter((g) => g.id !== form.pengawas2Id), [guru, form.pengawas2Id])

  const pengawas1 = guruPerId[form.pengawas1Id]
  const pengawas2 = guruPerId[form.pengawas2Id]

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()

  const hariTanggal = useMemo(() => {
    if (!form.tanggal) return ''
    const d = new Date(`${form.tanggal}T00:00:00`)
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' })
    const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    return `${hari}, ${tgl}`
  }, [form.tanggal])

  const pukul = form.pukulMulai && form.pukulSelesai
    ? `${form.pukulMulai} - ${form.pukulSelesai} WIT`
    : ''

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
    if (!form.ruang || !daftarRuang.includes(form.ruang)) {
      setForm((f) => ({ ...f, ruang: daftarRuang[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarRuang])

  // Peserta pada ruang yang sedang dipilih, terurut sesuai No. Peserta.
  const siswaRuang = useMemo(
    () => siswaSemua.filter((s) => s.ruangUjian === form.ruang).sort(urutkanNoPeserta),
    [siswaSemua, form.ruang]
  )

  const jumlahBelumTerdaftar = jumlahKelas6 - siswaSemua.length

  // --- Kelola baris peserta tambahan (manual, di luar data sistem) ---
  const ubahManual = (idx, k) => (e) => {
    const nilai = e.target.value
    setSiswaManual((arr) => arr.map((s, i) => (i === idx ? { ...s, [k]: nilai } : s)))
  }
  const tambahBarisManual = () => setSiswaManual((arr) => [...arr, { noPeserta: '', nama: '' }])
  const hapusBarisManual = (idx) => setSiswaManual((arr) => arr.filter((_, i) => i !== idx))

  return (
    <Layout title="Daftar Hadir Peserta Ujian" subtitle="Daftar hadir peserta ujian per ruang, siap cetak.">
      <style>{`
        @page { size: A4; margin: 12mm 16mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-hadir, #area-cetak-hadir * { visibility: visible; }
          #area-cetak-hadir {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-hadir .kop-surat { border-bottom-color: #000 !important; }
          #area-cetak-hadir .ttd-blok { page-break-inside: avoid; }
          #area-cetak-hadir * { color: #000 !important; }
          #area-cetak-hadir table { border-color: #000 !important; }
          #area-cetak-hadir th, #area-cetak-hadir td { border-color: #000 !important; }

          /* === MODE SATU HALAMAN === */
          /* Ukuran huruf cetak: turunkan lagi kalau isi masih meluber. */
          #area-cetak-hadir { font-size: 10.5pt !important; line-height: 1.3 !important; break-inside: avoid; }
          #area-cetak-hadir .kop-surat { padding-bottom: 6px !important; margin-bottom: 10px !important; }
          #area-cetak-hadir .kop-logo { width: 60px !important; height: 60px !important; }
          #area-cetak-hadir .judul-blok { margin-bottom: 10px !important; }
          #area-cetak-hadir .info-blok { margin-bottom: 8px !important; }
          #area-cetak-hadir td, #area-cetak-hadir th { padding: 2px 6px !important; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-hadir .kop-logo img {
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
        {!memuatSiswa && galatSiswa && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Daftar peserta belum bisa dibaca ({galatSiswa}).
          </div>
        )}
        {!memuatSiswa && !galatSiswa && jumlahBelumTerdaftar > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Ada {jumlahBelumTerdaftar} siswa Kelas 6 yang belum punya No. Peserta Ujian, jadi belum muncul di
            daftar hadir. Isi dulu No. Peserta-nya di halaman Data Siswa / Data Ujian.
          </div>
        )}
        {!memuatSiswa && !galatSiswa && jumlahKelas6 > 0 && daftarRuang.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Belum ada siswa yang diisi Ruang Ujian-nya. Atur dulu lewat halaman Kartu Peserta Ujian &gt;
            Pengaturan Ruang.
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

        <Bagian judul="Waktu & pelaksanaan">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
            </Field>
            <Field label="Mata pelajaran">
              <input className={inputCls} value={form.mataPelajaran} onChange={ubah('mataPelajaran')} placeholder="mis. Ilmu Pengetahuan Sosial" />
            </Field>
            <Field label="Pukul mulai">
              <input type="time" className={inputCls} value={form.pukulMulai} onChange={ubah('pukulMulai')} />
            </Field>
            <Field label="Pukul selesai">
              <input type="time" className={inputCls} value={form.pukulSelesai} onChange={ubah('pukulSelesai')} />
            </Field>
            <Field label="Ruang" keterangan="Daftar diambil dari ruang yang sudah diisi lewat Pengaturan Ruang.">
              <select className={inputCls} value={form.ruang} onChange={ubah('ruang')} disabled={daftarRuang.length === 0}>
                {daftarRuang.length === 0 && <option value="">— belum ada ruang —</option>}
                {daftarRuang.map((r) => (
                  <option key={r} value={r}>Ruang {r}</option>
                ))}
              </select>
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Pengawas ruang" keterangan="Boleh dikosongkan bila akan diisi tangan saat pelaksanaan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pengawas I">
              <select className={inputCls} value={form.pengawas1Id} onChange={ubah('pengawas1Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas1.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
            <Field label="Pengawas II">
              <select className={inputCls} value={form.pengawas2Id} onChange={ubah('pengawas2Id')}>
                <option value="">— pilih guru —</option>
                {pilihanPengawas2.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama_lengkap}</option>
                ))}
              </select>
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Daftar peserta"
          keterangan={`Ditarik otomatis dari data siswa Kelas 6 (Ruang ${form.ruang || '…'}) — ${memuatSiswa ? 'memuat…' : `${siswaRuang.length} peserta`}. Ubah lewat halaman Data Siswa / Pengaturan Ruang, bukan di sini.`}
        >
          {memuatSiswa ? (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Memuat daftar peserta…
            </p>
          ) : siswaRuang.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada peserta terdaftar di ruang ini.</p>
          ) : (
            <ol className="ml-5 list-decimal space-y-0.5 text-sm text-slate-700">
              {siswaRuang.map((s) => (
                <li key={s.id}>{s.nama} <span className="text-slate-400">— {s.noPeserta}</span></li>
              ))}
            </ol>
          )}

          {siswaManual.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              {siswaManual.map((s, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2">
                  <input
                    className={inputCls}
                    value={s.noPeserta}
                    onChange={ubahManual(idx, 'noPeserta')}
                    placeholder="No. Peserta"
                  />
                  <input
                    className={inputCls}
                    value={s.nama}
                    onChange={ubahManual(idx, 'nama')}
                    placeholder="Nama peserta"
                  />
                  <button
                    type="button"
                    onClick={() => hapusBarisManual(idx)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Hapus baris"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={tambahBarisManual}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} /> Tambah peserta manual
          </button>
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

      <div id="area-cetak-hadir" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-[13px] leading-relaxed text-slate-800">
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
          <p className="font-display text-base font-bold uppercase">Daftar Hadir Peserta</p>
          <p className="font-bold uppercase">{form.jenisUjian} Tahun Pelajaran {tapel}</p>
        </div>

        <div className="info-blok grid grid-cols-2 gap-x-8 gap-y-1 mb-4">
          <p>Hari / Tanggal : <strong>{isi(hariTanggal, '…………')}</strong></p>
          <p>Mata Pelajaran : <strong>{isi(form.mataPelajaran, '…………')}</strong></p>
          <p>Pukul : <strong>{isi(pukul, '…………')}</strong></p>
          <p>Ruang : <strong>{isi(form.ruang, '…………')}</strong></p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr>
              <Th className="w-10">No</Th>
              <Th className="w-40">No Peserta Ujian</Th>
              <Th>Nama Peserta</Th>
              <Th className="w-32">Tanda Tangan</Th>
            </tr>
          </thead>
          <tbody>
            {[...siswaRuang, ...siswaManual].map((s, i) => (
              <tr key={s.id ?? `manual-${i}`}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{isi(s.noPeserta, '')}</Td>
                <Td>{isi(s.nama, '')}</Td>
                <Td className={`text-slate-400 ${posisiSilang(i)}`}>{i + 1}.</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-8 text-[12.5px]">
          <p className="mb-1 font-medium">Catatan :</p>
          <ol className="list-decimal ml-5 space-y-0.5">
            <li>Pengawas ruang menuliskan Nomor dan Nama Peserta dengan lengkap.</li>
            <li>Pengawas ruang menyilang Nama Peserta yang tidak hadir.</li>
          </ol>
        </div>

        <div className="ttd-blok grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="font-medium mb-10">Pengawas I</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(pengawas1?.nama_lengkap, '…………')}
            </p>
            <p>NIP. {isi(pengawas1?.nip, '…………')}</p>
          </div>
          <div>
            <p className="font-medium mb-10">Pengawas II</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(pengawas2?.nama_lengkap, '…………')}
            </p>
            <p>NIP. {isi(pengawas2?.nip, '…………')}</p>
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
