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
  TabelData,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  formatTanggalSK,
  inputSK as inputCls,
  isKepalaSekolah,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  urutkanGuru,
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SKPenugasanTunggal — komponen bersama untuk SK penetapan/pengangkatan SATU
// ORANG, dengan data (Nama/NIP/Pangkat-Golongan) langsung tertulis di diktum
// "Pertama" — TANPA lampiran, TANPA honor. Formatnya mengikuti contoh SK
// Bendahara Sekolah yang dipakai sekolah (Menimbang satu paragraf, ada
// Memperhatikan, diktum berlabel Pertama/Kedua/Ketiga/… bukan KESATU/KEDUA).
//
// Dipakai oleh:
//   • SK Bendahara BOS   (pages/SKBendaharaBOS.jsx)
//
// Sengaja file TERPISAH dari SKPenugasan.jsx (format banyak-orang + lampiran +
// honor, dipakai SK Honor Guru/Tenaga Kebersihan/Operator Dapodik) supaya SK
// itu semua tidak ikut berubah.
//
// Catatan spasi cetak: lembar ini punya CSS pemadatan khusus (lihat blok
// <style> di bawah, di-scope lewat class "sk-print-compact" yang HANYA
// membungkus <LembarSK>) supaya isi + blok tanda tangan (BlokTTD) muat di
// satu halaman A4. Ini sengaja tidak diletakkan di CetakSK.jsx supaya SK lain
// yang memakai komponen sama tidak ikut berubah spasinya.
//
// Bentuk `konfig`:
//   {
//     judulBar,            // judul di BarAtasCetak
//     labelTentang,         // baris "TENTANG …", huruf besar, mis. 'PENETAPAN BENDAHARA BOS'
//     jabatan,              // dipakai di "Untuk menjadi {jabatan} pada {sekolah}"
//     placeholderNomor,
//     menimbang,            // string, SATU alinea (boleh lebih dari satu baris kalau perlu, tanpa huruf a/b/c)
//     mengingat,            // string, satu butir per baris → tercetak bernomor 1. 2. 3.
//     memperhatikan,        // string, satu baris
//     diktumLain,           // string, satu butir per baris → jadi diktum Kedua, Ketiga, dst.
//                           //   (diktum "Pertama" dibuat otomatis dari data Personel di bawah)
//   }
// Penanda di teks: {sekolah}, {tahun}, {jabatan}.
// ─────────────────────────────────────────────────────────────────────────────

const URUTAN_DIKTUM = [
  'Pertama',
  'Kedua',
  'Ketiga',
  'Keempat',
  'Kelima',
  'Keenam',
  'Ketujuh',
  'Kedelapan',
  'Kesembilan',
  'Kesepuluh',
]

const tahunAnggaranSekarang = () => String(new Date().getFullYear())

// Daftar tanpa nomor/huruf — satu baris teks jadi satu alinea rata kiri-kanan,
// sesuai model (Menimbang tidak berpoin a./b./c.).
function DaftarPolos({ items }) {
  return items.map((teks, i) => (
    <p key={i} className="sk-justify">
      {teks}
    </p>
  ))
}

// Daftar bernomor angka (1. 2. 3.) — dipakai untuk Mengingat.
function DaftarAngka({ items }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{i + 1}.</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

// CSS pemadatan khusus lembar cetak SK satu-orang. Di-scope lewat
// ".sk-print-compact" (dibungkus hanya di sekitar <LembarSK>) supaya panel
// isian (no-print) dan komponen SK lain yang memakai CetakSK.jsx tidak
// ikut berubah. Tujuannya: kurangi jarak antar-paragraf/baris secukupnya
// agar BlokTTD tidak terdorong ke halaman 2.
function GayaPadatSatuHalaman() {
  return (
    <style>{`
      /* Ukuran & jarak dasar lembar — ini yang paling besar pengaruhnya:
         line-height 1.45 di CetakSK.jsx cukup lega untuk SK pendek dua
         halaman (Keputusan + Lampiran), tapi kepanjangan untuk SK satu
         halaman yang semua isinya (Menimbang…Keempat + TTD) harus muat
         di satu lembar bersama blok tanda tangan. */
      .sk-print-compact .lembar-sk {
        font-size: 11pt;
        line-height: 1.22;
      }

      /* Kop sekolah: logo dan jarak bawah dipadatkan */
      .sk-print-compact .sk-kop {
        padding-bottom: 4px;
        margin-bottom: 8px;
      }
      .sk-print-compact .sk-kop-logo {
        width: 16mm;
        height: 16mm;
      }
      .sk-print-compact .sk-kop-atas {
        font-size: 10.5pt;
      }
      .sk-print-compact .sk-kop-nama {
        font-size: 13pt;
        line-height: 1.15;
      }
      .sk-print-compact .sk-kop-alamat {
        font-size: 9.5pt;
      }

      /* Judul SK (Surat Keputusan…/Nomor/Tentang/…) */
      .sk-print-compact .sk-judul {
        margin-bottom: 6px;
      }
      .sk-print-compact .sk-judul p {
        margin: 1px 0;
      }
      .sk-print-compact .sk-judul .tentang {
        margin: 2px 0;
      }

      /* "Kepala …," dan "M E M U T U S K A N" */
      .sk-print-compact .sk-tengah {
        margin: 4px 0;
      }

      /* Tabel Menimbang/Mengingat/Memperhatikan dan Menetapkan/Pertama…Keempat */
      .sk-print-compact table.sk-def {
        margin-top: 3px;
        margin-bottom: 3px;
      }
      .sk-print-compact table.sk-def > tbody > tr > td {
        padding: 0 0 2px;
        vertical-align: top;
      }
      .sk-print-compact .sk-item {
        margin: 0;
      }
      .sk-print-compact .sk-justify {
        margin: 0;
      }

      /* Tabel Nama/NIP/Pangkat-Golongan di dalam diktum Pertama (TabelData) */
      .sk-print-compact .sk-data {
        margin: 2px 0 4px 8mm;
      }
      .sk-print-compact .sk-data td {
        padding: 0;
      }

      /* Blok tanda tangan — ruang kosong untuk ttd fisik dipangkas secukupnya,
         masih cukup untuk tanda tangan tapi tidak makan banyak halaman */
      .sk-print-compact .sk-ttd {
        margin-top: 8px;
      }
      .sk-print-compact .sk-ttd table {
        margin-bottom: 2px;
      }
      .sk-print-compact .sk-ttd .ruang {
        height: 14mm;
      }
    `}</style>
  )
}

export default function SKPenugasanTunggal({ konfig }) {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const sudahMuat = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    nomor: '',
    tempat: '',
    tanggal: isoHariIni(),
    tahun: tahunAnggaranSekarang(),
  })
  const [menimbang, setMenimbang] = useState(konfig.menimbang)
  const [mengingat, setMengingat] = useState(konfig.mengingat)
  const [memperhatikan, setMemperhatikan] = useState(konfig.memperhatikan || '')
  const [diktumLain, setDiktumLain] = useState(konfig.diktumLain || '')

  const [guru, setGuru] = useState([])
  const [orang, setOrang] = useState({ guruId: '', nama: '', nip: '', pangkatGol: '' })
  const [jabatanTugas, setJabatanTugas] = useState(konfig.jabatan || '')

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
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      const urut = urutkanGuru(gk.guru)
      const kepsek = urut.find(isKepalaSekolah)

      setSekolah({
        ...ps.sekolah,
        kepala: ps.sekolah.kepala || kepsek?.nama_lengkap || '',
        nipKepala: ps.sekolah.nipKepala || kepsek?.nip || '',
      })
      if (ps.tempat && !sudahMuat.current) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))
      setGuru(urut)
      sudahMuat.current = true
    } catch (e) {
      console.error(`Gagal memuat data ${konfig.judulBar}:`, e)
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
  const ubahOrang = (k) => (e) => setOrang((o) => ({ ...o, [k]: e.target.value }))

  function pilihGuru(guruId) {
    const g = guru.find((x) => x.id === guruId)
    setOrang({
      guruId,
      nama: g?.nama_lengkap || '',
      nip: g?.nip || '',
      pangkatGol: g?.pangkat_golongan || '',
    })
  }

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tahun = isi(sk.tahun)

  const nilai = { sekolah: namaSekolah, tahun, jabatan: isi(jabatanTugas) }

  const tentangBaris = [konfig.labelTentang, `TAHUN ANGGARAN ${tahun}`]
  const daftarMenimbang = pecahBaris(menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(mengingat).map((t) => isiTemplate(t, nilai))
  const teksMemperhatikan = isiTemplate(memperhatikan, nilai)
  const daftarDiktumLain = pecahBaris(diktumLain)
    .slice(0, URUTAN_DIKTUM.length - 1)
    .map((t) => isiTemplate(t, nilai))

  const skCetak = { nomor: sk.nomor, tempat: sk.tempat, tanggal: sk.tanggal }
  const namaOrang = isi(orang.nama)
  const nipOrang = isi(orang.nip)
  const pangkatGolOrang = isi(orang.pangkatGol)

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadatSatuHalaman />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul={konfig.judulBar} />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik data secara manual.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, dan tahun anggaran.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder={konfig.placeholderNomor || 'mis. 421.2/020/SD/2026'} />
            </Field>
            <Field label="Tahun anggaran">
              <input className={inputCls} value={sk.tahun} onChange={ubahSk('tahun')} placeholder="mis. 2026" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Personel" keterangan="Satu orang. Pilih dari Data Guru, atau isi manual untuk orang yang tidak ada di Data Guru.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Guru/pegawai" className="sm:col-span-2">
              <select className={inputCls} value={orang.guruId} onChange={(e) => pilihGuru(e.target.value)}>
                <option value="">— isi manual —</option>
                {guru.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama_lengkap || '(tanpa nama)'}
                    {g.nip ? ` — NIP. ${g.nip}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nama">
              <input className={inputCls} value={orang.nama} onChange={ubahOrang('nama')} />
            </Field>
            <Field label="NIP (kosongkan kalau tidak ada)">
              <input className={inputCls} value={orang.nip} onChange={ubahOrang('nip')} inputMode="numeric" />
            </Field>
            <Field label="Pangkat/Golongan">
              <input className={inputCls} value={orang.pangkatGol} onChange={ubahOrang('pangkatGol')} placeholder="mis. Pengatur Tingkat I, II/c" />
            </Field>
            <Field label="Ditunjuk menjadi (jabatan/tugas)">
              <input className={inputCls} value={jabatanTugas} onChange={(e) => setJabatanTugas(e.target.value)} placeholder={konfig.jabatan} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Isi keputusan"
          keterangan="Menimbang: satu alinea (tanpa huruf a/b/c). Mengingat & diktum lain: satu baris = satu butir. Penanda otomatis: {sekolah}, {tahun}, {jabatan}."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Menimbang">
              <textarea className={inputCls} rows={4} value={menimbang} onChange={(e) => setMenimbang(e.target.value)} />
            </Field>
            <Field label="Mengingat">
              <textarea className={inputCls} rows={6} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
            <Field label="Memperhatikan">
              <input className={inputCls} value={memperhatikan} onChange={(e) => setMemperhatikan(e.target.value)} />
            </Field>
            <Field label="Diktum Kedua dan seterusnya (diktum Pertama dibuat otomatis dari data Personel)">
              <textarea className={inputCls} rows={6} value={diktumLain} onChange={(e) => setDiktumLain(e.target.value)} />
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
        <div className="sk-print-compact">
          <LembarSK>
            <KopSK sekolah={sekolah} />

            <div className="sk-judul">
              <p style={{ textDecoration: 'underline' }}>Surat Keputusan Kepala {namaSekolah}</p>
              <p>Nomor: {isi(sk.nomor)}</p>
              <p className="tentang">Tentang</p>
              {tentangBaris.map((baris, i) => (
                <p key={i}>{baris}</p>
              ))}
            </div>

            <p className="sk-tengah" style={{ marginTop: 4 }}>
              Kepala {namaSekolah},
            </p>

            <table className="sk-def">
              <tbody>
                <tr>
                  <td className="k">Menimbang</td>
                  <td className="t">:</td>
                  <td>
                    <DaftarPolos items={daftarMenimbang} />
                  </td>
                </tr>
                <tr>
                  <td className="k">Mengingat</td>
                  <td className="t">:</td>
                  <td>
                    <DaftarAngka items={daftarMengingat} />
                  </td>
                </tr>
                {teksMemperhatikan && (
                  <tr>
                    <td className="k">Memperhatikan</td>
                    <td className="t">:</td>
                    <td className="sk-justify">{teksMemperhatikan}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="sk-tengah">M E M U T U S K A N</p>

            <table className="sk-def">
              <tbody>
                <tr>
                  <td className="k">Menetapkan</td>
                  <td className="t">:</td>
                  <td></td>
                </tr>
                <tr>
                  <td className="k">Pertama</td>
                  <td className="t">:</td>
                  <td className="sk-justify">
                    <p style={{ margin: 0 }}>Mengangkat Saudara :</p>
                    <TabelData
                      baris={[
                        ['Nama', namaOrang],
                        ['NIP', nipOrang],
                        ['Pangkat/Golongan', pangkatGolOrang],
                      ]}
                    />
                    <p style={{ margin: 0 }}>
                      Untuk menjadi {isi(jabatanTugas)} pada {namaSekolah}.
                    </p>
                  </td>
                </tr>
                {daftarDiktumLain.map((teks, i) => (
                  <tr key={i}>
                    <td className="k">{URUTAN_DIKTUM[i + 1]}</td>
                    <td className="t">:</td>
                    <td className="sk-justify">{teks}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <BlokTTD sk={skCetak} sekolah={sekolah} />
          </LembarSK>
        </div>
      </AreaLembar>
    </div>
  )
}
