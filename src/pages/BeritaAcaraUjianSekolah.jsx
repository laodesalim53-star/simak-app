import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  KopSK,
  LembarSK,
  SEKOLAH_KOSONG,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isoHariIni,
} from './CetakSK'

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
  const { sekolahId } = useAuth()
  const sudahMuat = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)

  const [sk, setSk] = useState({
    tanggalPelaksanaan: isoHariIni(),
    tahunPelajaran: TAHUN_PELAJARAN_AWAL,
    pukulMulai: '',
    pukulSelesai: '',
    ruang: '',
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
    pengawas1Nama: '',
    pengawas1Nip: '',
    pengawas2Nama: '',
    pengawas2Nip: '',
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
      const ps = await ambilProfilSekolah(sekolahId)
      setSekolah(ps.sekolah)
      sudahMuat.current = true
    } catch (e) {
      console.error('Gagal memuat data Berita Acara Ujian Sekolah:', e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))

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
      <BarAtasCetak onKembali={() => navigate('/gudang-sk/portal-ujian')} judul="Berita Acara Ujian" />

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

        <Bagian judul="a. Pelaksanaan Ujian Sekolah" keterangan="Tanggal, jam, ruang, dan jumlah peserta.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tanggal pelaksanaan">
              <input type="date" className={inputCls} value={sk.tanggalPelaksanaan} onChange={ubahSk('tanggalPelaksanaan')} />
            </Field>
            <Field label="Ruang">
              <input className={inputCls} value={sk.ruang} onChange={ubahSk('ruang')} placeholder="mis. I (Satu)" />
            </Field>
            <Field label="Pukul mulai">
              <input type="time" className={inputCls} value={sk.pukulMulai} onChange={ubahSk('pukulMulai')} />
            </Field>
            <Field label="Pukul selesai">
              <input type="time" className={inputCls} value={sk.pukulSelesai} onChange={ubahSk('pukulSelesai')} />
            </Field>
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

        <Bagian judul="Pengawas" keterangan="Dua pengawas yang membuat dan menandatangani berita acara, berdampingan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama Pengawas I">
              <input className={inputCls} value={sk.pengawas1Nama} onChange={ubahSk('pengawas1Nama')} />
            </Field>
            <Field label="NIP Pengawas I">
              <input className={inputCls} value={sk.pengawas1Nip} onChange={ubahSk('pengawas1Nip')} inputMode="numeric" />
            </Field>
            <Field label="Nama Pengawas II">
              <input className={inputCls} value={sk.pengawas2Nama} onChange={ubahSk('pengawas2Nama')} />
            </Field>
            <Field label="NIP Pengawas II">
              <input className={inputCls} value={sk.pengawas2Nip} onChange={ubahSk('pengawas2Nip')} inputMode="numeric" />
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
                  <BarisRincian label="Jumlah Peserta Seharusnya" nilai={isi(sk.jumlahSeharusnya, '…')} satuan="Orang" />
                  <BarisRincian label="Jumlah Peserta Yang Tidak Hadir" nilai={isi(sk.jumlahTidakHadir, '0')} satuan="Orang" />
                  <BarisRincian label="Yaitu Nomor" nilai={isi(sk.nomorTidakHadir, '-')} />
                  <BarisRincian label="Jumlah Peserta yang Hadir" nilai={isi(sk.jumlahHadir, '…')} satuan="Orang" />
                  <BarisRincian label="Yaitu Nomor" nilai={isi(sk.nomorHadir, '-')} />
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
                        <td>{isi(sk.pengawas1Nama, '…')}</td>
                      </tr>
                      <tr>
                        <td className="no">3.</td>
                        <td className="label">NIP</td>
                        <td className="titik">:</td>
                        <td>{isi(sk.pengawas1Nip, '…')}</td>
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
                        <td>{isi(sk.pengawas2Nama, '…')}</td>
                      </tr>
                      <tr>
                        <td className="no">3.</td>
                        <td className="label">NIP</td>
                        <td className="titik">:</td>
                        <td>{isi(sk.pengawas2Nip, '…')}</td>
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
