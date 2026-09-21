import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
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
// SK Petugas Perpustakaan — halaman anak GudangSK
// (route: /gudang-sk/petugas-perpustakaan)
//
// Format KEPUTUSAN: HalamanKeputusan (halaman 1) + HalamanLampiran berisi
// tabel petugas dan uraian tugasnya. Petugas dipilih dari Data Guru aktif atau
// diketik manual (mis. tenaga perpustakaan yang bukan guru).
// ─────────────────────────────────────────────────────────────────────────────

const MENIMBANG_AWAL = [
  'bahwa perpustakaan merupakan sarana penunjang kegiatan pembelajaran yang perlu dikelola secara tertib dan berkesinambungan pada {sekolah};',
  'bahwa untuk kelancaran pengelolaan perpustakaan pada Tahun Pelajaran {tp}, perlu menugaskan petugas perpustakaan yang memiliki kemampuan dan kesediaan melaksanakan tugas tersebut;',
  'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penugasan Petugas Perpustakaan Tahun Pelajaran {tp}.',
].join('\n')

const MENGINGAT_AWAL = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Undang-Undang Nomor 43 Tahun 2007 tentang Perpustakaan;',
  'Peraturan Pemerintah Nomor 24 Tahun 2014 tentang Pelaksanaan Undang-Undang Nomor 43 Tahun 2007 tentang Perpustakaan;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
  'Kalender Pendidikan {sekolah} Tahun Pelajaran {tp}.',
].join('\n')

const DIKTUM_AWAL = [
  'Menugaskan pihak yang namanya tercantum dalam Lampiran Keputusan ini sebagai Petugas Perpustakaan pada {sekolah} Tahun Pelajaran {tp}.',
  'Uraian tugas Petugas Perpustakaan sebagaimana dimaksud dalam diktum KESATU tercantum dalam Lampiran Keputusan ini.',
  'Dalam melaksanakan tugasnya, Petugas Perpustakaan bertanggung jawab kepada Kepala Sekolah.',
  'Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.',
].join('\n')

// Satu baris = satu butir uraian tugas (nomor dibuat otomatis).
const TUGAS_AWAL = [
  'Menyusun program kerja perpustakaan;',
  'Mengelola koleksi: inventarisasi, klasifikasi, dan pengolahan buku;',
  'Melayani peminjaman dan pengembalian buku;',
  'Menata dan merawat koleksi serta ruang perpustakaan;',
  'Mencatat dan menyusun laporan kunjungan dan peminjaman;',
  'Mendorong minat baca peserta didik melalui kegiatan literasi;',
  'Melaporkan pelaksanaan tugas kepada Kepala Sekolah secara berkala.',
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

const idBaru = () => Math.random().toString(36).slice(2, 9)
const barisBaru = (jabatan = 'Petugas Perpustakaan') => ({ id: idBaru(), guruId: '', nama: '', nip: '', jabatan })

export default function SKPetugasPerpustakaan() {
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
  const [tugas, setTugas] = useState(TUGAS_AWAL)

  const [guru, setGuru] = useState([])
  const [baris, setBaris] = useState(() => [barisBaru()])

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
      setRingkas(`${gk.guru.length} guru/pegawai aktif terbaca.`)
    } catch (e) {
      console.error('Gagal memuat data SK Petugas Perpustakaan:', e)
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
  const ubahBaris = (id, k, nilaiBaru) =>
    setBaris((daftar) => daftar.map((b) => (b.id === id ? { ...b, [k]: nilaiBaru } : b)))
  const hapusBaris = (id) => setBaris((daftar) => daftar.filter((b) => b.id !== id))

  const guruPerId = {}
  guru.forEach((g) => {
    guruPerId[g.id] = g
  })

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahunPelajaran)
  const nilai = { sekolah: namaSekolah, tp }

  const tentang = `Penugasan Petugas Perpustakaan ${namaSekolah} Tahun Pelajaran ${tp}`
  const daftarMenimbang = pecahBaris(menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(mengingat).map((t) => isiTemplate(t, nilai))
  const daftarDiktum = pecahBaris(diktum)
    .slice(0, URUTAN_DIKTUM.length)
    .map((t, i) => [URUTAN_DIKTUM[i], isiTemplate(t, nilai)])
  const daftarTugas = pecahBaris(tugas).map((t) => isiTemplate(t, nilai))

  const skCetak = { nomor: sk.nomor, tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = baris.map((b) => {
    const g = guruPerId[b.guruId]
    return {
      key: b.id,
      nama: g?.nama_lengkap || b.nama,
      nip: g?.nip || b.nip,
      jabatan: b.jabatan,
    }
  })

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="SK Petugas Perpustakaan" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik nama petugas secara manual.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {baris.length} petugas akan masuk lampiran.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, dan tahun pelajaran.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder="mis. 421.2/016/SD/2026" />
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
          judul="Petugas perpustakaan"
          keterangan="Pilih dari Data Guru, atau pilih 'isi manual' untuk petugas yang bukan guru."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBaris((d) => [...d, barisBaru()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                <Plus size={13} /> Tambah petugas
              </button>
              <button
                type="button"
                onClick={muatDariData}
                disabled={memuat || !sekolahId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Muat ulang guru
              </button>
            </div>
          }
        >
          {baris.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada petugas. Klik "Tambah petugas".</p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Petugas {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus petugas ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Guru/pegawai">
                      <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, 'guruId', e.target.value)}>
                        <option value="">— isi manual —</option>
                        {guru.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama_lengkap || '(tanpa nama)'}
                            {g.nip ? ` — NIP. ${g.nip}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Jabatan di perpustakaan">
                      <input
                        className={inputCls}
                        value={b.jabatan}
                        onChange={(e) => ubahBaris(b.id, 'jabatan', e.target.value)}
                        placeholder="mis. Kepala Perpustakaan, Petugas Perpustakaan"
                      />
                    </Field>
                    {!b.guruId && (
                      <>
                        <Field label="Nama">
                          <input className={inputCls} value={b.nama} onChange={(e) => ubahBaris(b.id, 'nama', e.target.value)} />
                        </Field>
                        <Field label="NIP (kosongkan kalau tidak ada)">
                          <input className={inputCls} value={b.nip} onChange={(e) => ubahBaris(b.id, 'nip', e.target.value)} inputMode="numeric" />
                        </Field>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Bagian>

        <Bagian judul="Uraian tugas" keterangan="Satu baris = satu butir. Nomor dibuat otomatis dan tampil di halaman Lampiran.">
          <Field label="Uraian tugas petugas perpustakaan">
            <textarea className={inputCls} rows={8} value={tugas} onChange={(e) => setTugas(e.target.value)} />
          </Field>
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
              <textarea className={inputCls} rows={7} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
            <Field label="Memutuskan (diktum KESATU dan seterusnya)">
              <textarea className={inputCls} rows={7} value={diktum} onChange={(e) => setDiktum(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dasar hukum di "Mengingat" adalah isian awal. Cek apakah masih berlaku dan sesuaikan dengan aturan di daerah Anda sebelum dicetak.
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
          judul={['Daftar Petugas dan Uraian Tugas Perpustakaan', namaSekolah, `Tahun Pelajaran ${tp}`]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>No</th>
                <th>Nama</th>
                <th style={{ width: '26%' }}>NIP</th>
                <th style={{ width: '28%' }}>Jabatan</th>
              </tr>
            </thead>
            <tbody>
              {barisTabel.length === 0 ? (
                <tr>
                  <td className="c">1</td>
                  <td>…………</td>
                  <td className="c">…………</td>
                  <td className="c">…………</td>
                </tr>
              ) : (
                barisTabel.map((b, i) => (
                  <tr key={b.key}>
                    <td className="c">{i + 1}</td>
                    <td>{isi(b.nama)}</td>
                    <td className="c nip">{isi(b.nip, '-')}</td>
                    <td className="c">{isi(b.jabatan)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {daftarTugas.length > 0 && (
            <>
              <p className="sk-tengah" style={{ marginTop: 14 }}>
                Uraian Tugas
              </p>
              {daftarTugas.map((teks, i) => (
                <div key={i} className="sk-item">
                  <span className="no">{i + 1}.</span>
                  <span className="isi">{teks}</span>
                </div>
              ))}
            </>
          )}
        </HalamanLampiran>
      </AreaLembar>
    </div>
  )
}
