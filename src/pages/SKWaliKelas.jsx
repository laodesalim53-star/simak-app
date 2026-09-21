import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  HalamanKeputusan,
  HalamanLampiran,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  inputSK as inputCls,
  isKepalaSekolah,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
  urutkanGuru,
} from '../components/CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SK Wali Kelas — halaman anak GudangSK
// (route: /gudang-sk/wali-kelas)
//
// Format KEPUTUSAN (bukan surat), jadi memakai HalamanKeputusan + HalamanLampiran
// dari CetakSK.jsx:
//   • Halaman 1: Keputusan Kepala Sekolah tentang Penetapan Wali Kelas
//   • Halaman 2: Lampiran berisi tabel Kelas → Wali Kelas
//
// Data diimpor dari profil_sekolah, guru (aktif), dan kelas (kolom wali_kelas_id).
// Wali kelas tiap rombel bisa diganti lewat pilihan di panel isian tanpa mengubah
// data di database — hanya berlaku untuk cetakan ini.
// ─────────────────────────────────────────────────────────────────────────────

const MENIMBANG_AWAL = [
  'bahwa untuk kelancaran kegiatan pembelajaran dan pembinaan peserta didik pada {sekolah} Tahun Pelajaran {tp}, perlu ditetapkan wali kelas untuk setiap rombongan belajar;',
  'bahwa guru yang namanya tercantum dalam lampiran keputusan ini dipandang mampu dan memenuhi syarat untuk melaksanakan tugas sebagai wali kelas;',
  'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan Wali Kelas Tahun Pelajaran {tp}.',
].join('\n')

const MENGINGAT_AWAL = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
  'Peraturan Pemerintah Nomor 74 Tahun 2008 tentang Guru;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
  'Peraturan Menteri Pendidikan dan Kebudayaan Nomor 15 Tahun 2018 tentang Pemenuhan Beban Kerja Guru, Kepala Sekolah, dan Pengawas Sekolah;',
  'Kalender Pendidikan {sekolah} Tahun Pelajaran {tp}.',
].join('\n')

// Satu baris = satu diktum. Labelnya (KESATU, KEDUA, …) dibuat otomatis.
const DIKTUM_AWAL = [
  'Menetapkan guru yang namanya tercantum dalam Lampiran Keputusan ini sebagai Wali Kelas pada {sekolah} Tahun Pelajaran {tp}.',
  'Wali Kelas sebagaimana dimaksud dalam diktum KESATU bertugas mengelola kelas, menyelenggarakan administrasi kelas, membuat catatan kemajuan belajar peserta didik, membina dan mengarahkan peserta didik, menyusun dan membagikan laporan hasil belajar (rapor), serta berkoordinasi dengan orang tua/wali peserta didik.',
  'Dalam melaksanakan tugasnya, Wali Kelas bertanggung jawab kepada Kepala Sekolah.',
  'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
].join('\n')

const URUTAN_DIKTUM = [
  'KESATU',
  'KEDUA',
  'KETIGA',
  'KEEMPAT',
  'KELIMA',
  'KEENAM',
  'KETUJUH',
  'KEDELAPAN',
  'KESEMBILAN',
  'KESEPULUH',
]

export default function SKWaliKelas() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    nomor: '',
    tempat: '',
    tanggal: isoHariIni(),
    tahunPelajaran: tahunPelajaranSekarang(),
  })
  const [menimbang, setMenimbang] = useState(MENIMBANG_AWAL)
  const [mengingat, setMengingat] = useState(MENGINGAT_AWAL)
  const [diktum, setDiktum] = useState(DIKTUM_AWAL)

  const [guru, setGuru] = useState([])
  const [kelas, setKelas] = useState([])
  // Pilihan wali kelas yang diubah di panel: { [kelasId]: guruId | '' }.
  // Kelas yang tidak ada di sini memakai wali_kelas_id dari database.
  const [pilihan, setPilihan] = useState({})

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')

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
      if (ps.tempat) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))

      setGuru(urut)
      // Urut alami: "1", "2", "10" (bukan "1", "10", "2"), lalu "6A" sebelum "6B".
      setKelas(
        [...gk.kelas].sort((a, b) =>
          String(a.nama_kelas || '').localeCompare(String(b.nama_kelas || ''), 'id', { numeric: true }),
        ),
      )
      setPilihan({})
      setRingkas(`${gk.kelas.length} kelas dan ${gk.guru.length} guru/pegawai aktif terbaca.`)
    } catch (e) {
      console.error('Gagal memuat data SK Wali Kelas:', e)
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

  const guruPerId = {}
  guru.forEach((g) => {
    guruPerId[g.id] = g
  })

  const waliIdDari = (k) => (k.id in pilihan ? pilihan[k.id] : k.wali_kelas_id || '')
  const jumlahKosong = kelas.filter((k) => !waliIdDari(k)).length

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahunPelajaran)
  const nilai = { sekolah: namaSekolah, tp }

  const tentang = `Penetapan Wali Kelas ${namaSekolah} Tahun Pelajaran ${tp}`
  const daftarMenimbang = pecahBaris(menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(mengingat).map((t) => isiTemplate(t, nilai))
  const daftarDiktum = pecahBaris(diktum)
    .slice(0, URUTAN_DIKTUM.length)
    .map((t, i) => [URUTAN_DIKTUM[i], isiTemplate(t, nilai)])

  const skCetak = { nomor: sk.nomor, tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = kelas.map((k) => {
    const g = guruPerId[waliIdDari(k)]
    return {
      key: k.id,
      kelas: k.nama_kelas || '',
      nama: g?.nama_lengkap || '',
      nip: g?.nip || '',
      pangkat: g?.pangkat_golongan || '',
    }
  })

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="SK Wali Kelas" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah, guru, dan kelas…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}). Coba muat ulang, atau periksa koneksi dan hak akses tabel kelas dan guru.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas}
            {jumlahKosong > 0 && ` ${jumlahKosong} kelas belum punya wali kelas — pilih di bagian "Wali kelas per kelas".`}
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, dan tahun pelajaran.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK (tidak perlu awalan 'Nomor:')">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder="mis. 421.2/012/SD/2026" />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahunPelajaran} onChange={ubahSk('tahunPelajaran')} placeholder="mis. 2026/2027" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Wali kelas per kelas"
          keterangan="Terisi otomatis dari data kelas. Pilihan di sini hanya mengubah cetakan, bukan data kelas."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPilihan({})}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                Kembalikan ke data kelas
              </button>
              <button
                type="button"
                onClick={muatDariData}
                disabled={memuat || !sekolahId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Muat ulang
              </button>
            </div>
          }
        >
          {kelas.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data kelas yang terbaca.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {kelas.map((k) => (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2">
                  <span className="sm:w-28 shrink-0 text-sm font-medium text-slate-800">{k.nama_kelas || '(tanpa nama)'}</span>
                  <select
                    className={inputCls}
                    value={waliIdDari(k)}
                    onChange={(e) => setPilihan((p) => ({ ...p, [k.id]: e.target.value }))}
                  >
                    <option value="">— belum ditentukan —</option>
                    {guru.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama_lengkap || '(tanpa nama)'}
                        {g.nip ? ` — NIP. ${g.nip}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </Bagian>

        <Bagian
          judul="Isi keputusan"
          keterangan="Satu baris = satu butir. Penanda yang otomatis diganti: {sekolah} dan {tp} (tahun pelajaran). Label a., b., 1., 2., dan KESATU, KEDUA dibuat otomatis."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Menimbang">
              <textarea className={inputCls} rows={6} value={menimbang} onChange={(e) => setMenimbang(e.target.value)} />
            </Field>
            <Field label="Mengingat">
              <textarea className={inputCls} rows={8} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
            <Field label="Memutuskan (diktum KESATU dan seterusnya)">
              <textarea className={inputCls} rows={8} value={diktum} onChange={(e) => setDiktum(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dasar hukum di "Mengingat" adalah isian awal. Sesuaikan dengan peraturan yang berlaku di daerah Anda sebelum dicetak.
          </p>
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
          Pratinjau di bawah: halaman 1 Keputusan, halaman 2 Lampiran. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak: Keputusan + Lampiran ── */}
      <AreaLembar>
        <HalamanKeputusan
          sk={skCetak}
          sekolah={sekolah}
          tentang={tentang}
          menimbang={daftarMenimbang}
          mengingat={daftarMengingat}
          diktum={daftarDiktum}
        />

        <HalamanLampiran
          sk={skCetak}
          sekolah={sekolah}
          judul={['Daftar Wali Kelas', namaSekolah, `Tahun Pelajaran ${tp}`]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '8%' }}>No</th>
                <th style={{ width: '16%' }}>Kelas</th>
                <th>Nama Wali Kelas</th>
                <th style={{ width: '26%' }}>NIP</th>
                <th style={{ width: '18%' }}>Pangkat/Gol.</th>
              </tr>
            </thead>
            <tbody>
              {barisTabel.length === 0 ? (
                <tr>
                  <td className="c">1</td>
                  <td className="c">…………</td>
                  <td>…………</td>
                  <td className="c">…………</td>
                  <td className="c">…………</td>
                </tr>
              ) : (
                barisTabel.map((b, i) => (
                  <tr key={b.key}>
                    <td className="c">{i + 1}</td>
                    <td className="c">{isi(b.kelas)}</td>
                    <td>{isi(b.nama)}</td>
                    <td className="c nip">{isi(b.nip, '-')}</td>
                    <td className="c">{isi(b.pangkat, '-')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </HalamanLampiran>
      </AreaLembar>
    </div>
  )
}
