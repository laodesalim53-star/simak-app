import { useEffect, useMemo, useState } from 'react'
import { Printer, RotateCcw, Archive, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'

// Surat Keterangan Tidak Memiliki SKHUN — route: /gudang-sk/keterangan-tidak-memiliki-skhun
//
// Halaman mandiri: isi formulir di kiri, pratinjau surat A4 di kanan, tombol
// Cetak memakai window.print() (hanya area surat yang tercetak).
// Arsip: tombol "Simpan ke Surat Keluar" menulis satu baris ke tabel `surat`
// (jenis 'keluar'), sama seperti form manual di halaman Surat Masuk & Keluar.
// Penanda di kolom catatan (SKHUN:<NISN>) mencegah data ganda: simpan ulang
// akan memperbarui baris yang sama, bukan menambah baru.
// Kolom yang bernilai "TODO" di bawah sebaiknya nanti ditarik dari profil_sekolah
// (nama sekolah, alamat, kepala sekolah, NIP) seperti halaman cetak lainnya.

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function tanggalIndo(iso) {
  if (!iso) return '........................'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return '........................'
  return `${d} ${BULAN[m - 1]} ${y}`
}

const hariIni = () => new Date().toISOString().slice(0, 10)

const AWAL = {
  // Data sekolah — TODO: tarik dari profil_sekolah
  pemda: 'PEMERINTAH KABUPATEN KEPULAUAN ARU',
  dinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  sekolah: 'SD NEGERI WARIA',
  alamat: '',
  kepalaSekolah: '',
  nipKepsek: '',
  // Data surat
  nomor: '',
  tanggalSurat: hariIni(),
  tujuan: '',
  tempatSurat: 'Waria',
  // Data siswa (contoh dari ijazah)
  nama: 'AMBO SUREY',
  tempatLahir: 'Waria',
  tanggalLahir: '2003-09-06',
  orangTua: 'Jafar Surey',
  nis: '475',
  nisn: '0003699878',
  noPeserta: '1-16-21-09-038-001-8',
  tahunPelajaran: '2015/2016',
  tanggalIjazah: '2016-06-25',
}

// Ambil nilai pertama yang terisi dari beberapa kemungkinan nama kolom.
const ambil = (obj, kunci) => {
  for (const k of kunci) if (obj && obj[k]) return String(obj[k]).trim()
  return ''
}

// Muat data sekolah + kepala sekolah. Pakai select('*') supaya tidak error kalau
// nama kolomnya berbeda. Urutan sumber kepala sekolah:
//   1) kolom di profil_sekolah (nama_kepala_sekolah / nama_kepsek / kepala_sekolah ...)
//   2) tabel guru yang jabatannya "Kepala Sekolah"
// Sumber yang dipakai dicatat di console (console.info) untuk memudahkan pengecekan.
async function muatDataKepsek(sekolahId) {
  const hasil = { sekolah: '', alamat: '', kabupaten: '', kepsek: '', nip: '', sumber: '' }

  const { data: ps } = await supabase
    .from('profil_sekolah')
    .select('*')
    .eq('sekolah_id', sekolahId)
    .maybeSingle()

  if (ps) {
    hasil.sekolah = ambil(ps, ['nama_sekolah'])
    hasil.alamat = ambil(ps, ['alamat'])
    hasil.kabupaten = ambil(ps, ['kabupaten'])
    hasil.kepsek = ambil(ps, ['nama_kepala_sekolah', 'nama_kepsek', 'kepala_sekolah', 'kepsek'])
    hasil.nip = ambil(ps, ['nip_kepala_sekolah', 'nip_kepsek', 'nip_kepala', 'nip_kepala_sekolah_baru'])
    if (hasil.kepsek) hasil.sumber = 'profil_sekolah'
  }

  if (!hasil.kepsek) {
    const { data: gr } = await supabase
      .from('guru')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .ilike('jabatan', '%kepala sekolah%')
      .limit(1)
    const g = gr && gr[0]
    if (g) {
      hasil.kepsek = ambil(g, ['nama', 'nama_lengkap'])
      hasil.nip = hasil.nip || ambil(g, ['nip'])
      hasil.sumber = 'guru'
    }
  }
  return hasil
}

// "Kepulauan Aru" dari "Kabupaten Kepulauan Aru" / "PEMERINTAH KABUPATEN KEPULAUAN ARU"
const bersihKabupaten = (k) =>
  k.replace(/^pemerintah\s+/i, '').replace(/^kabupaten\s+/i, '').replace(/^kab\.?\s+/i, '').trim()

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300'

export default function KeteranganTidakSKHUN() {
  const [f, setF] = useState(AWAL)
  const [arsip, setArsip] = useState(true) // arsipkan otomatis saat cetak
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState(null) // { ok: bool, teks: string }
  const { profil } = useAuth()
  const sekolahId = profil?.sekolah_id
  const [kabupaten, setKabupaten] = useState('Kepulauan Aru')
  const [sumberKepsek, setSumberKepsek] = useState('')

  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    muatDataKepsek(sekolahId).then((d) => {
      if (batal) return
      const kab = bersihKabupaten(d.kabupaten)
      if (kab) setKabupaten(kab)
      setSumberKepsek(d.sumber)
      console.info('[SKHUN] sumber kepala sekolah:', d.sumber || '(tidak ditemukan)', d)
      setF((s) => ({
        ...s,
        sekolah: d.sekolah ? d.sekolah.toUpperCase() : s.sekolah,
        pemda: kab ? `PEMERINTAH KABUPATEN ${kab.toUpperCase()}` : s.pemda,
        alamat: s.alamat || d.alamat,
        kepalaSekolah: s.kepalaSekolah || d.kepsek,
        nipKepsek: s.nipKepsek || d.nip,
      }))
    })
    return () => { batal = true }
  }, [sekolahId])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  // Simpan / perbarui baris arsip di tabel `surat`. Mengembalikan true jika berhasil.
  async function simpanKeSuratKeluar() {
    if (!f.nama.trim()) {
      setPesan({ ok: false, teks: 'Nama siswa belum diisi.' })
      return false
    }
    setMenyimpan(true)
    setPesan(null)
    const penanda = `SKHUN:${f.nisn || f.nis || f.nama}`
    const baris = {
      jenis: 'keluar',
      nomor_surat: f.nomor || null,
      perihal: `Surat Keterangan Tidak Memiliki SKHUN a.n. ${f.nama}`,
      pengirim_tujuan: f.tujuan || 'Yang bersangkutan / instansi terkait',
      tanggal: f.tanggalSurat || hariIni(),
      catatan: penanda,
    }
    const { data: ada, error: errCari } = await supabase
      .from('surat')
      .select('id')
      .eq('catatan', penanda)
      .limit(1)
    if (errCari) {
      setMenyimpan(false)
      setPesan({ ok: false, teks: 'Gagal memeriksa arsip: ' + errCari.message })
      return false
    }
    const { error } = ada && ada.length
      ? await supabase.from('surat').update(baris).eq('id', ada[0].id)
      : await supabase.from('surat').insert(baris)
    setMenyimpan(false)
    if (error) {
      setPesan({ ok: false, teks: 'Gagal menyimpan: ' + error.message })
      return false
    }
    setPesan({ ok: true, teks: ada && ada.length ? 'Arsip Surat Keluar diperbarui.' : 'Tersimpan di arsip Surat Keluar.' })
    return true
  }

  async function cetak() {
    if (arsip) await simpanKeSuratKeluar()
    window.print()
  }

  const ttl = useMemo(
    () => `${f.tempatLahir || '........'}, ${tanggalIndo(f.tanggalLahir)}`,
    [f.tempatLahir, f.tanggalLahir]
  )

  const barisData = [
    ['Nama', f.nama],
    ['Tempat, Tanggal Lahir', ttl],
    ['Nama Orang Tua/Wali', f.orangTua],
    ['Nomor Induk Siswa (NIS)', f.nis],
    ['NISN', f.nisn],
    ['Nomor Peserta Ujian Sekolah', f.noPeserta],
    ['Sekolah Asal', f.sekolah.replace(/^SD NEGERI/i, 'SD Negeri')],
    ['Tahun Pelajaran', f.tahunPelajaran],
  ]

  const namaSekolahJudul = f.sekolah
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/^Sd /, 'SD ')

  return (
    <Layout
      title="Keterangan Tidak Memiliki SKHUN"
      subtitle="Isi data siswa dari ijazah, periksa pratinjau, lalu cetak suratnya."
    >
      <style>{`
        @page { size: A4; margin: 20mm 25mm; }
        @media print {
          body * { visibility: hidden !important; }
          #cetak-skhun, #cetak-skhun * { visibility: visible !important; }
          #cetak-skhun {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; border: 0 !important; padding: 0 !important;
          }
        }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        {/* ---------- Formulir ---------- */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">Data Siswa</h3>
            <Field label="Nama lengkap">
              <input className={inputCls} value={f.nama} onChange={set('nama')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempat lahir">
                <input className={inputCls} value={f.tempatLahir} onChange={set('tempatLahir')} />
              </Field>
              <Field label="Tanggal lahir">
                <input type="date" className={inputCls} value={f.tanggalLahir} onChange={set('tanggalLahir')} />
              </Field>
            </div>
            <Field label="Nama orang tua/wali">
              <input className={inputCls} value={f.orangTua} onChange={set('orangTua')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIS">
                <input className={inputCls} value={f.nis} onChange={set('nis')} />
              </Field>
              <Field label="NISN">
                <input className={inputCls} value={f.nisn} onChange={set('nisn')} />
              </Field>
            </div>
            <Field label="Nomor peserta ujian sekolah">
              <input className={inputCls} value={f.noPeserta} onChange={set('noPeserta')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tahun pelajaran">
                <input className={inputCls} value={f.tahunPelajaran} onChange={set('tahunPelajaran')} />
              </Field>
              <Field label="Tanggal ijazah">
                <input type="date" className={inputCls} value={f.tanggalIjazah} onChange={set('tanggalIjazah')} />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">Data Surat & Sekolah</h3>
            <Field label="Nomor surat">
              <input className={inputCls} placeholder="mis. 421.2/012/SDN-WARIA/2026" value={f.nomor} onChange={set('nomor')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempat surat">
                <input className={inputCls} value={f.tempatSurat} onChange={set('tempatSurat')} />
              </Field>
              <Field label="Tanggal surat">
                <input type="date" className={inputCls} value={f.tanggalSurat} onChange={set('tanggalSurat')} />
              </Field>
            </div>
            <Field label="Tujuan surat (untuk arsip)">
              <input className={inputCls} placeholder="mis. Dinas Pendidikan / yang bersangkutan" value={f.tujuan} onChange={set('tujuan')} />
            </Field>
            <Field label="Alamat sekolah (kop surat)">
              <input className={inputCls} value={f.alamat} onChange={set('alamat')} />
            </Field>
            {sumberKepsek ? (
              <p className="text-[11px] text-emerald-700">Kepala sekolah dimuat otomatis dari {sumberKepsek}. Bisa diubah manual.</p>
            ) : (
              <p className="text-[11px] text-amber-700">Data kepala sekolah belum ditemukan di profil sekolah atau data guru. Isi manual.</p>
            )}
            <Field label="Nama kepala sekolah (beserta gelar)">
              <input className={inputCls} placeholder="mis. Nama, S.Pd." value={f.kepalaSekolah} onChange={set('kepalaSekolah')} />
            </Field>
            <Field label="NIP kepala sekolah">
              <input className={inputCls} value={f.nipKepsek} onChange={set('nipKepsek')} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={arsip} onChange={(e) => setArsip(e.target.checked)} />
            Arsipkan ke Surat Keluar otomatis saat mencetak
          </label>

          {pesan && (
            <p className={`text-xs ${pesan.ok ? 'text-emerald-700' : 'text-red-600'}`}>{pesan.teks}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cetak}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Printer size={16} /> Cetak
            </button>
            <button
              type="button"
              disabled={menyimpan}
              onClick={simpanKeSuratKeluar}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-60"
            >
              {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />} Simpan ke Surat Keluar
            </button>
            <button
              type="button"
              onClick={() => setF((s) => ({ ...AWAL, pemda: s.pemda, sekolah: s.sekolah, alamat: s.alamat, kepalaSekolah: s.kepalaSekolah, nipKepsek: s.nipKepsek }))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* ---------- Pratinjau surat ---------- */}
        <div className="overflow-x-auto">
          <div
            id="cetak-skhun"
            className="mx-auto bg-white border border-slate-200 shadow-sm text-black"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm 25mm',
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt',
              lineHeight: 1.5,
            }}
          >
            {/* Kop */}
            <div className="text-center" style={{ lineHeight: 1.25 }}>
              <div className="font-bold">{f.pemda}</div>
              <div className="font-bold">{f.dinas}</div>
              <div className="font-bold" style={{ fontSize: '14pt' }}>{f.sekolah}</div>
              {f.alamat && <div style={{ fontSize: '10pt', fontStyle: 'italic' }}>{f.alamat}</div>}
            </div>
            <div style={{ borderBottom: '3px double #000', margin: '6px 0 16px' }} />

            <div className="text-center" style={{ lineHeight: 1.3 }}>
              <div className="font-bold underline">SURAT KETERANGAN</div>
              <div className="font-bold">TIDAK MEMILIKI SKHUN</div>
              <div style={{ marginTop: 8, marginBottom: 14 }}>
                Nomor: {f.nomor || '........ / ........ / ........ / ........'}
              </div>
            </div>

            <p style={{ textAlign: 'justify' }}>
              Yang bertanda tangan di bawah ini, Kepala {namaSekolahJudul}, Kabupaten {kabupaten}, menerangkan bahwa:
            </p>

            <table style={{ margin: '6px 0 10px 36px', borderCollapse: 'collapse' }}>
              <tbody>
                {barisData.map(([label, nilai]) => (
                  <tr key={label} style={{ verticalAlign: 'top' }}>
                    <td style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ paddingRight: 8 }}>:</td>
                    <td>{nilai || '........................'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ textAlign: 'justify', textIndent: '36pt' }}>
              Nama tersebut di atas benar merupakan alumni {namaSekolahJudul} yang dinyatakan <b>LULUS</b> pada
              Tahun Pelajaran {f.tahunPelajaran || '........'} berdasarkan Ijazah Sekolah Dasar yang ditetapkan
              di Kabupaten Kepulauan Aru pada tanggal {tanggalIndo(f.tanggalIjazah)}.
            </p>
            <p style={{ textAlign: 'justify', textIndent: '36pt' }}>
              Bahwa pada Tahun Pelajaran {f.tahunPelajaran || '........'}, kelulusan peserta didik Sekolah Dasar
              ditentukan melalui Ujian Sekolah dan tidak diselenggarakan Ujian Nasional, sehingga yang
              bersangkutan <b>tidak memiliki Surat Keterangan Hasil Ujian Nasional (SKHUN)</b>.
            </p>
            <p style={{ textAlign: 'justify', textIndent: '36pt' }}>
              Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.
            </p>

            <div style={{ marginTop: 24, marginLeft: '52%', lineHeight: 1.3 }}>
              <div>{f.tempatSurat || '........'}, {tanggalIndo(f.tanggalSurat)}</div>
              <div>Kepala {namaSekolahJudul},</div>
              <div style={{ height: 72 }} />
              <div className="font-bold underline">{f.kepalaSekolah || '[Nama Kepala Sekolah]'}</div>
              <div>NIP. {f.nipKepsek || '[NIP]'}</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
