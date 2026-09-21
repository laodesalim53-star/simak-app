import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  HalamanKeputusan,
  HalamanLampiran,
  SEKOLAH_KOSONG,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
} from '../components/CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SK Beban Mengajar — halaman anak dari GudangSK (route: /gudang-sk/beban-mengajar)
//
// Sistem cetaknya mengikuti pola LaporanKepangkatanGuru.jsx (toolbar no-print,
// lembar-cetak print-only, @page) dan disatukan di components/CetakSK.jsx supaya
// SK lain (honor guru, tenaga kebersihan, dst) tinggal memakai ulang.
//
// Data diimpor otomatis:
//   • profil_sekolah → kop, alamat, kepala sekolah, NIP, logo, tempat penetapan
//   • guru (status aktif) → nama, NIP, tugas tambahan
//   • kelas → wali kelas tiap guru (kolom wali_kelas_id)
//
// Aturan baris Lampiran:
//   1. Kepala Sekolah SELALU di baris paling atas, jam = jam default (24),
//      diisi sebagai tugas tambahan.
//   2. Guru lain diurutkan golongan tertinggi dulu, lalu abjad — sama seperti
//      laporan kepangkatan/nominatif.
//   3. Setiap guru otomatis diberi jam default (24 jam / minggu). Kalau guru itu
//      wali kelas di menu Kelas, kolom Kelas terisi nama kelasnya dan Mata
//      Pelajaran terisi "Guru Kelas".
// Semua isian tetap bisa diubah manual setelah diimpor.
// ─────────────────────────────────────────────────────────────────────────────

const JAM_DEFAULT = '24'

let penghitungId = 0
const barisBaru = () => ({
  id: ++penghitungId,
  nama: '',
  nip: '',
  mapel: '',
  kelas: '',
  jam: '',
  tambahan: '',
  ket: '',
})

// {tahun} diganti otomatis dengan isi kolom "Tahun pelajaran" saat dokumen dirender,
// jadi mengubah tahun pelajaran ikut mengubah teks Menimbang/Mengingat.
const MENIMBANG_AWAL = [
  'bahwa untuk kelancaran pelaksanaan kegiatan belajar mengajar pada Tahun Pelajaran {tahun}, perlu dilakukan pembagian tugas mengajar guru;',
  'bahwa guru yang namanya tercantum dalam Lampiran Keputusan ini dinilai memenuhi syarat dan mampu melaksanakan tugas tersebut;',
  'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala Sekolah tentang Pembagian Tugas Mengajar Guru.',
].join('\n')

// Dasar hukum bawaan — SESUAIKAN dengan aturan yang berlaku di lembaga Anda
// (misalnya madrasah di bawah Kemenag memakai dasar hukum yang berbeda).
const MENGINGAT_AWAL = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan, sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022;',
  'Peraturan Menteri Pendidikan dan Kebudayaan Nomor 15 Tahun 2018 tentang Pemenuhan Beban Kerja Guru, Kepala Sekolah, dan Pengawas Sekolah;',
  'Kalender pendidikan dan struktur kurikulum sekolah Tahun Pelajaran {tahun}.',
].join('\n')

// ─── Impor guru & kelas ──────────────────────────────────────────────────────
// Deteksi & urutan disalin dari LaporanKepangkatanGuru.jsx supaya konsisten.
function isKepalaSekolah(g) {
  const jabatan = `${g.tugas_tambahan || ''} ${g.jenis_ptk || ''}`.toLowerCase()
  return jabatan.includes('kepala sekolah')
}

function peringkatGolongan(teks) {
  if (!teks) return 0
  const cocok = teks.toUpperCase().match(/(IX|VIII|VII|VI|IV|III|II|I|V)[\s./-]?([A-D])?/)
  if (!cocok) return 0
  const romawi = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }
  const huruf = cocok[2] ? cocok[2].charCodeAt(0) - 64 : 0
  return (romawi[cocok[1]] || 0) * 10 + huruf
}

function urutkanGuru(daftar) {
  return [...daftar].sort((a, b) => {
    const aKS = isKepalaSekolah(a) ? 0 : 1
    const bKS = isKepalaSekolah(b) ? 0 : 1
    if (aKS !== bKS) return aKS - bKS
    const selisih = peringkatGolongan(b.pangkat_golongan) - peringkatGolongan(a.pangkat_golongan)
    if (selisih !== 0) return selisih
    return (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '')
  })
}

async function ambilGuruDanKelas(sekolahId) {
  const [rg, rk] = await Promise.all([
    supabase
      .from('guru')
      .select('id, nip, nama_lengkap, pangkat_golongan, tugas_tambahan, jenis_ptk, status')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'aktif'),
    supabase
      .from('kelas')
      .select('id, nama_kelas, tingkat, wali_kelas_id')
      .eq('sekolah_id', sekolahId)
      .order('nama_kelas'),
  ])
  const galat = rg.error || rk.error
  if (galat) throw galat
  return { guru: rg.data || [], kelas: rk.data || [] }
}

function susunBaris(guru, kelas, profil, jam) {
  // Peta: id guru → daftar nama kelas yang dia walikan
  const kelasPerGuru = {}
  kelas.forEach((k) => {
    if (!k.wali_kelas_id) return
    if (!kelasPerGuru[k.wali_kelas_id]) kelasPerGuru[k.wali_kelas_id] = []
    kelasPerGuru[k.wali_kelas_id].push(k.nama_kelas)
  })

  const baris = urutkanGuru(guru).map((g) => {
    if (isKepalaSekolah(g)) {
      return {
        ...barisBaru(),
        nama: g.nama_lengkap || '',
        nip: g.nip || '',
        mapel: 'Kepala Sekolah',
        kelas: '-',
        jam: String(jam),
        tambahan: 'Tugas tambahan Kepala Sekolah',
      }
    }
    const kls = kelasPerGuru[g.id] || []
    return {
      ...barisBaru(),
      nama: g.nama_lengkap || '',
      nip: g.nip || '',
      mapel: kls.length ? 'Guru Kelas' : '',
      kelas: kls.join(', '),
      jam: String(jam),
      tambahan: g.tugas_tambahan || '',
    }
  })

  // Kepala sekolah belum ada di Data Guru → tetap ditaruh paling atas dari Profil Sekolah.
  if (!guru.some(isKepalaSekolah) && profil?.kepala_sekolah) {
    baris.unshift({
      ...barisBaru(),
      nama: profil.kepala_sekolah,
      nip: profil.nip_kepala_sekolah || '',
      mapel: 'Kepala Sekolah',
      kelas: '-',
      jam: String(jam),
      tambahan: 'Tugas tambahan Kepala Sekolah',
    })
  }

  return baris.length ? baris : [barisBaru(), barisBaru(), barisBaru()]
}

// ─── Halaman ─────────────────────────────────────────────────────────────────
export default function SKBebanMengajar() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const tpAwal = tahunPelajaranSekarang()

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    nomor: '',
    tahunPelajaran: tpAwal,
    tempat: '',
    tanggal: isoHariIni(),
    minimalJam: JAM_DEFAULT,
    sumberDana: 'Dana BOS dan sumber lain yang sah',
  })
  const [menimbang, setMenimbang] = useState(MENIMBANG_AWAL)
  const [mengingat, setMengingat] = useState(MENGINGAT_AWAL)
  const [baris, setBaris] = useState(() => [barisBaru(), barisBaru(), barisBaru()])

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')

  // Ambil Profil Sekolah + Guru + Kelas, lalu isi kop dan daftar Lampiran.
  async function muatDariData(jam) {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      const kepsekGuru = gk.guru.find(isKepalaSekolah)

      setSekolah({
        ...ps.sekolah,
        kepala: ps.sekolah.kepala || kepsekGuru?.nama_lengkap || '',
        nipKepala: ps.sekolah.nipKepala || kepsekGuru?.nip || '',
      })
      if (ps.tempat) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))

      setBaris(susunBaris(gk.guru, gk.kelas, ps.profil, jam))
      setRingkas(`${gk.guru.length} guru aktif dan ${gk.kelas.length} kelas terbaca.`)
    } catch (e) {
      console.error('Gagal memuat data SK Beban Mengajar:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData(JAM_DEFAULT)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  function imporUlang() {
    const yakin = window.confirm(
      'Ganti seluruh daftar guru di Lampiran dengan data terbaru dari Data Guru dan Kelas? Perubahan manual pada daftar akan hilang.'
    )
    if (yakin) muatDariData(sk.minimalJam || JAM_DEFAULT)
  }

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))
  const ubahBaris = (id, k, v) =>
    setBaris((list) => list.map((r) => (r.id === id ? { ...r, [k]: v } : r)))
  const tambahBaris = () => setBaris((list) => [...list, barisBaru()])
  const hapusBaris = (id) => setBaris((list) => (list.length > 1 ? list.filter((r) => r.id !== id) : list))

  // ── Bahan dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahunPelajaran)
  const gantiTahun = (teks) => teks.replace(/\{tahun\}/g, tp)
  const total = baris.reduce((a, r) => a + (parseFloat(String(r.jam).replace(',', '.')) || 0), 0)
  const totalTeks = Number.isInteger(total) ? String(total) : total.toFixed(1)

  const diktum = [
    ['KESATU', `Menugaskan guru yang namanya tercantum dalam Lampiran Keputusan ini untuk melaksanakan tugas mengajar pada ${namaSekolah} Tahun Pelajaran ${tp} sesuai dengan mata pelajaran, kelas, dan jumlah jam pelajaran sebagaimana tercantum dalam Lampiran.`],
    ['KEDUA', `Beban kerja guru sebagaimana dimaksud pada diktum KESATU paling sedikit ${isi(sk.minimalJam, '24')} (jam tatap muka) per minggu, termasuk tugas tambahan yang diakui sebagai ekuivalen jam mengajar.`],
    ['KETIGA', 'Dalam melaksanakan tugasnya, guru wajib merencanakan, melaksanakan, dan menilai pembelajaran, membimbing peserta didik, serta melaporkan pelaksanaan tugasnya kepada Kepala Sekolah.'],
    ['KEEMPAT', `Segala biaya yang timbul akibat ditetapkannya Keputusan ini dibebankan pada ${isi(sk.sumberDana, 'anggaran sekolah')}.`],
    ['KELIMA', 'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.'],
  ]

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="SK Beban Mengajar" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah, guru, dan kelas…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}). Isian di bawah bisa diisi manual, atau coba impor ulang.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} Kepala Sekolah ditaruh di baris pertama Lampiran.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tahun pelajaran, dan tempat/tanggal penetapan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder="mis. 001/SK/2026" />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahunPelajaran} onChange={ubahSk('tahunPelajaran')} placeholder="2026/2027" />
            </Field>
            <Field label="Jam tatap muka / minggu (per guru)">
              <input className={inputCls} value={sk.minimalJam} onChange={ubahSk('minimalJam')} inputMode="numeric" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Sumber biaya">
              <input className={inputCls} value={sk.sumberDana} onChange={ubahSk('sumberDana')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Kop dan pejabat penandatangan"
          keterangan="Diambil dari Profil Sekolah. Tampil di kop surat dan blok tanda tangan."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Baris atas kop (satu baris per garis)" className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={sekolah.kopAtas} onChange={ubahSekolah('kopAtas')} />
            </Field>
            <Field label="Nama sekolah">
              <input className={inputCls} value={sekolah.nama} onChange={ubahSekolah('nama')} />
            </Field>
            <Field label="NPSN">
              <input className={inputCls} value={sekolah.npsn} onChange={ubahSekolah('npsn')} inputMode="numeric" />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <input className={inputCls} value={sekolah.alamat} onChange={ubahSekolah('alamat')} />
            </Field>
            <Field label="Nama kepala sekolah">
              <input className={inputCls} value={sekolah.kepala} onChange={ubahSekolah('kepala')} />
            </Field>
            <Field label="NIP kepala sekolah">
              <input className={inputCls} value={sekolah.nipKepala} onChange={ubahSekolah('nipKepala')} inputMode="numeric" />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Menimbang dan Mengingat"
          keterangan="Satu poin per baris. {tahun} otomatis diganti tahun pelajaran. Dasar hukum bawaan hanya contoh umum: cek dan sesuaikan dengan aturan yang berlaku di lembaga Anda."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Field label="Menimbang (a, b, c, …)">
              <textarea className={inputCls} rows={8} value={menimbang} onChange={(e) => setMenimbang(e.target.value)} />
            </Field>
            <Field label="Mengingat (1, 2, 3, …)">
              <textarea className={inputCls} rows={8} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Daftar guru (Lampiran)"
          keterangan="Terisi dari Data Guru dan Kelas: kepala sekolah di atas, guru lain otomatis sesuai jam per guru. Jumlah jam dihitung otomatis."
          aksi={
            <button
              type="button"
              onClick={imporUlang}
              disabled={memuat || !sekolahId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Impor ulang dari Data Guru
            </button>
          }
        >
          <div className="space-y-3">
            {baris.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">Guru {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => hapusBaris(r.id)}
                    disabled={baris.length === 1}
                    aria-label={`Hapus baris guru ${i + 1}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <Field label="Nama guru" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.nama} onChange={(e) => ubahBaris(r.id, 'nama', e.target.value)} />
                  </Field>
                  <Field label="NIP" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.nip} onChange={(e) => ubahBaris(r.id, 'nip', e.target.value)} inputMode="numeric" />
                  </Field>
                  <Field label="Mata pelajaran / tugas" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.mapel} onChange={(e) => ubahBaris(r.id, 'mapel', e.target.value)} placeholder="mis. Matematika, atau Guru Kelas" />
                  </Field>
                  <Field label="Kelas">
                    <input className={inputCls} value={r.kelas} onChange={(e) => ubahBaris(r.id, 'kelas', e.target.value)} />
                  </Field>
                  <Field label="Jam / minggu">
                    <input className={inputCls} value={r.jam} onChange={(e) => ubahBaris(r.id, 'jam', e.target.value)} inputMode="decimal" />
                  </Field>
                  <Field label="Tugas tambahan" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.tambahan} onChange={(e) => ubahBaris(r.id, 'tambahan', e.target.value)} placeholder="mis. Wali Kelas VI" />
                  </Field>
                  <Field label="Keterangan" className="col-span-2 sm:col-span-3">
                    <input className={inputCls} value={r.ket} onChange={(e) => ubahBaris(r.id, 'ket', e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={tambahBaris}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-700"
          >
            <Plus size={15} /> Tambah guru
          </button>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak: halaman 1 Keputusan, halaman 2 Lampiran ── */}
      <AreaLembar>
        <HalamanKeputusan
          sk={sk}
          sekolah={sekolah}
          tentang={`Pembagian Tugas Mengajar Guru pada ${namaSekolah} Tahun Pelajaran ${tp}`}
          menimbang={pecahBaris(menimbang).map(gantiTahun)}
          mengingat={pecahBaris(mengingat).map(gantiTahun)}
          diktum={diktum}
        />

        <HalamanLampiran
          sk={sk}
          sekolah={sekolah}
          judul={['Pembagian Tugas Mengajar Guru', `Tahun Pelajaran ${tp}`]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '8mm' }}>No</th>
                <th>Nama / NIP</th>
                <th>Mata Pelajaran / Tugas</th>
                <th style={{ width: '16mm' }}>Kelas</th>
                <th style={{ width: '16mm' }}>Jam / Minggu</th>
                <th>Tugas Tambahan</th>
                <th>Ket.</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((r, i) => (
                <tr key={r.id}>
                  <td className="c">{i + 1}</td>
                  <td>
                    {r.nama || '\u00A0'}
                    {r.nip && (
                      <>
                        <br />
                        <span className="nip">NIP. {r.nip}</span>
                      </>
                    )}
                  </td>
                  <td>{r.mapel}</td>
                  <td className="c">{r.kelas}</td>
                  <td className="c">{r.jam}</td>
                  <td>{r.tambahan}</td>
                  <td>{r.ket}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                  Jumlah jam
                </td>
                <td className="c" style={{ fontWeight: 700 }}>
                  {totalTeks}
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </HalamanLampiran>
      </AreaLembar>
    </div>
  )
}
