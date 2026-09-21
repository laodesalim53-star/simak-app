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
// SK Pembina Ekstrakurikuler — halaman anak GudangSK
// (route: /gudang-sk/pembina-ekstrakurikuler)
//
// Format KEPUTUSAN: HalamanKeputusan (halaman 1) + HalamanLampiran (tabel
// kegiatan → pembina). Belum ada tabel ekstrakurikuler di database, jadi daftar
// kegiatan diisi di panel isian; pembina dipilih dari Data Guru aktif atau
// diketik manual (untuk pembina dari luar sekolah).
// ─────────────────────────────────────────────────────────────────────────────

const MENIMBANG_AWAL = [
  'bahwa kegiatan ekstrakurikuler merupakan bagian dari upaya mengembangkan minat, bakat, dan potensi peserta didik di luar jam pelajaran pada {sekolah} Tahun Pelajaran {tp};',
  'bahwa untuk kelancaran pelaksanaan kegiatan ekstrakurikuler, perlu menunjuk pembina yang memiliki kemampuan dan kesediaan melaksanakan tugas tersebut;',
  'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan huruf b, perlu menetapkan Keputusan Kepala {sekolah} tentang Penetapan Pembina Kegiatan Ekstrakurikuler Tahun Pelajaran {tp}.',
].join('\n')

const MENGINGAT_AWAL = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Undang-Undang Nomor 12 Tahun 2010 tentang Gerakan Pramuka;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan;',
  'Peraturan Menteri Pendidikan dan Kebudayaan Nomor 62 Tahun 2014 tentang Kegiatan Ekstrakurikuler pada Pendidikan Dasar dan Pendidikan Menengah;',
  'Kalender Pendidikan {sekolah} Tahun Pelajaran {tp}.',
].join('\n')

const DIKTUM_AWAL = [
  'Menunjuk guru dan/atau pihak yang namanya tercantum dalam Lampiran Keputusan ini sebagai Pembina Kegiatan Ekstrakurikuler pada {sekolah} Tahun Pelajaran {tp}.',
  'Pembina sebagaimana dimaksud dalam diktum KESATU bertugas menyusun program kegiatan, membimbing peserta didik, mencatat kehadiran dan perkembangan peserta didik, serta melaporkan pelaksanaan kegiatan kepada Kepala Sekolah secara berkala.',
  'Dalam melaksanakan tugasnya, Pembina bertanggung jawab kepada Kepala Sekolah.',
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

const idBaru = () => Math.random().toString(36).slice(2, 9)
const barisBaru = (kegiatan = '') => ({ id: idBaru(), kegiatan, guruId: '', nama: '', nip: '', jadwal: '' })

export default function SKPembinaEkstrakurikuler() {
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
  const [baris, setBaris] = useState(() => [barisBaru('Pramuka')])

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
      console.error('Gagal memuat data SK Pembina Ekstrakurikuler:', e)
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

  const tentang = `Penetapan Pembina Kegiatan Ekstrakurikuler ${namaSekolah} Tahun Pelajaran ${tp}`
  const daftarMenimbang = pecahBaris(menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(mengingat).map((t) => isiTemplate(t, nilai))
  const daftarDiktum = pecahBaris(diktum)
    .slice(0, URUTAN_DIKTUM.length)
    .map((t, i) => [URUTAN_DIKTUM[i], isiTemplate(t, nilai)])

  const skCetak = { nomor: sk.nomor, tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = baris.map((b) => {
    const g = guruPerId[b.guruId]
    return {
      key: b.id,
      kegiatan: b.kegiatan,
      nama: g?.nama_lengkap || b.nama,
      nip: g?.nip || b.nip,
      jadwal: b.jadwal,
    }
  })
  const adaJadwal = barisTabel.some((b) => b.jadwal.trim())

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="SK Pembina Ekstrakurikuler" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik nama pembina secara manual.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {baris.length} kegiatan akan masuk lampiran.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, dan tahun pelajaran.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder="mis. 421.2/015/SD/2026" />
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
          judul="Kegiatan dan pembina"
          keterangan="Satu kegiatan satu baris. Pilih pembina dari Data Guru, atau pilih 'isi manual' untuk pembina dari luar sekolah."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBaris((d) => [...d, barisBaru()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                <Plus size={13} /> Tambah kegiatan
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
            <p className="text-sm text-slate-500">Belum ada kegiatan. Klik "Tambah kegiatan".</p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Kegiatan {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus kegiatan ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nama kegiatan">
                      <input
                        className={inputCls}
                        value={b.kegiatan}
                        onChange={(e) => ubahBaris(b.id, 'kegiatan', e.target.value)}
                        placeholder="mis. Pramuka, Pencak Silat, Drum Band"
                      />
                    </Field>
                    <Field label="Pembina">
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
                    {!b.guruId && (
                      <>
                        <Field label="Nama pembina">
                          <input className={inputCls} value={b.nama} onChange={(e) => ubahBaris(b.id, 'nama', e.target.value)} />
                        </Field>
                        <Field label="NIP (kosongkan kalau tidak ada)">
                          <input className={inputCls} value={b.nip} onChange={(e) => ubahBaris(b.id, 'nip', e.target.value)} inputMode="numeric" />
                        </Field>
                      </>
                    )}
                    <Field label="Hari/waktu kegiatan (opsional)" className="sm:col-span-2">
                      <input
                        className={inputCls}
                        value={b.jadwal}
                        onChange={(e) => ubahBaris(b.id, 'jadwal', e.target.value)}
                        placeholder="mis. Sabtu, 14.00 WIT"
                      />
                    </Field>
                  </div>
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
              <textarea className={inputCls} rows={7} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
            <Field label="Memutuskan (diktum KESATU dan seterusnya)">
              <textarea className={inputCls} rows={8} value={diktum} onChange={(e) => setDiktum(e.target.value)} />
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
          judul={['Daftar Pembina Kegiatan Ekstrakurikuler', namaSekolah, `Tahun Pelajaran ${tp}`]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>No</th>
                <th>Kegiatan Ekstrakurikuler</th>
                <th>Nama Pembina</th>
                <th style={{ width: '24%' }}>NIP</th>
                {adaJadwal && <th style={{ width: '18%' }}>Hari/Waktu</th>}
              </tr>
            </thead>
            <tbody>
              {barisTabel.length === 0 ? (
                <tr>
                  <td className="c">1</td>
                  <td>…………</td>
                  <td>…………</td>
                  <td className="c">…………</td>
                  {adaJadwal && <td className="c">-</td>}
                </tr>
              ) : (
                barisTabel.map((b, i) => (
                  <tr key={b.key}>
                    <td className="c">{i + 1}</td>
                    <td>{isi(b.kegiatan)}</td>
                    <td>{isi(b.nama)}</td>
                    <td className="c nip">{isi(b.nip, '-')}</td>
                    {adaJadwal && <td className="c">{isi(b.jadwal, '-')}</td>}
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
