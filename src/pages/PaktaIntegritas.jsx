import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  BlokTTD,
  FieldSK as Field,
  GayaCetakSK,
  KopSK,
  LembarSK,
  SEKOLAH_KOSONG,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// PaktaIntegritas — komponen untuk lembar Pakta Integritas Kepala Sekolah,
// dibuat mengikuti format contoh (Pakta Integritas Pelaksanaan Asesmen
// Sekolah, SD Negeri Waria) dan pola tampilan/kop yang sama dengan halaman SK
// lain (lihat SKPenugasanTunggal.jsx / CetakSK.jsx). Berbeda dari SK: tidak
// ada Menimbang/Mengingat/Memutuskan — hanya judul, alinea pembuka, poin
// pernyataan bernomor angka, dua alinea penutup, dan tanda tangan Kepala
// Sekolah seorang diri.
//
// Route disarankan: /gudang-sk/pakta-integritas
// Dipakai sebagai kartu baru di GudangSK.jsx.
//
// Semua bagian teks (judul, alinea pembuka, poin, alinea penutup) bisa
// diedit lewat panel isian, supaya lembar ini bisa dipakai ulang untuk
// pakta integritas kegiatan lain (bukan cuma Asesmen Sekolah), tinggal ganti
// teksnya. Penanda di teks: {sekolah}, {tahun}/{tp}, {kegiatan}.
// ─────────────────────────────────────────────────────────────────────────────

const JUDUL_1_AWAL = 'PAKTA INTEGRITAS KEPALA SEKOLAH'
const JUDUL_2_AWAL = 'PELAKSANAAN ASESMEN SEKOLAH'
const KEGIATAN_AWAL = 'Asesmen Sekolah ( AS )'

const PEMBUKA_AWAL =
  'Dalam rangka pelaksanaan {kegiatan} Tahun Pelajaran {tp} Saya Kepala Sekolah {sekolah} Dengan Ini Menyatakan Bahwa Saya:'

const POIN_AWAL = [
  'Sanggup meningkatkan kualitas, kreabilitas, akuntabilitas pelaksanaan Asesmen Sekolah untuk meningkatkan mutu Pendidikan;',
  'Sanggup melaksanakan tugas penyelenggaraan sesuai Juknis Asesmen Sekolah dan Menyukseskan pelaksanaan Asesmen Sekolah;',
  'Sanggup menjaga keamanan dan kerahasiaan bahan Asesmen Sekolah; dan',
  'Sanggup melaksanakan Asesmen Sekolah Secara JUJUR.',
].join('\n')

const PENUTUP_AWAL = [
  'Dengan demikian pakta integritas ini saya buat dengan sebenar-benarnya tanpa ada unsur paksaan dari pihak manapun.',
  'Apabila saya melanggar hal-hal yang telah dinyatakan dalam pakta integritas ini, saya bersedia dikenakan sangksi sesuai dengan hukum dan ketentuan peraturan perundang-undangan yang berlaku.',
].join('\n')

// Daftar bernomor angka (1. 2. 3. …) — sama gaya dengan diktum Mengingat di SK.
function DaftarAngka({ items }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{i + 1}.</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

// CSS pemadatan khusus supaya lembar (judul + poin + 2 alinea + TTD) muat di
// satu halaman A4, sama semangatnya dengan .sk-print-compact di
// SKPenugasanTunggal.jsx tapi di-scope terpisah (.pi-print-compact) supaya
// tidak saling memengaruhi kalau kedua komponen dipakai bersamaan.
function GayaPadatSatuHalaman() {
  return (
    <style>{`
      .pi-print-compact .lembar-sk {
        font-size: 11.5pt;
        line-height: 1.35;
      }
      .pi-print-compact .sk-kop {
        padding-bottom: 4px;
        margin-bottom: 10px;
      }
      .pi-print-compact .pi-judul {
        text-align: center;
        font-weight: bold;
        text-decoration: underline;
        margin: 2px 0;
      }
      .pi-print-compact .pi-pembuka {
        margin: 14px 0 8px;
        text-align: justify;
      }
      .pi-print-compact .sk-item {
        margin: 0 0 4px;
      }
      .pi-print-compact .pi-penutup {
        margin: 14px 0 0;
        text-align: justify;
      }
      .pi-print-compact .pi-penutup p {
        margin: 0 0 6px;
      }
      .pi-print-compact .sk-ttd {
        margin-top: 18px;
      }
    `}</style>
  )
}

export default function PaktaIntegritas() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const sudahMuat = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    tempat: '',
    tanggal: isoHariIni(),
    tahun: tahunPelajaranSekarang(),
  })

  const [judul1, setJudul1] = useState(JUDUL_1_AWAL)
  const [judul2, setJudul2] = useState(JUDUL_2_AWAL)
  const [kegiatan, setKegiatan] = useState(KEGIATAN_AWAL)
  const [pembuka, setPembuka] = useState(PEMBUKA_AWAL)
  const [poin, setPoin] = useState(POIN_AWAL)
  const [penutup, setPenutup] = useState(PENUTUP_AWAL)

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
      const ps = await ambilProfilSekolah(sekolahId)
      setSekolah(ps.sekolah)
      if (ps.tempat && !sudahMuat.current) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))
      sudahMuat.current = true
    } catch (e) {
      console.error('Gagal memuat data Pakta Integritas:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tahun = isi(sk.tahun)
  const nilai = { sekolah: namaSekolah, tahun, tp: tahun, kegiatan: isi(kegiatan, 'kegiatan ini') }

  const teksPembuka = isiTemplate(pembuka, nilai)
  const daftarPoin = pecahBaris(poin).map((t) => isiTemplate(t, nilai))
  const daftarPenutup = pecahBaris(penutup).map((t) => isiTemplate(t, nilai))

  const skCetak = { tempat: sk.tempat, tanggal: sk.tanggal }

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadatSatuHalaman />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="Pakta Integritas Kepala Sekolah" />

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

        <Bagian judul="Data lembar" keterangan="Tempat, tanggal, dan tahun pelajaran yang tercetak di lembar.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahun} onChange={ubahSk('tahun')} placeholder="mis. 2026/2027" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Nama kegiatan (mis. untuk {kegiatan} di teks pembuka)">
              <input className={inputCls} value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} placeholder="mis. Asesmen Sekolah ( AS )" />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Judul" keterangan="Dua baris judul, tercetak tebal bergaris bawah di tengah lembar.">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Baris judul 1">
              <input className={inputCls} value={judul1} onChange={(e) => setJudul1(e.target.value)} />
            </Field>
            <Field label="Baris judul 2">
              <input className={inputCls} value={judul2} onChange={(e) => setJudul2(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Isi pernyataan"
          keterangan="Alinea pembuka satu baris. Poin pernyataan: satu baris = satu butir, tercetak bernomor 1. 2. 3. Alinea penutup: satu baris = satu alinea. Penanda otomatis: {sekolah}, {tahun}/{tp}, {kegiatan}."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Alinea pembuka">
              <textarea className={inputCls} rows={3} value={pembuka} onChange={(e) => setPembuka(e.target.value)} />
            </Field>
            <Field label="Poin pernyataan">
              <textarea className={inputCls} rows={6} value={poin} onChange={(e) => setPoin(e.target.value)} />
            </Field>
            <Field label="Alinea penutup">
              <textarea className={inputCls} rows={4} value={penutup} onChange={(e) => setPenutup(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Kop dan penandatangan" keterangan="Kop dan Kepala Sekolah diambil dari Profil Sekolah.">
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

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak ── */}
      <AreaLembar>
        <div className="pi-print-compact">
          <LembarSK>
            <KopSK sekolah={sekolah} />

            <p className="pi-judul">{judul1}</p>
            <p className="pi-judul">{judul2}</p>
            <p className="pi-judul">TAHUN PELAJARAN {tahun}</p>

            <p className="pi-pembuka">{teksPembuka}</p>

            <DaftarAngka items={daftarPoin} />

            <div className="pi-penutup">
              {daftarPenutup.map((teks, i) => (
                <p key={i}>{teks}</p>
              ))}
            </div>

            <BlokTTD sk={skCetak} sekolah={sekolah} />
          </LembarSK>
        </div>
      </AreaLembar>
    </div>
  )
}
