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
  HalamanSurat,
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
  nomorKe,
  tahunPelajaranSekarang,
  urutkanGuru,
} from '../components/CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// Surat Keterangan Melaksanakan Tugas — halaman anak GudangSK
// (route: /gudang-sk/keterangan-melaksanakan-tugas)
//
// Ini SURAT keterangan (bukan Keputusan), jadi memakai HalamanSurat dari
// CetakSK.jsx. Satu guru/pegawai = satu lembar. Bisa mencetak banyak surat
// sekaligus: centang beberapa guru, nomor surat naik otomatis.
//
// Data diimpor dari profil_sekolah, guru (aktif), dan kelas (wali kelas).
//   • Penandatangan: Kepala Sekolah.
//   • Khusus surat untuk Kepala Sekolah sendiri: ditandatangani penandatangan
//     alternatif (bawaan: Pengawas Sekolah dari Profil Sekolah), sebab Kepala
//     Sekolah tidak menandatangani suratnya sendiri.
// ─────────────────────────────────────────────────────────────────────────────

const PARAGRAF_AWAL =
  'Yang bersangkutan benar telah melaksanakan tugas sebagai {tugas} pada {sekolah}{tmt}, untuk periode {periode}, dengan baik dan penuh tanggung jawab.'

const PENUTUP_AWAL =
  'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.'

const DATA_KOSONG = {
  key: 'kosong',
  kepsek: false,
  nama: '',
  nip: '',
  pangkat: '',
  jabatan: '',
  tugas: '',
  tambahan: '',
  tmt: '',
}

export default function KeteranganMelaksanakanTugas() {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const tpAwal = tahunPelajaranSekarang()

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [pangkatKepala, setPangkatKepala] = useState('')
  const [alt, setAlt] = useState({ jabatan: 'Pengawas Sekolah', nama: '', nip: '', pangkat: '' })
  const [surat, setSurat] = useState({
    nomor: '',
    tempat: '',
    tanggal: isoHariIni(),
    periode: `Tahun Pelajaran ${tpAwal}`,
    keperluan: '',
    tampilTmt: false,
  })
  const [paragraf, setParagraf] = useState(PARAGRAF_AWAL)
  const [penutup, setPenutup] = useState(PENUTUP_AWAL)

  const [guru, setGuru] = useState([])
  const [kelas, setKelas] = useState([])
  const [terpilih, setTerpilih] = useState([])
  const [pakaiManual, setPakaiManual] = useState(false)
  const [manual, setManual] = useState({ nama: '', nip: '', pangkat: '', jabatan: '', tugas: '' })

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
      setPangkatKepala(kepsek?.pangkat_golongan || '')
      setAlt((a) => ({
        ...a,
        nama: a.nama || ps.profil?.pengawas || '',
        nip: a.nip || ps.profil?.nip_pengawas || '',
      }))
      if (ps.tempat) setSurat((s) => ({ ...s, tempat: s.tempat || ps.tempat }))

      setGuru(urut)
      setKelas(gk.kelas)
      // Bawaan: satu guru (bukan kepala sekolah) supaya pratinjau langsung terisi.
      setTerpilih((sebelumnya) => {
        const masihAda = sebelumnya.filter((id) => urut.some((g) => g.id === id))
        if (masihAda.length) return masihAda
        const pertama = urut.find((g) => !isKepalaSekolah(g)) || urut[0]
        return pertama ? [pertama.id] : []
      })
      setRingkas(`${gk.guru.length} guru/pegawai aktif terbaca.`)
    } catch (e) {
      console.error('Gagal memuat data Surat Keterangan Melaksanakan Tugas:', e)
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
  const ubahSurat = (k) => (e) => setSurat((s) => ({ ...s, [k]: e.target.value }))
  const ubahAlt = (k) => (e) => setAlt((a) => ({ ...a, [k]: e.target.value }))
  const ubahManual = (k) => (e) => setManual((m) => ({ ...m, [k]: e.target.value }))
  const alihkan = (id) =>
    setTerpilih((daftar) => (daftar.includes(id) ? daftar.filter((x) => x !== id) : [...daftar, id]))

  // ── Susun data tiap surat ──
  const kelasPerGuru = {}
  kelas.forEach((k) => {
    if (!k.wali_kelas_id) return
    if (!kelasPerGuru[k.wali_kelas_id]) kelasPerGuru[k.wali_kelas_id] = []
    kelasPerGuru[k.wali_kelas_id].push(k.nama_kelas)
  })

  function dataDariGuru(g) {
    const kepsek = isKepalaSekolah(g)
    const kls = kelasPerGuru[g.id] || []
    return {
      key: g.id,
      kepsek,
      nama: g.nama_lengkap || '',
      nip: g.nip || '',
      pangkat: g.pangkat_golongan || '',
      jabatan: kepsek ? 'Kepala Sekolah' : g.jenis_ptk || 'Guru',
      tugas: kepsek ? 'Kepala Sekolah' : kls.length ? `Guru Kelas ${kls.join(', ')}` : g.jenis_ptk || 'Guru',
      tambahan: kepsek ? '' : g.tugas_tambahan || '',
      tmt: String(g.tmt_pengangkatan || g.tmt_pns || '').slice(0, 10),
    }
  }

  const daftarSurat = guru.filter((g) => terpilih.includes(g.id)).map(dataDariGuru)
  if (pakaiManual) {
    daftarSurat.push({
      ...DATA_KOSONG,
      key: 'manual',
      nama: manual.nama,
      nip: manual.nip,
      pangkat: manual.pangkat,
      jabatan: manual.jabatan,
      tugas: manual.tugas || manual.jabatan,
    })
  }
  if (daftarSurat.length === 0) daftarSurat.push(DATA_KOSONG)

  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul="Keterangan Melaksanakan Tugas" />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah, guru, dan kelas…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data belum bisa dibaca ({galat}). Anda tetap bisa mengisi manual lewat bagian "Isi manual" di bawah.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {daftarSurat.length} surat akan tercetak, masing-masing satu halaman.
          </div>
        )}

        <Bagian judul="Data surat" keterangan="Nomor, tempat, tanggal, dan periode tugas.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor surat (angka di awal naik otomatis untuk surat berikutnya)">
              <input className={inputCls} value={surat.nomor} onChange={ubahSurat('nomor')} placeholder="mis. 001/SKT/2026" />
            </Field>
            <Field label="Tempat surat dibuat">
              <input className={inputCls} value={surat.tempat} onChange={ubahSurat('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Tanggal surat">
              <input type="date" className={inputCls} value={surat.tanggal} onChange={ubahSurat('tanggal')} />
            </Field>
            <Field label="Periode tugas">
              <input className={inputCls} value={surat.periode} onChange={ubahSurat('periode')} placeholder="mis. Tahun Pelajaran 2026/2027, atau Bulan Agustus 2026" />
            </Field>
            <Field label="Keperluan (opsional)" className="sm:col-span-2">
              <input className={inputCls} value={surat.keperluan} onChange={ubahSurat('keperluan')} placeholder="mis. pengajuan tunjangan profesi guru" />
            </Field>
            <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={surat.tampilTmt}
                onChange={(e) => setSurat((s) => ({ ...s, tampilTmt: e.target.checked }))}
              />
              <span>
                Cantumkan tanggal mulai tugas (TMT) dari Data Guru
                <span className="block text-xs text-slate-500">
                  Memakai TMT Pengangkatan, atau TMT PNS kalau kosong. Cek dulu tanggalnya benar sebelum dicetak.
                </span>
              </span>
            </label>
          </div>
        </Bagian>

        <Bagian
          judul="Pilih guru/pegawai"
          keterangan="Centang satu atau beberapa. Setiap orang mendapat satu lembar surat."
          aksi={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTerpilih(guru.map((g) => g.id))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => setTerpilih([])}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                Kosongkan
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
          {guru.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data guru aktif yang terbaca.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {guru.map((g) => {
                const d = dataDariGuru(g)
                return (
                  <label key={g.id} className="flex items-start gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={terpilih.includes(g.id)} onChange={() => alihkan(g.id)} />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-800">{d.nama || '(tanpa nama)'}</span>
                      <span className="block text-xs text-slate-500">
                        {[d.nip && `NIP. ${d.nip}`, d.tugas].filter(Boolean).join(' | ')}
                        {d.kepsek && ' | ditandatangani penandatangan alternatif'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={pakaiManual} onChange={(e) => setPakaiManual(e.target.checked)} />
            Isi manual (untuk pegawai yang tidak ada di Data Guru)
          </label>
          {pakaiManual && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nama">
                <input className={inputCls} value={manual.nama} onChange={ubahManual('nama')} />
              </Field>
              <Field label="NIP (kosongkan kalau tidak ada)">
                <input className={inputCls} value={manual.nip} onChange={ubahManual('nip')} inputMode="numeric" />
              </Field>
              <Field label="Pangkat/Golongan">
                <input className={inputCls} value={manual.pangkat} onChange={ubahManual('pangkat')} />
              </Field>
              <Field label="Jabatan">
                <input className={inputCls} value={manual.jabatan} onChange={ubahManual('jabatan')} placeholder="mis. Operator Sekolah" />
              </Field>
              <Field label="Bertugas sebagai (untuk kalimat surat)" className="sm:col-span-2">
                <input className={inputCls} value={manual.tugas} onChange={ubahManual('tugas')} placeholder="Kosong = sama dengan jabatan" />
              </Field>
            </div>
          )}
        </Bagian>

        <Bagian
          judul="Isi surat"
          keterangan="Penanda yang otomatis diganti: {nama}, {tugas}, {sekolah}, {tmt}, {periode}."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Kalimat utama">
              <textarea className={inputCls} rows={4} value={paragraf} onChange={(e) => setParagraf(e.target.value)} />
            </Field>
            <Field label="Kalimat penutup">
              <textarea className={inputCls} rows={2} value={penutup} onChange={(e) => setPenutup(e.target.value)} />
            </Field>
          </div>
        </Bagian>

        <Bagian
          judul="Kop dan penandatangan"
          keterangan="Kop dan Kepala Sekolah diambil dari Profil Sekolah."
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
            <Field label="Pangkat/Golongan kepala sekolah">
              <input className={inputCls} value={pangkatKepala} onChange={(e) => setPangkatKepala(e.target.value)} />
            </Field>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-600">
            Penandatangan alternatif, khusus surat untuk Kepala Sekolah sendiri
          </p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Jabatan">
              <input className={inputCls} value={alt.jabatan} onChange={ubahAlt('jabatan')} />
            </Field>
            <Field label="Nama">
              <input className={inputCls} value={alt.nama} onChange={ubahAlt('nama')} />
            </Field>
            <Field label="NIP">
              <input className={inputCls} value={alt.nip} onChange={ubahAlt('nip')} inputMode="numeric" />
            </Field>
            <Field label="Pangkat/Golongan">
              <input className={inputCls} value={alt.pangkat} onChange={ubahAlt('pangkat')} />
            </Field>
          </div>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah. Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak: satu surat per lembar ── */}
      <AreaLembar>
        {daftarSurat.map((d, i) => {
          const penanda = d.kepsek
            ? { jabatan: isi(alt.jabatan, 'Pengawas Sekolah'), nama: alt.nama, nip: alt.nip, pangkat: alt.pangkat }
            : { jabatan: `Kepala ${namaSekolah}`, nama: sekolah.kepala, nip: sekolah.nipKepala, pangkat: pangkatKepala }

          const tmtTeks = surat.tampilTmt && d.tmt ? `, sejak tanggal ${formatTanggalSK(d.tmt)}` : ''
          const kalimatUtama = isiTemplate(paragraf, {
            nama: isi(d.nama),
            tugas: isi(d.tugas),
            sekolah: namaSekolah,
            tmt: tmtTeks,
            periode: isi(surat.periode),
          })

          return (
            <HalamanSurat
              key={d.key}
              sekolah={sekolah}
              judul="Surat Keterangan Melaksanakan Tugas"
              nomor={nomorKe(surat.nomor, i)}
              ttd={{
                tempat: surat.tempat,
                tanggal: surat.tanggal,
                jabatan: penanda.jabatan,
                nama: penanda.nama,
                nip: penanda.nip,
              }}
            >
              <p style={{ marginBottom: 4 }}>Yang bertanda tangan di bawah ini:</p>
              <TabelData
                baris={[
                  ['Nama', isi(penanda.nama)],
                  ['NIP', isi(penanda.nip)],
                  ['Pangkat/Golongan', isi(penanda.pangkat, '-')],
                  ['Jabatan', penanda.jabatan],
                ]}
              />

              <p style={{ marginBottom: 4 }}>Menerangkan bahwa:</p>
              <TabelData
                baris={[
                  ['Nama', isi(d.nama)],
                  ['NIP', isi(d.nip, '-')],
                  ['Pangkat/Golongan', isi(d.pangkat, '-')],
                  ['Jabatan', isi(d.jabatan)],
                  ...(d.tambahan ? [['Tugas Tambahan', d.tambahan]] : []),
                  ['Unit Kerja', namaSekolah],
                ]}
              />

              <p className="sk-paragraf">{kalimatUtama}</p>
              {surat.keperluan.trim() && (
                <p className="sk-paragraf">Surat keterangan ini dibuat untuk keperluan {surat.keperluan.trim()}.</p>
              )}
              <p className="sk-paragraf">{penutup}</p>
            </HalamanSurat>
          )
        })}
      </AreaLembar>
    </div>
  )
}
