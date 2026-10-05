import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer, Search, Users, ScrollText } from 'lucide-react'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// Bucket Storage tempat foto siswa disimpan (kolom siswa.foto_path). Sesuaikan jika namanya beda.
const FOTO_BUCKET = 'foto-siswa'

const pick = (obj, ...keys) => {
  if (!obj) return ''
  for (const k of keys) if (obj[k]) return obj[k]
  return ''
}
const tampil = (v) => (v === null || v === undefined || String(v).trim() === '' ? '-' : v)
const fmtTanggal = (v) => {
  if (!v) return '-'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
const jk = (v) => {
  if (!v) return '-'
  const s = String(v).toLowerCase()
  if (s.startsWith('l')) return 'Laki-laki'
  if (s.startsWith('p')) return 'Perempuan'
  return v
}
const alamatGabung = (...bagian) => bagian.filter((x) => x && String(x).trim()).join(', ') || '-'

function fotoUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return supabase.storage.from(FOTO_BUCKET).getPublicUrl(path).data?.publicUrl || ''
}

function Baris({ no, label, children }) {
  return (
    <tr>
      <td className="bi-no">{no}</td>
      <td className="bi-label">{label}</td>
      <td className="bi-sep">:</td>
      <td className="bi-isi">{children}</td>
    </tr>
  )
}

function LembarBukuInduk({ s, kelasNama, sekolah, aktif }) {
  const foto = fotoUrl(s.foto_path)
  const kepsek = pick(sekolah, 'nama_kepala_sekolah', 'kepala_sekolah', 'nama_kepsek')
  const nipKepsek = pick(sekolah, 'nip_kepala_sekolah', 'nip_kepsek')
  const kota = pick(sekolah, 'kabupaten_kota', 'kabupaten', 'kota')

  return (
    <section className={`bi-section ${aktif ? 'bi-aktif' : ''}`}>
      {/* Kop surat resmi (nama sekolah, alamat, logo) */}
      <KopSurat />

      <div className="bi-judul">
        <div className="bi-judul-utama">BUKU INDUK SISWA</div>
      </div>

      <table className="bi-tabel">
        <tbody>
          <Baris no="" label="Nomor Induk Siswa"><b>{tampil(s.nis)}</b></Baris>
          <Baris no="" label="NISN">{tampil(s.nisn)}</Baris>
          <Baris no="" label="Kelas Saat Ini">{tampil(kelasNama)}</Baris>
          <Baris no="" label="Tanggal Masuk">{fmtTanggal(s.dibuat_pada)}</Baris>
          <Baris no="" label="Status">{tampil(s.status)}</Baris>
        </tbody>
      </table>

      <div className="bi-bagian">A. KETERANGAN TENTANG DIRI SISWA</div>
      <table className="bi-tabel">
        <tbody>
          <Baris no="1." label="Nama Lengkap">{tampil(s.nama_lengkap)}</Baris>
          <Baris no="2." label="Jenis Kelamin">{jk(s.jenis_kelamin)}</Baris>
          <Baris no="3." label="Tempat, Tanggal Lahir">{`${tampil(s.tempat_lahir)}, ${fmtTanggal(s.tanggal_lahir)}`}</Baris>
          <Baris no="4." label="Agama">{tampil(s.agama)}</Baris>
          <Baris no="5." label="NIK">{tampil(s.nik)}</Baris>
          <Baris no="6." label="Nomor Kartu Keluarga">{tampil(s.nomor_kk)}</Baris>
          <Baris no="7." label="Pendidikan Sebelumnya">{tampil(s.pendidikan_sebelumnya)}</Baris>
          <Baris no="8." label="Alamat Tempat Tinggal">
            {alamatGabung(s.alamat_tinggal || s.alamat)}
          </Baris>
          <Baris no="" label="Desa/Kelurahan">{tampil(s.kelurahan_desa)}</Baris>
          <Baris no="" label="Kecamatan">{tampil(s.kecamatan)}</Baris>
          <Baris no="" label="Kabupaten/Kota">{tampil(s.kabupaten_kota)}</Baris>
          <Baris no="" label="Provinsi">{tampil(s.provinsi)}</Baris>
        </tbody>
      </table>

      <div className="bi-bagian">B. KETERANGAN ORANG TUA KANDUNG</div>
      <table className="bi-tabel">
        <tbody>
          <Baris no="1." label="Nama Ayah">{tampil(s.nama_ayah || s.nama_orang_tua)}</Baris>
          <Baris no="2." label="Pendidikan Ayah">{tampil(s.pendidikan_ayah)}</Baris>
          <Baris no="3." label="Pekerjaan Ayah">{tampil(s.pekerjaan_ayah)}</Baris>
          <Baris no="4." label="Nama Ibu">{tampil(s.nama_ibu)}</Baris>
          <Baris no="5." label="Pendidikan Ibu">{tampil(s.pendidikan_ibu)}</Baris>
          <Baris no="6." label="Pekerjaan Ibu">{tampil(s.pekerjaan_ibu)}</Baris>
          <Baris no="7." label="Alamat Orang Tua">
            {alamatGabung(s.ortu_alamat, s.ortu_kelurahan_desa, s.ortu_kecamatan, s.ortu_kabupaten_kota, s.ortu_provinsi)}
          </Baris>
          <Baris no="8." label="No. HP Orang Tua">{tampil(s.no_hp_orang_tua)}</Baris>
        </tbody>
      </table>

      <div className="bi-bagian">C. KETERANGAN WALI</div>
      <table className="bi-tabel">
        <tbody>
          <Baris no="1." label="Nama Wali">{tampil(s.nama_wali)}</Baris>
          <Baris no="2." label="Pekerjaan Wali">{tampil(s.pekerjaan_wali)}</Baris>
          <Baris no="3." label="Alamat Wali">{tampil(s.alamat_wali)}</Baris>
        </tbody>
      </table>

      <div className="bi-bagian">D. KETERANGAN PERKEMBANGAN / MUTASI SISWA</div>
      <table className="bi-grid">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Tanggal</th>
            <th>Keterangan (naik kelas, pindah, lulus, putus sekolah)</th>
            <th style={{ width: '16%' }}>Paraf</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((i) => (
            <tr key={i}>
              <td>&nbsp;</td>
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bi-ttd-wrap">
        <div className="bi-foto">
          {foto ? (
            <img
              src={foto}
              alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <span>Pas foto<br />3 x 4</span>
          )}
        </div>
        <div className="bi-ttd">
          <div>{kota ? `${kota}, ` : ''}...................................</div>
          <div>Kepala Sekolah,</div>
          <div className="bi-ttd-ruang" />
          <div className="bi-ttd-nama">{kepsek || '...................................'}</div>
          {nipKepsek && <div>NIP. {nipKepsek}</div>}
        </div>
      </div>
    </section>
  )
}

export default function BukuIndukSiswa() {
  const { profil } = useAuth()
  const sid = profil?.sekolah_id || null

  const [siswa, setSiswa] = useState([])
  const [kelas, setKelas] = useState([])
  const [sekolahList, setSekolahList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [terpilihId, setTerpilihId] = useState(null)
  const [mode, setMode] = useState('satu') // 'satu' | 'semua' — menentukan isi saat dicetak

  useEffect(() => {
    let batal = false
    ;(async () => {
      setLoading(true)
      let qs = supabase.from('siswa').select('*').order('nama_lengkap', { ascending: true })
      let qk = supabase.from('kelas').select('*')
      if (sid) {
        qs = qs.eq('sekolah_id', sid)
        qk = qk.eq('sekolah_id', sid)
      }
      const [rs, rk, rp] = await Promise.all([
        qs,
        qk,
        supabase.from('profil_sekolah').select('*'),
      ])
      if (batal) return
      if (rs.error) setError(rs.error.message)
      setSiswa(rs.data || [])
      setKelas(rk.data || [])
      setSekolahList(rp.data || [])
      setLoading(false)
    })()
    return () => { batal = true }
  }, [sid])

  const sekolahMap = useMemo(() => {
    const m = {}
    sekolahList.forEach((p) => { m[p.sekolah_id || p.id] = p })
    return m
  }, [sekolahList])

  const namaKelas = useMemo(() => {
    const m = {}
    kelas.forEach((k) => { m[k.id] = pick(k, 'nama_kelas', 'nama', 'kelas') })
    return m
  }, [kelas])

  const daftarStatus = useMemo(
    () => [...new Set(siswa.map((s) => s.status).filter(Boolean))],
    [siswa]
  )

  const hasil = useMemo(() => {
    const kata = q.trim().toLowerCase()
    return siswa.filter((s) => {
      if (filterKelas && s.kelas_id !== filterKelas) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (!kata) return true
      return `${s.nama_lengkap || ''} ${s.nis || ''} ${s.nisn || ''}`.toLowerCase().includes(kata)
    })
  }, [siswa, q, filterKelas, filterStatus])

  const terpilih = hasil.find((s) => s.id === terpilihId) || hasil[0] || null

  // Setelah dialog cetak ditutup, kembali ke mode 'satu' supaya layar tidak
  // memuat ratusan lembar (dan ratusan KopSurat) sekaligus.
  useEffect(() => {
    const reset = () => setMode('satu')
    window.addEventListener('afterprint', reset)
    return () => window.removeEventListener('afterprint', reset)
  }, [])

  const cetak = (m) => {
    setMode(m)
    // Jeda sedikit lebih lama agar kop surat (data + logo) selesai dimuat.
    setTimeout(() => window.print(), m === 'semua' ? 1200 : 400)
  }

  return (
    <Layout
      title="Buku Induk Siswa"
      subtitle="Data lengkap siswa sejak masuk sampai lulus, diambil dari data Siswa."
    >
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .bi-wrap.print-only { position: static !important; }
        @media screen { .bi-wrap.print-only { display: block !important; } }
        .bi-section { display: none; background: #fff; width: 190mm; max-width: none; margin: 0 auto;
          padding: 10mm; box-sizing: border-box; color: #000; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.35; }
        .bi-section.bi-aktif { display: block; }
        @media screen { .bi-section { border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); } }
        .bi-section .kop-surat-resmi { margin-bottom: 10px; }
        .bi-judul { text-align: center; margin-bottom: 8px; padding-bottom: 2px; }
        .bi-judul-utama { font-weight: bold; font-size: 14pt; letter-spacing: 1px; text-decoration: underline; }
        .bi-bagian { font-weight: bold; margin: 10px 0 3px; font-size: 11pt; }
        .bi-tabel { width: 100%; border-collapse: collapse; }
        .bi-tabel td { padding: 1.5px 0; vertical-align: top; }
        .bi-no { width: 7mm; }
        .bi-label { width: 52mm; }
        .bi-sep { width: 4mm; text-align: center; }
        .bi-isi { border-bottom: 1px dotted #666; }
        .bi-grid { width: 100%; border-collapse: collapse; }
        .bi-grid th, .bi-grid td { border: 1px solid #000; padding: 3px 5px; font-size: 10pt; height: 8mm; }
        .bi-grid th { text-align: center; height: auto; }
        .bi-ttd-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14px; page-break-inside: avoid; }
        .bi-foto { width: 30mm; height: 40mm; border: 1px solid #000; display: flex; align-items: center; justify-content: center;
          text-align: center; font-size: 9pt; color: #555; overflow: hidden; }
        .bi-foto img { position: static !important; display: block; float: none; width: 100%; height: 100%; object-fit: cover; }
        .bi-ttd { text-align: center; min-width: 65mm; }
        .bi-ttd-ruang { height: 18mm; }
        .bi-ttd-nama { font-weight: bold; text-decoration: underline; }
        @media print {
          .bi-section { display: none; border: 0; box-shadow: none; border-radius: 0; padding: 0; width: auto; }
          .bi-wrap.mode-satu .bi-section.bi-aktif { display: block; }
          .bi-wrap.mode-semua .bi-section { display: block; break-after: page; page-break-after: always; }
          .bi-wrap.mode-semua .bi-section:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print">
        <Link
          to="/administrasi-kepsek"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft size={15} /> Kembali ke Administrasi Kepala Sekolah
        </Link>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, NIS, atau NISN"
              aria-label="Cari siswa"
              className="w-full pl-9 pr-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </div>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl"
            aria-label="Filter kelas"
          >
            <option value="">Semua kelas</option>
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>{pick(k, 'nama_kelas', 'nama', 'kelas')}</option>
            ))}
          </select>
          {daftarStatus.length > 0 && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-base sm:text-sm bg-white border border-slate-200 rounded-xl"
              aria-label="Filter status"
            >
              <option value="">Semua status</option>
              {daftarStatus.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <button
              onClick={() => cetak('satu')}
              disabled={!terpilih}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-xl bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40"
            >
              <Printer size={15} /> Cetak siswa ini
            </button>
            <button
              onClick={() => cetak('semua')}
              disabled={hasil.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <Users size={15} /> Cetak semua ({hasil.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Gagal memuat data: {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="no-print text-sm text-slate-500 py-10 text-center">Memuat data siswa…</div>
      ) : hasil.length === 0 ? (
        <div className="no-print rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          <ScrollText size={22} className="mx-auto mb-2 text-slate-300" />
          Tidak ada siswa yang cocok.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
          <div className="no-print bg-white rounded-2xl border border-slate-200 overflow-hidden lg:sticky lg:top-4">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-100">
              {hasil.length} siswa
            </div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {hasil.map((s) => {
                const aktif = terpilih && s.id === terpilih.id
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setTerpilihId(s.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                        aktif ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-medium leading-snug">{s.nama_lengkap}</span>
                      <span className="block text-xs text-slate-500">
                        {namaKelas[s.kelas_id] || 'Tanpa kelas'}{s.nis ? ` · NIS ${s.nis}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <div className={`bi-wrap print-only mode-${mode}`}>
              {hasil
                .filter((s) => mode === 'semua' || (terpilih && s.id === terpilih.id))
                .map((s) => (
                  <LembarBukuInduk
                    key={s.id}
                    s={s}
                    kelasNama={namaKelas[s.kelas_id]}
                    sekolah={sekolahMap[s.sekolah_id] || sekolahMap[sid] || null}
                    aktif={terpilih && s.id === terpilih.id}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
