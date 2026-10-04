import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ambilPengawasJadwal, muatJadwalPengawas } from '../lib/jadwalPengawasStore'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  LembarSK,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
  urutkanGuru,
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// PaktaIntegritasPengawas — lembar Pakta Integritas untuk GURU PENGAWAS RUANG,
// pasangan dari PaktaIntegritas.jsx (Kepala Sekolah). Pola yang dipakai sama
// dengan halaman ujian lain yang sudah disinkronkan:
// - KOP: pola resmi (Pemerintah Kabupaten > Dinas > Nama Sekolah > Kecamatan)
//   dengan logo kabupaten (kiri) & logo sekolah (kanan) dari profil_sekolah.
// - PENGAWAS: diambil otomatis dari Jadwal Pengawas Ruang (lib/jadwalPengawasStore).
//   Default mencetak SATU LEMBAR PER PENGAWAS (A, B, C, …), nama & NIP dari data
//   guru. Bisa juga memilih satu guru saja lewat dropdown.
// - Tempat, tanggal surat, dan tahun pelajaran ikut jadwal pengawas (bisa diubah).
// - Tanda tangan: pengawas (kanan) dan Kepala Sekolah "Mengetahui" (kiri, bisa
//   dimatikan).
//
// Semua teks (judul, alinea pembuka, poin, penutup) bisa diedit lewat panel isian.
// Penanda di teks: {sekolah}, {tahun}/{tp}, {kegiatan}.
//
// Route disarankan: /gudang-sk/portal-ujian/pakta-integritas-pengawas
// ─────────────────────────────────────────────────────────────────────────────

const JUDUL_1_AWAL = 'PAKTA INTEGRITAS PENGAWAS RUANG'
const JUDUL_2_AWAL = 'PELAKSANAAN ASESMEN SEKOLAH'
const KEGIATAN_AWAL = 'Asesmen Sekolah ( AS )'

const PEMBUKA_AWAL =
  'Dalam rangka pelaksanaan {kegiatan} Tahun Pelajaran {tp} di {sekolah}, saya selaku Pengawas Ruang dengan ini menyatakan bahwa saya:'

const POIN_AWAL = [
  'Sanggup melaksanakan tugas sebagai Pengawas Ruang sesuai Juknis {kegiatan} dan jadwal yang telah ditetapkan;',
  'Sanggup hadir tepat waktu dan mengawasi pelaksanaan {kegiatan} dengan tertib, tanpa meninggalkan ruang tanpa alasan yang sah;',
  'Sanggup menjaga keamanan dan kerahasiaan naskah soal, lembar jawaban, dan bahan {kegiatan} lainnya;',
  'Tidak memberikan bantuan, kunci jawaban, atau melakukan kecurangan dalam bentuk apa pun kepada peserta;',
  'Sanggup membuat berita acara dan menyerahkan hasil pekerjaan dengan lengkap setelah ujian selesai; dan',
  'Sanggup melaksanakan {kegiatan} secara JUJUR.',
].join('\n')

const PENUTUP_AWAL = [
  'Dengan demikian pakta integritas ini saya buat dengan sebenar-benarnya tanpa ada unsur paksaan dari pihak manapun.',
  'Apabila saya melanggar hal-hal yang telah dinyatakan dalam pakta integritas ini, saya bersedia dikenakan sanksi sesuai dengan hukum dan ketentuan peraturan perundang-undangan yang berlaku.',
].join('\n')

// Path file di bucket 'profil-sekolah' -> URL publik (kosong kalau tidak ada).
function urlLogo(path) {
  if (!path) return ''
  const { data } = supabase.storage.from('profil-sekolah').getPublicUrl(path)
  return data?.publicUrl || ''
}

// "01 Mei 2026"
function formatTanggalSurat(iso) {
  if (!iso) return '…………'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Daftar bernomor angka (1. 2. 3. …) — sama gaya dengan diktum Mengingat di SK.
function DaftarAngka({ items }) {
  return items.map((teks, i) => (
    <div key={i} className="sk-item">
      <span className="no">{i + 1}.</span>
      <span className="isi">{teks}</span>
    </div>
  ))
}

// CSS pemadatan supaya tiap lembar (kop + judul + identitas + poin + TTD) muat
// satu halaman A4. Di-scope .pip-compact agar tidak mengganggu halaman lain.
function GayaPadatSatuHalaman() {
  return (
    <style>{`
      .pip-compact .lembar-sk {
        font-size: 11pt;
        line-height: 1.35;
      }

      /* === Kop resmi (pola sama dengan Daftar Hadir / Jadwal Pengawas) === */
      .pip-compact .pip-kop {
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 2px solid #000;
        padding-bottom: 6px;
        margin-bottom: 12px;
      }
      .pip-compact .pip-kop-logo {
        width: 70px;
        height: 70px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Kunci gambar kop supaya tidak kebawa aturan CSS global (position:fixed dll). */
      .pip-compact .pip-kop-logo img {
        position: static !important;
        float: none !important;
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .pip-compact .pip-kop-teks {
        flex: 1;
        text-align: center;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        line-height: 1.3;
      }
      .pip-compact .pip-kop-teks p { margin: 0; }
      .pip-compact .pip-kop-teks .nama { font-size: 13pt; }

      .pip-compact .pip-judul {
        text-align: center;
        font-weight: bold;
        text-decoration: underline;
        margin: 2px 0;
      }
      .pip-compact .pip-pengantar { margin: 14px 0 6px; }
      .pip-compact table.pip-identitas {
        border-collapse: collapse;
        margin: 0 0 8px 16px;
      }
      .pip-compact table.pip-identitas td {
        vertical-align: top;
        padding: 1px 6px 1px 0;
      }
      .pip-compact table.pip-identitas td.label { width: 110px; white-space: nowrap; }
      .pip-compact table.pip-identitas td.titik { width: 10px; }
      .pip-compact .pip-pembuka {
        margin: 6px 0 8px;
        text-align: justify;
      }
      .pip-compact .sk-item { margin: 0 0 4px; }
      .pip-compact .pip-penutup {
        margin: 12px 0 0;
        text-align: justify;
      }
      .pip-compact .pip-penutup p { margin: 0 0 6px; }

      .pip-compact .pip-ttd {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-top: 16px;
        text-align: center;
        page-break-inside: avoid;
      }
      .pip-compact .pip-ttd p { margin: 0; }
      .pip-compact .pip-ttd .ruang-ttd { height: 56px; }
      .pip-compact .pip-ttd .nama {
        font-weight: bold;
        text-decoration: underline;
      }

      /* Satu pengawas = satu halaman; halaman terakhir tidak diikuti halaman kosong. */
      .pip-halaman { page-break-after: always; break-after: page; }
      .pip-halaman:last-child { page-break-after: auto; break-after: auto; }
    `}</style>
  )
}

// Kop resmi: Pemerintah Kabupaten > Dinas > Nama Sekolah > Kecamatan, logo
// kabupaten (kiri) & logo sekolah (kanan). Kotak logo tetap ada walau kosong
// supaya teks kop tetap di tengah.
function KopResmi({ kop, namaSekolah, logoKabupatenUrl, logoSekolahUrl }) {
  return (
    <div className="pip-kop">
      <div className="pip-kop-logo">
        {logoKabupatenUrl && (
          <img
            src={logoKabupatenUrl}
            alt="Logo kabupaten"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>
      <div className="pip-kop-teks">
        {kop.kabupaten && <p>{kop.kabupaten}</p>}
        {kop.dinas && <p>{kop.dinas}</p>}
        <p className="nama">{namaSekolah}</p>
        {kop.kecamatan && <p>{kop.kecamatan}</p>}
      </div>
      <div className="pip-kop-logo">
        {logoSekolahUrl && (
          <img
            src={logoSekolahUrl}
            alt="Logo sekolah"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>
    </div>
  )
}

export default function PaktaIntegritasPengawas() {
  const navigate = useNavigate()
  // Aman untuk dua bentuk AuthContext: ada `sekolahId` langsung, atau hanya
  // lewat profil.sekolah_id.
  const { sekolahId: sekolahIdCtx, profil } = useAuth()
  const sekolahId = sekolahIdCtx || profil?.sekolah_id
  const sudahMuat = useRef(false)
  const sudahPilihOtomatis = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [guru, setGuru] = useState([])
  const [kop, setKop] = useState({
    kabupaten: '',
    dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    kecamatan: '',
  })
  const [logoSekolahUrl, setLogoSekolahUrl] = useState('')
  const [logoKabupatenUrl, setLogoKabupatenUrl] = useState('')

  // Pengawas pada Jadwal Pengawas Ruang: [{ kode, guruId }]
  const [pengawasJadwal, setPengawasJadwal] = useState([])
  // 'semua' = satu lembar per pengawas pada jadwal; selain itu id satu guru; '' = lembar kosong.
  const [cetak, setCetak] = useState('')

  const [sk, setSk] = useState({
    tempat: '',
    tanggal: isoHariIni(),
    tahun: tahunPelajaranSekarang(),
  })
  const [jabatan, setJabatan] = useState('Guru')
  const [tampilKepsek, setTampilKepsek] = useState(true)

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
      const [ps, gk, profRes, jadwal] = await Promise.all([
        ambilProfilSekolah(sekolahId),
        ambilGuruDanKelas(sekolahId),
        supabase
          .from('profil_sekolah')
          .select('kabupaten, dinas_pendidikan, kecamatan, logo_path, logo_kabupaten_path')
          .eq('sekolah_id', sekolahId)
          .maybeSingle(),
        muatJadwalPengawas(sekolahId),
      ])
      const prof = profRes?.data || {}
      setSekolah(ps.sekolah)
      setGuru(urutkanGuru(gk.guru))
      setLogoSekolahUrl(urlLogo(prof.logo_path))
      setLogoKabupatenUrl(urlLogo(prof.logo_kabupaten_path))
      // Isian kop yang sudah diketik manual TIDAK ditimpa saat data dimuat ulang.
      setKop((k) => ({
        ...k,
        kabupaten: k.kabupaten || prof.kabupaten || '',
        dinas: prof.dinas_pendidikan || k.dinas,
        kecamatan: k.kecamatan || prof.kecamatan || '',
      }))

      // Tempat, tanggal surat, dan tahun pelajaran ikut Jadwal Pengawas Ruang;
      // hanya diterapkan sekali saat pertama dimuat supaya ketikan tidak tertimpa.
      if (!sudahMuat.current) {
        setSk((s) => ({
          ...s,
          tempat: s.tempat || jadwal?.tempat || ps.tempat || '',
          tanggal: jadwal?.tanggalSurat || s.tanggal,
          tahun: jadwal?.tapel || s.tahun,
        }))
      }
      sudahMuat.current = true

      const daftar = ambilPengawasJadwal(jadwal)
      setPengawasJadwal(daftar)
      if (daftar.length > 0 && !sudahPilihOtomatis.current) {
        sudahPilihOtomatis.current = true
        setCetak('semua')
      }
    } catch (e) {
      console.error('Gagal memuat data Pakta Integritas Pengawas:', e)
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
  const ubahKop = (k) => (e) => setKop((s) => ({ ...s, [k]: e.target.value }))

  const guruPerId = useMemo(() => {
    const m = {}
    guru.forEach((g) => { m[g.id] = g })
    return m
  }, [guru])

  const kodePerGuru = useMemo(() => {
    const m = {}
    pengawasJadwal.forEach((p) => { m[p.guruId] = p.kode })
    return m
  }, [pengawasJadwal])

  // Daftar lembar yang dicetak: satu per pengawas pada jadwal, satu guru terpilih,
  // atau satu lembar kosong (nama & NIP diisi tangan) kalau belum ada pilihan.
  const daftarCetak = useMemo(() => {
    let hasil = []
    if (cetak === 'semua') {
      hasil = pengawasJadwal.map((p) => guruPerId[p.guruId]).filter(Boolean)
    } else if (cetak && guruPerId[cetak]) {
      hasil = [guruPerId[cetak]]
    }
    return hasil.length > 0 ? hasil : [null]
  }, [cetak, pengawasJadwal, guruPerId])

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tahun = isi(sk.tahun)
  const nilai = { sekolah: namaSekolah, tahun, tp: tahun, kegiatan: isi(kegiatan, 'kegiatan ini') }

  const teksPembuka = isiTemplate(pembuka, nilai)
  const daftarPoin = pecahBaris(poin).map((t) => isiTemplate(t, nilai))
  const daftarPenutup = pecahBaris(penutup).map((t) => isiTemplate(t, nilai))

  const tempatTanggal = `${isi(sk.tempat, '…………')}, ${formatTanggalSurat(sk.tanggal)}`

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadatSatuHalaman />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk/portal-ujian')} judul="Pakta Integritas Pengawas Ruang" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}). Anda tetap bisa mengetik data secara manual.
          </div>
        )}

        <Bagian
          judul="Pengawas yang dicetak"
          keterangan={
            pengawasJadwal.length > 0
              ? `Diambil dari Jadwal Pengawas Ruang (${pengawasJadwal.length} pengawas). Satu pengawas = satu lembar.`
              : 'Belum ada pengawas pada Jadwal Pengawas Ruang. Pilih guru di sini, atau isi dulu jadwalnya lalu buka halaman ini lagi.'
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Cetak untuk">
              <select className={inputCls} value={cetak} onChange={(e) => setCetak(e.target.value)}>
                <option value="">— lembar kosong (diisi tangan) —</option>
                {pengawasJadwal.length > 0 && (
                  <option value="semua">Semua pengawas pada jadwal ({pengawasJadwal.length} lembar)</option>
                )}
                {guru.map((g) => (
                  <option key={g.id} value={g.id}>
                    {kodePerGuru[g.id] ? `${kodePerGuru[g.id]} — ` : ''}{g.nama_lengkap}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jabatan (tercetak di identitas)">
              <input className={inputCls} value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
            </Field>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={tampilKepsek} onChange={(e) => setTampilKepsek(e.target.checked)} className="rounded" />
            Tampilkan tanda tangan Kepala Sekolah (Mengetahui)
          </label>
        </Bagian>

        <Bagian judul="Kop surat" keterangan="Terisi otomatis dari Profil Sekolah (beserta logo); bisa diubah di sini, kosongkan yang tidak perlu ditampilkan.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pemerintah Kabupaten/Kota">
              <input className={inputCls} value={kop.kabupaten} onChange={ubahKop('kabupaten')} placeholder="PEMERINTAH KABUPATEN …" />
            </Field>
            <Field label="Dinas">
              <input className={inputCls} value={kop.dinas} onChange={ubahKop('dinas')} />
            </Field>
            <Field label="Kecamatan">
              <input className={inputCls} value={kop.kecamatan} onChange={ubahKop('kecamatan')} placeholder="KECAMATAN …" />
            </Field>
            <Field label="Nama sekolah">
              <input className={inputCls} value={sekolah.nama} readOnly />
            </Field>
          </div>
        </Bagian>

        <Bagian judul="Data lembar" keterangan="Tempat, tanggal, dan tahun pelajaran terisi dari Jadwal Pengawas Ruang; bisa diubah.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahun} onChange={ubahSk('tahun')} placeholder="mis. 2025/2026" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Nama kegiatan (untuk {kegiatan} di teks)">
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
              <textarea className={inputCls} rows={8} value={poin} onChange={(e) => setPoin(e.target.value)} />
            </Field>
            <Field label="Alinea penutup">
              <textarea className={inputCls} rows={4} value={penutup} onChange={(e) => setPenutup(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah ({daftarCetak.length} lembar). Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak: satu halaman per pengawas ── */}
      <AreaLembar>
        <div className="pip-compact">
          {daftarCetak.map((g, i) => (
            <div key={g?.id || `kosong-${i}`} className="pip-halaman">
              <LembarSK>
                <KopResmi
                  kop={kop}
                  namaSekolah={namaSekolah}
                  logoKabupatenUrl={logoKabupatenUrl}
                  logoSekolahUrl={logoSekolahUrl}
                />

                <p className="pip-judul">{judul1}</p>
                <p className="pip-judul">{judul2}</p>
                <p className="pip-judul">TAHUN PELAJARAN {tahun}</p>

                <p className="pip-pengantar">Saya yang bertanda tangan di bawah ini:</p>
                <table className="pip-identitas">
                  <tbody>
                    <tr>
                      <td className="label">Nama</td>
                      <td className="titik">:</td>
                      <td>{isi(g?.nama_lengkap, '…………………………')}</td>
                    </tr>
                    <tr>
                      <td className="label">NIP</td>
                      <td className="titik">:</td>
                      <td>{isi(g?.nip, '…………………………')}</td>
                    </tr>
                    <tr>
                      <td className="label">Jabatan</td>
                      <td className="titik">:</td>
                      <td>{isi(jabatan, '…………………………')}</td>
                    </tr>
                    <tr>
                      <td className="label">Unit Kerja</td>
                      <td className="titik">:</td>
                      <td>{namaSekolah}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="pip-pembuka">{teksPembuka}</p>

                <DaftarAngka items={daftarPoin} />

                <div className="pip-penutup">
                  {daftarPenutup.map((teks, j) => (
                    <p key={j}>{teks}</p>
                  ))}
                </div>

                <div className="pip-ttd">
                  <div>
                    {tampilKepsek && (
                      <>
                        <p>&nbsp;</p>
                        <p>Mengetahui,</p>
                        <p>Kepala Sekolah</p>
                        <div className="ruang-ttd" />
                        <p className="nama">{isi(sekolah.kepala, '………………………')}</p>
                        {sekolah.nipKepala && <p>NIP. {sekolah.nipKepala}</p>}
                      </>
                    )}
                  </div>
                  <div>
                    <p>{tempatTanggal}</p>
                    <p>Yang membuat pernyataan,</p>
                    <p>Pengawas Ruang</p>
                    <div className="ruang-ttd" />
                    <p className="nama">{isi(g?.nama_lengkap, '………………………')}</p>
                    <p>NIP. {isi(g?.nip, '………………………')}</p>
                  </div>
                </div>
              </LembarSK>
            </div>
          ))}
        </div>
      </AreaLembar>
    </div>
  )
}
