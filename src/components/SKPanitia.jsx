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
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SKPanitia — komponen bersama untuk SK berbentuk SUSUNAN PANITIA / TIM:
//   • SK Panitia Ujian        (pages/SKPanitiaUjian.jsx)
//   • SK Panitia PPDB         (pages/SKPanitiaPPDB.jsx)
//   • SK Tim Manajemen BOS    (pages/SKTimBOS.jsx)
//
// Format KEPUTUSAN: HalamanKeputusan (halaman 1) + HalamanLampiran (tabel
// susunan + uraian tugas). Tiap halaman SK cukup mengirim `konfig` berisi teks
// awal dan susunan awalnya. Bentuk konfig:
//   {
//     judulBar, objek, sebutan ('Panitia' | 'Tim'),
//     labelTahun ('Tahun Pelajaran' | 'Tahun Anggaran'), tahunAwal: () => string,
//     placeholderNomor,
//     menimbang, mengingat, diktum, tugas   // string, satu butir per baris
//     baris: [{ jabatan, kepsek?: true }]   // kepsek: otomatis diisi Kepala Sekolah
//   }
// Penanda {sekolah}, {tp}, {objek} di teks otomatis diganti.
// ─────────────────────────────────────────────────────────────────────────────

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
const barisBaru = (jabatan = 'Anggota', kepsek = false) => ({
  id: idBaru(),
  jabatan,
  kepsek,
  guruId: '',
  nama: '',
  nip: '',
})

export default function SKPanitia({ konfig }) {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const sebutan = konfig.sebutan || 'Panitia'
  const labelTahun = konfig.labelTahun || 'Tahun Pelajaran'

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    nomor: '',
    tempat: '',
    tanggal: isoHariIni(),
    tahun: konfig.tahunAwal ? konfig.tahunAwal() : tahunPelajaranSekarang(),
  })
  const [menimbang, setMenimbang] = useState(konfig.menimbang)
  const [mengingat, setMengingat] = useState(konfig.mengingat)
  const [diktum, setDiktum] = useState(konfig.diktum)
  const [tugas, setTugas] = useState(konfig.tugas || '')

  const [guru, setGuru] = useState([])
  const [baris, setBaris] = useState(() => konfig.baris.map((b) => barisBaru(b.jabatan, !!b.kepsek)))

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
      // Baris bertanda `kepsek` diisi Kepala Sekolah kalau belum dipilih siapa pun.
      if (kepsek) {
        setBaris((d) => d.map((b) => (b.kepsek && !b.guruId ? { ...b, guruId: kepsek.id } : b)))
      }
      setRingkas(`${gk.guru.length} guru/pegawai aktif terbaca.`)
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
  const ubahBaris = (id, k, nilaiBaru) =>
    setBaris((daftar) => daftar.map((b) => (b.id === id ? { ...b, [k]: nilaiBaru } : b)))
  const hapusBaris = (id) => setBaris((daftar) => daftar.filter((b) => b.id !== id))

  const guruPerId = {}
  guru.forEach((g) => {
    guruPerId[g.id] = g
  })

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tahun = isi(sk.tahun)
  const nilai = { sekolah: namaSekolah, tp: tahun, objek: konfig.objek }

  const tentang = `Penetapan ${konfig.objek} ${namaSekolah} ${labelTahun} ${tahun}`
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
      jabatan: b.jabatan,
      nama: g?.nama_lengkap || b.nama,
      nip: g?.nip || b.nip,
    }
  })

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
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
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik nama secara manual.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {baris.length} orang akan masuk susunan {sebutan.toLowerCase()}.
          </div>
        )}

        <Bagian judul="Data SK" keterangan={`Nomor, tempat, tanggal penetapan, dan ${labelTahun.toLowerCase()}.`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder={konfig.placeholderNomor || 'mis. 421.2/017/SD/2026'} />
            </Field>
            <Field label={labelTahun}>
              <input className={inputCls} value={sk.tahun} onChange={ubahSk('tahun')} />
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
          judul={`Susunan ${sebutan.toLowerCase()}`}
          keterangan="Pilih dari Data Guru, atau pilih 'isi manual' untuk orang di luar Data Guru (mis. komite sekolah)."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBaris((d) => [...d, barisBaru()])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                <Plus size={13} /> Tambah anggota
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
            <p className="text-sm text-slate-500">Belum ada susunan. Klik "Tambah anggota".</p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Nomor {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus nomor ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={`Kedudukan dalam ${sebutan.toLowerCase()}`}>
                      <input
                        className={inputCls}
                        value={b.jabatan}
                        onChange={(e) => ubahBaris(b.id, 'jabatan', e.target.value)}
                        placeholder="mis. Ketua, Sekretaris, Anggota"
                      />
                    </Field>
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

        <Bagian judul="Uraian tugas" keterangan="Satu baris = satu butir, tampil bernomor di halaman Lampiran. Kosongkan semua baris kalau tidak diperlukan.">
          <Field label={`Uraian tugas ${sebutan.toLowerCase()}`}>
            <textarea className={inputCls} rows={7} value={tugas} onChange={(e) => setTugas(e.target.value)} />
          </Field>
        </Bagian>

        <Bagian
          judul="Isi keputusan"
          keterangan="Satu baris = satu butir. Penanda yang otomatis diganti: {sekolah}, {tp} (tahun), dan {objek}. Label a., b., 1., 2., dan KESATU, KEDUA dibuat otomatis."
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
            Dasar hukum di "Mengingat" adalah isian awal. Cek apakah masih berlaku dan sesuaikan nomor serta tahunnya dengan aturan di daerah Anda sebelum dicetak.
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
          judul={[`Susunan ${konfig.objek}`, namaSekolah, `${labelTahun} ${tahun}`]}
        >
          <table className="sk-tabel">
            <thead>
              <tr>
                <th style={{ width: '7%' }}>No</th>
                <th>Nama</th>
                <th style={{ width: '26%' }}>NIP</th>
                <th style={{ width: '28%' }}>Kedudukan</th>
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
