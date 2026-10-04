// src/pages/BeritaAcaraUjian.jsx
//
// Berita acara pelaksanaan ujian per ruang, otomatis sinkron dengan halaman lain
// dan bisa tercetak BEBERAPA HALAMAN sekaligus (model Pakta Integritas Pengawas):
//
// - SATU SESI PADA JADWAL = SATU LEMBAR. Tanggal, ruang, mata pelajaran, Pengawas I
//   & II (lengkap dengan NIP) diambil dari Jadwal Pengawas Ruang
//   (lib/jadwalPengawasStore, tersimpan di Supabase). Pilihan "Cetak untuk":
//   * satu tanggal (mis. Senin, 05 Okt 2026) -> semua ruang & sesi hari itu,
//   * semua sesi pada jadwal,
//   * satu lembar manual (isi sendiri).
//   Saat dibuka, tanggal yang dipilih adalah hari ini (atau tanggal jadwal
//   terdekat berikutnya, atau yang pertama).
// - Jumlah terdaftar per lembar: dari tabel `siswa` (Kelas 6, sudah punya
//   no_peserta_ujian, dikelompokkan per `ruang_ujian`) — logika sama dengan
//   DaftarHadirSiswaUjian.jsx. Hadir dianggap = terdaftar. Di mode lembar manual,
//   angka hadir bisa diketik bila ada yang tidak hadir.
// - Kop surat: sama dengan DaftarHadirSiswaUjian.jsx (Pemerintah Kabupaten > Dinas >
//   Nama Sekolah > Kecamatan, logo kabupaten kiri & logo sekolah kanan) dari
//   `profil_sekolah`. Tampil di setiap lembar.
// - Tempat & tanggal surat (kolom tanda tangan): tempat ikut Jadwal Pengawas Ruang
//   (cadangan: profil sekolah); tanggal surat = tanggal ujian lembar itu, ditulis
//   tanpa nama hari, mis. "Waria, 05 Oktober 2026". Tanggal surat bisa diganti
//   lewat isian "Tanggal surat" (kosong = ikut tanggal ujian tiap lembar).
// - Nama sekolah, Kepala Sekolah & NIP: ambilProfilSekolah.
//
// Catatan kejadian satu isian untuk semua lembar.

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

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// Format lengkap dengan nama hari: "Senin, 5 Oktober 2026" (untuk kalimat pembuka).
function formatHariTanggal(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Tanggal surat tanpa nama hari: "05 Oktober 2026".
function formatTanggalSurat(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
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
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // --- Peserta (dari tabel siswa) ---
  const [siswaSemua, setSiswaSemua] = useState([])
  const [memuatSiswa, setMemuatSiswa] = useState(true)
  const [galatSiswa, setGalatSiswa] = useState('')

  // --- Jadwal pengawas (dari halaman Jadwal Pengawas Ruang) ---
  const [sesiJadwal, setSesiJadwal] = useState([])
  const [jadwalTempat, setJadwalTempat] = useState('')
  const [sesiTerpilih, setSesiTerpilih] = useState('')
  const sudahOtomatis = useRef(false)

  // 'manual' = satu lembar dari isian form; 'semua' = semua sesi jadwal;
  // 'tgl:YYYY-MM-DD' = semua sesi pada satu tanggal.
  const [cetak, setCetak] = useState('manual')

  // Kosong = ikut jadwal pengawas / profil sekolah (untuk tempat) dan tanggal ujian (untuk tanggal).
  const [tempatManual, setTempatManual] = useState('')
  const [tanggalSuratManual, setTanggalSuratManual] = useState('')

  const [form, setForm] = useState({
    // Kop surat (terisi otomatis dari profil_sekolah).
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
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
      const [ps, gk, profRes] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
      ])
      const prof = profRes?.data || {}
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      setSekolah(ps.sekolah)
      setTempatSekolah(ps.tempat)
      setGuru(urutkanGuru(gk.guru))
      // Isian yang sudah diketik manual tidak ditimpa.
      setForm((f) => ({
        ...f,
        kabupaten: f.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || f.dinas,
        kecamatan: f.kecamatan || prof.kecamatan || '',
      }))
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
      if (batal) return
      setSesiJadwal(ratakanSesiJadwal(t))
      setJadwalTempat(t?.tempat || '')
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

  // Tanggal unik yang punya jadwal, untuk pilihan "Cetak untuk".
  const tanggalJadwal = useMemo(
    () => [...new Set(sesiJadwal.map((s) => s.tanggal).filter(Boolean))].sort(),
    [sesiJadwal]
  )

  // Otomatis pilih ruang pertama kalau belum ada pilihan (atau pilihan lama sudah hilang).
  useEffect(() => {
    if (daftarRuang.length === 0) return
    if (!form.ruang || !daftarRuang.includes(form.ruang)) {
      setForm((f) => ({ ...f, ruang: daftarRuang[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarRuang])

  // Pasang data satu sesi jadwal ke form manual.
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

  // Otomatis: setelah jadwal, data guru, dan data peserta termuat, pilih tanggal
  // hari ini (atau tanggal jadwal terdekat berikutnya, atau yang pertama): semua
  // lembar tanggal itu langsung tampil, dan form manual ikut terisi sesi pertamanya.
  useEffect(() => {
    if (sudahOtomatis.current || sesiJadwal.length === 0 || guru.length === 0 || memuatSiswa) return
    sudahOtomatis.current = true
    const hariIni = isoHariIni()
    const tanggalPilih =
      tanggalJadwal.find((t) => t === hariIni) ||
      tanggalJadwal.find((t) => t >= hariIni) ||
      tanggalJadwal[0]
    if (tanggalPilih) setCetak(`tgl:${tanggalPilih}`)
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

  // Terdaftar otomatis (mode manual) = jumlah peserta di ruang terpilih; hadir otomatis = terdaftar.
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

  // ── Daftar lembar yang dicetak ──
  // Mode jadwal: satu lembar per sesi (urut tanggal, jam, ruang). Mode manual
  // (atau belum ada jadwal): satu lembar dari isian form.
  const daftarLembar = useMemo(() => {
    let sesi = []
    if (cetak === 'semua') sesi = sesiJadwal
    else if (cetak.startsWith('tgl:')) sesi = sesiJadwal.filter((s) => s.tanggal === cetak.slice(4))

    if (sesi.length > 0) {
      return [...sesi]
        .sort(
          (a, b) =>
            String(a.tanggal).localeCompare(String(b.tanggal)) ||
            String(a.waktu).localeCompare(String(b.waktu), undefined, { numeric: true }) ||
            String(a.ruang).localeCompare(String(b.ruang), undefined, { numeric: true })
        )
        .map((s) => {
          const terdaftar = s.ruang ? siswaSemua.filter((x) => x.ruangUjian === s.ruang).length : 0
          return {
            key: s.key,
            tanggal: s.tanggal,
            ruang: s.ruang,
            mapel: s.mapel || form.mataPelajaran,
            g1: guruPerId[s.guru1Id] || null,
            g2: guruPerId[s.guru2Id] || null,
            terdaftar: String(terdaftar),
            hadir: String(terdaftar),
            tidak: '0',
          }
        })
    }

    return [
      {
        key: 'manual',
        tanggal: form.tanggal,
        ruang: form.ruang,
        mapel: form.mataPelajaran,
        g1: guruPerId[form.pengawas1Id] || null,
        g2: guruPerId[form.pengawas2Id] || null,
        terdaftar: jumlahPeserta,
        hadir: jumlahHadir,
        tidak: tidakHadir,
      },
    ]
  }, [
    cetak, sesiJadwal, siswaSemua, guruPerId, form.mataPelajaran, form.tanggal, form.ruang,
    form.pengawas1Id, form.pengawas2Id, jumlahPeserta, jumlahHadir, tidakHadir,
  ])

  const modeJadwal = daftarLembar[0]?.key !== 'manual'

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tapel = tahunPelajaranSekarang()
  // Tempat surat: isian manual, lalu jadwal pengawas, lalu profil sekolah.
  const tempatSurat = tempatManual || jadwalTempat || tempatSekolah

  return (
    <Layout title="Berita Acara Ujian" subtitle="Berita acara pelaksanaan ujian per ruang, siap cetak.">
      <style>{`
        @page { size: A4; margin: 15mm 18mm; }
        @media print {
          body * { visibility: hidden; }
          #area-cetak-ba, #area-cetak-ba * { visibility: visible; }
          #area-cetak-ba {
            position: absolute; left: 0; top: 0; width: 100%;
            max-width: none !important; margin: 0 !important; padding: 0 !important;
            font-family: 'Times New Roman', Times, serif;
            color: #000 !important;
          }
          /* Satu lembar = satu halaman. */
          #area-cetak-ba .ba-lembar {
            border: 0 !important; border-radius: 0 !important; padding: 0 !important;
            margin: 0 !important; max-width: none !important;
            page-break-after: always; break-after: page;
          }
          #area-cetak-ba .ba-lembar:last-child { page-break-after: auto; break-after: auto; }
          #area-cetak-ba .kop-surat { border-bottom-color: #000 !important; padding-bottom: 6px !important; margin-bottom: 14px !important; }
          #area-cetak-ba .kop-logo { width: 64px !important; height: 64px !important; }
          #area-cetak-ba .catatan-kejadian { background: #fff !important; border-color: #000 !important; }
          #area-cetak-ba .garis-nama { text-decoration-color: #000 !important; }
          #area-cetak-ba .ttd-blok { page-break-inside: avoid; }
        }
        /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
        #area-cetak-ba .kop-logo img {
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
            Data peserta belum bisa dibaca ({galatSiswa}). Jumlah peserta bisa diisi manual.
          </div>
        )}

        <Bagian
          judul="Berita acara yang dicetak"
          keterangan={
            sesiJadwal.length > 0
              ? `Diambil dari Jadwal Pengawas Ruang (${sesiJadwal.length} sesi). Satu sesi = satu lembar, lengkap dengan ruang, pengawas, dan NIP.`
              : 'Belum ada jadwal pengawas tersimpan. Isi dulu di halaman Jadwal Pengawas Ruang, lalu buka halaman ini lagi, atau isi lembar manual di bawah.'
          }
        >
          <Field label="Cetak untuk">
            <select className={inputCls} value={cetak} onChange={(e) => setCetak(e.target.value)}>
              <option value="manual">Satu lembar manual (isi sendiri)</option>
              {sesiJadwal.length > 0 && (
                <option value="semua">Semua sesi pada jadwal ({sesiJadwal.length} lembar)</option>
              )}
              {tanggalJadwal.map((t) => {
                const n = sesiJadwal.filter((s) => s.tanggal === t).length
                return (
                  <option key={t} value={`tgl:${t}`}>
                    {labelTanggal(t)} ({n} lembar)
                  </option>
                )
              })}
            </select>
          </Field>
        </Bagian>

        <Bagian
          judul="Kop surat"
          keterangan="Terisi otomatis dari Profil Sekolah; bisa diubah di sini, kosongkan yang tidak perlu ditampilkan."
        >
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
          </div>
        </Bagian>

        <Bagian
          judul="Tempat & tanggal surat"
          keterangan="Tempat ikut Jadwal Pengawas Ruang; tanggal surat ikut tanggal ujian tiap lembar. Isi kolom di bawah hanya bila ingin mengganti."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tempat">
              <input
                className={inputCls}
                value={tempatManual}
                onChange={(e) => setTempatManual(e.target.value)}
                placeholder={tempatSurat ? `otomatis: ${tempatSurat}` : 'Nama kota/kabupaten'}
              />
            </Field>
            <Field label="Tanggal surat">
              <input
                type="date"
                className={inputCls}
                value={tanggalSuratManual}
                onChange={(e) => setTanggalSuratManual(e.target.value)}
              />
              {tanggalSuratManual && (
                <button
                  type="button"
                  onClick={() => setTanggalSuratManual('')}
                  className="mt-1 text-xs text-blue-700 hover:underline"
                >
                  Kembali ikut tanggal ujian
                </button>
              )}
            </Field>
          </div>
        </Bagian>

        {!modeJadwal && (
          <>
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
          </>
        )}

        <Bagian
          judul="Catatan kejadian"
          keterangan={modeJadwal ? 'Berlaku untuk semua lembar yang dicetak.' : undefined}
        >
          <Field label="Catatan selama ujian">
            <textarea className={inputCls} rows={3} value={form.catatanKejadian} onChange={ubah('catatanKejadian')} />
          </Field>
        </Bagian>

        <p className="text-xs text-slate-500 mb-3">
          Pratinjau di bawah ({daftarLembar.length} lembar). Saat mencetak, matikan opsi "Header dan footer" di
          dialog cetak agar bersih.
        </p>

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

      {/* ── Lembar cetak: satu halaman per sesi ── */}
      <div id="area-cetak-ba" className="mx-auto max-w-3xl space-y-4">
        {daftarLembar.map((l) => {
          const pengawas1 = l.g1?.nama_lengkap || '…………'
          const pengawas2 = l.g2?.nama_lengkap || '…………'
          const nip1 = l.g1?.nip || '…………'
          const nip2 = l.g2?.nip || '…………'
          const hariTanggal = formatHariTanggal(l.tanggal)
          const namaRuang = isi(l.ruang, '…………')
          const tempatTanggal = `${isi(tempatSurat, '…………')}, ${formatTanggalSurat(tanggalSuratManual || l.tanggal)}`

          return (
            <div
              key={l.key}
              className="ba-lembar rounded-2xl border border-slate-200 bg-white p-8 text-[13.5px] leading-relaxed text-slate-800"
            >
              {/* Kop surat: logo kabupaten (kiri), teks di tengah, logo sekolah (kanan). */}
              <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
                {/* Kotak tetap ada walau logo kosong supaya teks tetap di tengah. */}
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

              <div className="text-center mb-6">
                <p className="font-display text-base font-bold uppercase">Berita Acara Pelaksanaan Ujian</p>
                <p>Tahun Pelajaran {tapel}</p>
              </div>

              <p className="mb-4">
                Pada hari ini, <strong>{hariTanggal}</strong>, telah dilaksanakan {isi(l.mapel)} di{' '}
                <strong>Ruang {namaRuang}</strong>, {namaSekolah}, dengan rincian sebagai berikut:
              </p>

              <table className="w-full mb-4">
                <tbody>
                  <Baris label="Jumlah peserta terdaftar" nilai={isi(l.terdaftar)} />
                  <Baris label="Jumlah peserta hadir" nilai={isi(l.hadir)} />
                  <Baris label="Jumlah peserta tidak hadir" nilai={isi(l.tidak)} />
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
                    <p>NIP. {nip1}</p>
                  </div>
                  <div>
                    <p className="mb-16">Pengawas Ruang II</p>
                    <p className="garis-nama font-semibold underline decoration-slate-400 underline-offset-4">{pengawas2}</p>
                    <p>NIP. {nip2}</p>
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
          )
        })}
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
