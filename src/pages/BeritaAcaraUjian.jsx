// src/pages/BeritaAcaraUjian.jsx
//
// Berita acara pelaksanaan ujian per ruang, otomatis sinkron dengan halaman lain:
// - Ruang ujian & jumlah peserta terdaftar: dari tabel `siswa` (Kelas 6, sudah
//   punya no_peserta_ujian, dikelompokkan per `ruang_ujian`) — logika sama
//   dengan DaftarHadirSiswaUjian.jsx / KartuPesertaUjian.jsx.
// - Tanggal, mata pelajaran, Pengawas I & II: dari Jadwal Pengawas Ruang
//   (lib/jadwalPengawasStore, tersimpan di Supabase). Saat dibuka, sesi hari ini
//   (atau sesi terdekat berikutnya) dipilih otomatis; sesi lain bisa dipilih di
//   dropdown "Ambil dari jadwal pengawas".
// - Nama sekolah, tempat, Kepala Sekolah & NIP: ambilProfilSekolah.
//
// Semua kolom tetap bisa diubah manual. Jumlah terdaftar dan hadir terisi otomatis
// (hadir dianggap = terdaftar); ketik angka lain bila ada yang tidak hadir,
// kosongkan lagi untuk kembali ke otomatis. Catatan kejadian tetap manual.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
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

// Hanya siswa yang No. Peserta Ujian-nya sudah terisi yang dianggap peserta resmi.
function sudahTerdaftarPeserta(siswa) {
  const nilai = siswa?.no_peserta_ujian
  return nilai !== null && nilai !== undefined && String(nilai).trim() !== ''
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

// "Senin, 05 Okt 2026" untuk label dropdown jadwal.
function labelTanggal(iso) {
  if (!iso) return '…'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function BeritaAcaraUjian() {
  // Aman untuk dua bentuk AuthContext: `sekolahId` langsung, atau lewat profil.sekolah_id.
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [tempatSekolah, setTempatSekolah] = useState('')
  const [guru, setGuru] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  // --- Peserta (dari tabel siswa) ---
  const [siswaSemua, setSiswaSemua] = useState([])
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')

  // --- Jadwal pengawas (dari halaman Jadwal Pengawas Ruang) ---
  const [sesiJadwal, setSesiJadwal] = useState([])
  const [sesiTerpilih, setSesiTerpilih] = useState('')
  const sudahOtomatis = useRef(false)

  const [form, setForm] = useState({
    mataPelajaran: 'Asesmen Sumatif',
    tanggal: isoHariIni(),
    ruang: '',
    // Kosong = ikut angka otomatis dari data siswa; diisi = angka manual.
    jumlahPesertaManual: '',
    jumlahHadirManual: '',
    pengawas1Id: '',
    pengawas2Id: '',
    catatanKejadian: 'Ujian berlangsung tertib, tidak ada kejadian khusus.',
  })

  async function muat() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      setSekolah(ps.sekolah)
      setTempatSekolah(ps.tempat)
      setGuru(urutkanGuru(gk.guru))
    } catch (e) {
      console.error('Gagal memuat data Berita Acara Ujian:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

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
        .select('id, no_peserta_ujian, ruang_ujian, kelas(nama_kelas)')
        .eq('sekolah_id', sekolahId)
      if (error) throw error
      const peserta = (data || [])
        .filter((s) => isKelas6(s.kelas?.nama_kelas))
        .filter(sudahTerdaftarPeserta)
        .map((s) => ({ id: s.id, ruangUjian: s.ruang_ujian || '' }))
      setSiswaSemua(peserta)
    } catch (e) {
      console.error('Gagal memuat data peserta untuk Berita Acara:', e)
      setGalatSiswa(e?.message || 'Data peserta tidak dapat dibaca.')
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

  // Ganti ruang: angka manual dikosongkan supaya kembali mengikuti data ruang baru.
  const ubahRuang = (e) => {
    const ruang = e.target.value
    setForm((f) => ({ ...f, ruang, jumlahPesertaManual: '', jumlahHadirManual: '' }))
  }

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  // Daftar ruang = nilai ruang_ujian unik yang sudah diisi lewat Pengaturan Ruang.
  const daftarRuang = useMemo(
    () =>
      [...new Set(siswaSemua.map((s) => s.ruangUjian).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      ),
    [siswaSemua]
  )

  // Otomatis pilih ruang pertama kalau belum ada pilihan (atau pilihan lama sudah hilang).
  useEffect(() => {
    if (daftarRuang.length === 0) return
    if (!form.ruang || !daftarRuang.includes(form.ruang)) {
      setForm((f) => ({ ...f, ruang: daftarRuang[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarRuang])

  // Pasang data satu sesi jadwal ke form.
  // timpa=false (otomatis saat dibuka): hanya mengisi kolom yang masih kosong.
  // timpa=true (pilihan manual di dropdown): menggantikan isian sebelumnya.
  function terapkanSesi(s, { timpa }) {
    const pakai = (lama, baru) => (timpa ? baru : lama || baru)
    setForm((f) => ({
      ...f,
      tanggal: s.tanggal || f.tanggal,
      mataPelajaran: pakai(f.mataPelajaran === 'Asesmen Sumatif' ? '' : f.mataPelajaran, s.mapel) || f.mataPelajaran,
      pengawas1Id: pakai(f.pengawas1Id, guruPerId[s.guru1Id] ? s.guru1Id : ''),
      pengawas2Id: pakai(f.pengawas2Id, guruPerId[s.guru2Id] ? s.guru2Id : ''),
      ruang: daftarRuang.includes(s.ruang) ? s.ruang : f.ruang,
      ...(timpa && daftarRuang.includes(s.ruang) && s.ruang !== f.ruang
        ? { jumlahPesertaManual: '', jumlahHadirManual: '' }
        : {}),
    }))
  }

  // Otomatis: setelah jadwal, data guru, dan data peserta termuat, pilih sesi hari
  // ini (atau sesi terdekat berikutnya, atau yang pertama) dan isikan sekali saja.
  useEffect(() => {
    if (sudahOtomatis.current || sesiJadwal.length === 0 || guru.length === 0 || memuatSiswa) return
    sudahOtomatis.current = true
    const hariIni = isoHariIni()
    const pilih =
      sesiJadwal.find((s) => s.tanggal === hariIni) ||
      sesiJadwal.find((s) => s.tanggal >= hariIni) ||
      sesiJadwal[0]
    setSesiTerpilih(pilih.key)
    terapkanSesi(pilih, { timpa: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesiJadwal, guru, memuatSiswa])

  const pilihSesi = (e) => {
    const key = e.target.value
    setSesiTerpilih(key)
    const s = sesiJadwal.find((x) => x.key === key)
    if (s) terapkanSesi(s, { timpa: true })
  }

  // Terdaftar otomatis = jumlah peserta di ruang terpilih; hadir otomatis = terdaftar.
  const terdaftarOtomatis = useMemo(
    () => (form.ruang ? siswaSemua.filter((s) => s.ruangUjian === form.ruang).length : 0),
    [siswaSemua, form.ruang]
  )
  const jumlahPeserta = form.jumlahPesertaManual !== '' ? form.jumlahPesertaManual : String(terdaftarOtomatis)
  const jumlahHadir = form.jumlahHadirManual !== '' ? form.jumlahHadirManual : jumlahPeserta

  // Tidak hadir dihitung otomatis dari terdaftar - hadir.
  const tidakHadir = useMemo(() => {
    if (jumlahPeserta === '' || jumlahHadir === '') return ''
    return String(Math.max(0, Number(jumlahPeserta) - Number(jumlahHadir)))
  }, [jumlahPeserta, jumlahHadir])

  const hadirMelebihi = jumlahPeserta !== '' && jumlahHadir !== '' && Number(jumlahHadir) > Number(jumlahPeserta)

  // Pengawas II tidak boleh sama dengan Pengawas I, dan sebaliknya.
  const pilihanPengawas1 = useMemo(() => guru.filter((g) => g.id !== form.pengawas2Id), [guru, form.pengawas2Id])
  const pilihanPengawas2 = useMemo(() => guru.filter((g) => g.id !== form.pengawas1Id), [guru, form.pengawas1Id])

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  const namaRuang = isi(form.ruang, '…………')
  const pengawas1 = guruPerId[form.pengawas1Id]?.nama_lengkap || '…………'
  const pengawas2 = guruPerId[form.pengawas2Id]?.nama_lengkap || '…………'
  const hariTanggal = formatHariTanggal(form.tanggal)
  const tempatTanggal = `${isi(tempatSekolah, '…………')}, ${hariTanggal}`

  return (
    <Layout title="Berita Acara Ujian" subtitle="Berita acara pelaksanaan ujian per ruang, siap cetak.">
      <style>{`
        @page { size: A4; margin: 15mm 18mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-ba, #area-cetak-ba * { visibility: visible; }
          #area-cetak-ba {
            position: absolute; left: 0; top: 0; width: 100%;
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            max-width: none !important; margin: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          #area-cetak-ba .catatan-kejadian { background: #fff !important; border-color: #000 !important; }
          #area-cetak-ba .garis-nama { text-decoration-color: #000 !important; }
          #area-cetak-ba .ttd-blok { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print max-w-2xl mx-auto mb-5">
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
            Data peserta belum bisa dibaca ({galatSiswa}). Jumlah peserta bisa diisi manual.
          </div>
        )}

        <Bagian
          judul="Ruang & mata pelajaran"
          keterangan="Terisi otomatis dari Jadwal Pengawas Ruang; pilih sesi lain di dropdown atau ubah manual."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Field label="Ambil dari jadwal pengawas">
                {sesiJadwal.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                    Belum ada jadwal pengawas tersimpan. Isi dulu di halaman Jadwal Pengawas Ruang, lalu buka
                    halaman ini lagi.
                  </p>
                ) : (
                  <select className={inputCls} value={sesiTerpilih} onChange={pilihSesi}>
                    <option value="">— pilih sesi —</option>
                    {sesiJadwal.map((s) => (
                      <option key={s.key} value={s.key}>
                        {labelTanggal(s.tanggal)} • {s.waktu || '…'} • {s.mapel || '(mapel belum diisi)'}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Ruang ujian" keterangan="Daftar diambil dari ruang yang sudah diisi lewat Pengaturan Ruang.">
              {daftarRuang.length > 0 ? (
                <select className={inputCls} value={form.ruang} onChange={ubahRuang}>
                  {daftarRuang.map((r) => (
                    <option key={r} value={r}>Ruang {r}</option>
                  ))}
                </select>
              ) : (
                <input className={inputCls} value={form.ruang} onChange={ubahRuang} placeholder="mis. 1" />
              )}
            </Field>
            <Field label="Mata pelajaran / kegiatan">
              <input className={inputCls} value={form.mataPelajaran} onChange={ubah('mataPelajaran')} />
            </Field>
            <Field label="Tanggal">
              <input type="date" className={inputCls} value={form.tanggal} onChange={ubah('tanggal')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Jumlah peserta"
          keterangan="Terdaftar diambil dari data siswa ruang ini; hadir dianggap sama dengan terdaftar. Ketik angka lain bila ada yang tidak hadir, kosongkan untuk kembali otomatis."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Terdaftar">
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.jumlahPesertaManual}
                onChange={ubah('jumlahPesertaManual')}
                placeholder={`otomatis: ${terdaftarOtomatis}`}
              />
            </Field>
            <Field label="Hadir">
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.jumlahHadirManual}
                onChange={ubah('jumlahHadirManual')}
                placeholder={`otomatis: ${jumlahPeserta}`}
              />
            </Field>
            <Field label="Tidak hadir (otomatis)">
              <input className={`${inputCls} bg-slate-50`} value={tidakHadir} readOnly tabIndex={-1} />
            </Field>
          </div>
          {hadirMelebihi && (
            <p className="mt-2 text-xs text-amber-700">Jumlah hadir melebihi jumlah terdaftar, mohon dicek.</p>
          )}
        </Bagian>

        <Bagian
          judul="Pengawas ruang"
          keterangan="Terisi otomatis sesuai sesi jadwal yang dipilih; bisa diganti atau dikosongkan."
        >
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

        <Bagian judul="Catatan kejadian">
          <Field label="Catatan selama ujian">
            <textarea className={inputCls} rows={3} value={form.catatanKejadian} onChange={ubah('catatanKejadian')} />
          </Field>
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

      <div id="area-cetak-ba" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-[13.5px] leading-relaxed text-slate-800">
        <div className="text-center mb-6">
          <p className="font-display text-base font-bold">BERITA ACARA PELAKSANAAN UJIAN</p>
          <p>{namaSekolah} — Tahun Pelajaran {tapel}</p>
        </div>

        <p className="mb-4">
          Pada hari ini, <strong>{hariTanggal}</strong>, telah dilaksanakan {isi(form.mataPelajaran)} di{' '}
          <strong>Ruang {namaRuang}</strong>, {namaSekolah}, dengan rincian sebagai berikut:
        </p>

        <table className="w-full mb-4">
          <tbody>
            <Baris label="Jumlah peserta terdaftar" nilai={isi(jumlahPeserta)} />
            <Baris label="Jumlah peserta hadir" nilai={isi(jumlahHadir)} />
            <Baris label="Jumlah peserta tidak hadir" nilai={isi(tidakHadir)} />
            <Baris label="Pengawas ruang" nilai={`${pengawas1} & ${pengawas2}`} />
          </tbody>
        </table>

        <p className="mb-1 font-medium">Catatan kejadian selama ujian:</p>
        <p className="catatan-kejadian mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {isi(form.catatanKejadian)}
        </p>

        <p className="mb-6">
          Demikian berita acara ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <div className="ttd-blok">
          <p className="text-right mb-4">{tempatTanggal}</p>

          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="mb-16">Pengawas Ruang I</p>
              <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">{pengawas1}</p>
            </div>
            <div>
              <p className="mb-16">Pengawas Ruang II</p>
              <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">{pengawas2}</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p>Mengetahui,</p>
            <p className="mb-16">Kepala {namaSekolah}</p>
            <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">
              {isi(sekolah.kepala, 'Nama Kepala Sekolah')}
            </p>
            {sekolah.nipKepala && <p>NIP. {sekolah.nipKepala}</p>}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Baris({ label, nilai }) {
  return (
    <tr>
      <td className="py-0.5 pr-3 align-top text-slate-500 w-56">{label}</td>
      <td className="py-0.5 align-top">: {nilai}</td>
    </tr>
  )
}
