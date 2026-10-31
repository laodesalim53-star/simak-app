import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Download, GraduationCap, Undo2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  btnPrimer,
  btnSekunder,
  formatTanggal,
  inputCls,
  namaSiswa,
  nisnSiswa,
  unduhCsv,
} from '../lib/akademikHelper'

const LABEL_STATUS = { pindah: 'Pindah sekolah', keluar: 'Keluar / mengundurkan diri', meninggal: 'Meninggal dunia' }

// Halaman admin: catat mutasi siswa masuk/keluar dan lihat daftar alumni.
// Siswa yang keluar tidak dihapus, hanya diberi status baru (lihat fn_mutasi_siswa).
export default function MutasiSiswa() {
  const { isAdmin, sekolahId } = useAuth()
  const [tab, setTab] = useState('mutasi')
  const [riwayat, setRiwayat] = useState([])
  const [siswaAll, setSiswaAll] = useState([])
  const [kelasMap, setKelasMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [pesan, setPesan] = useState(null)

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setLoading(true)
    const [m, s, k] = await Promise.all([
      supabase
        .from('mutasi_siswa')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('tanggal', { ascending: false }),
      supabase.from('siswa').select('*').eq('sekolah_id', sekolahId),
      supabase.from('kelas').select('id,nama_kelas').eq('sekolah_id', sekolahId),
    ])
    const err = m.error || s.error
    if (err) setPesan({ tipe: 'err', teks: `Gagal memuat data: ${err.message}` })
    setRiwayat(m.data || [])
    setSiswaAll(s.data || [])
    setKelasMap(Object.fromEntries((k.data || []).map((x) => [x.id, x.nama_kelas])))
    setLoading(false)
  }, [sekolahId])

  useEffect(() => {
    muat()
  }, [muat])

  if (!isAdmin) {
    return (
      <Layout title="Mutasi Siswa & Alumni">
        <p className="text-sm text-slate-600">Halaman ini hanya untuk admin sekolah.</p>
      </Layout>
    )
  }

  return (
    <Layout title="Mutasi Siswa & Alumni" subtitle="Catat siswa pindah/keluar, siswa masuk, dan lihat alumni">
      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {[
          ['mutasi', 'Mutasi Siswa', ArrowRightLeft],
          ['alumni', 'Alumni', GraduationCap],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id)
              setPesan(null)
            }}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {pesan && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            pesan.tipe === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Memuat…</p>
      ) : tab === 'mutasi' ? (
        <TabMutasi riwayat={riwayat} siswaAll={siswaAll} kelasMap={kelasMap} muat={muat} setPesan={setPesan} />
      ) : (
        <TabAlumni siswaAll={siswaAll} kelasMap={kelasMap} />
      )}
    </Layout>
  )
}

// ---------------------------------------------------------------------
function TabMutasi({ riwayat, siswaAll, kelasMap, muat, setPesan }) {
  const hariIni = new Date().toISOString().slice(0, 10)
  const [jenis, setJenis] = useState('keluar')
  const [cari, setCari] = useState('')
  const [siswaId, setSiswaId] = useState('')
  const [status, setStatus] = useState('pindah')
  const [tanggal, setTanggal] = useState(hariIni)
  const [sekolahLain, setSekolahLain] = useState('')
  const [nomorSurat, setNomorSurat] = useState('')
  const [alasan, setAlasan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [filter, setFilter] = useState('semua')

  const siswaAktif = useMemo(
    () => siswaAll.filter((s) => (s.status_siswa ?? 'aktif') === 'aktif'),
    [siswaAll]
  )
  const kandidat = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return siswaAktif
      .filter((s) => !q || namaSiswa(s).toLowerCase().includes(q) || String(nisnSiswa(s)).includes(q))
      .sort((a, b) => namaSiswa(a).localeCompare(namaSiswa(b)))
      .slice(0, 100)
  }, [siswaAktif, cari])

  async function simpan(e) {
    e.preventDefault()
    if (!siswaId) {
      setPesan({ tipe: 'err', teks: 'Pilih siswa terlebih dahulu.' })
      return
    }
    setSibuk(true)
    const { error } = await supabase.rpc('fn_mutasi_siswa', {
      p_siswa_id: siswaId,
      p_jenis: jenis,
      p_tanggal: tanggal || hariIni,
      p_sekolah_lain: sekolahLain.trim() || null,
      p_alasan: alasan.trim() || null,
      p_nomor_surat: nomorSurat.trim() || null,
      p_status: status,
    })
    setSibuk(false)
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    setPesan({
      tipe: 'ok',
      teks: jenis === 'keluar' ? 'Mutasi keluar dicatat. Siswa tidak lagi berstatus aktif.' : 'Mutasi masuk dicatat.',
    })
    setSiswaId('')
    setCari('')
    setSekolahLain('')
    setNomorSurat('')
    setAlasan('')
    muat()
  }

  async function batalkan(row) {
    const pesanKonfirmasi =
      row.jenis === 'keluar'
        ? `Batalkan mutasi ${row.nama_siswa}? Siswa akan dikembalikan ke status aktif.`
        : `Hapus catatan mutasi masuk ${row.nama_siswa}?`
    if (!window.confirm(pesanKonfirmasi)) return
    const { error } = await supabase.rpc('fn_batalkan_mutasi', { p_id: row.id })
    if (error) {
      setPesan({ tipe: 'err', teks: error.message })
      return
    }
    setPesan({ tipe: 'ok', teks: 'Mutasi dibatalkan.' })
    muat()
  }

  const tampil = riwayat.filter((r) => filter === 'semua' || r.jenis === filter)

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={simpan}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1"
      >
        <h3 className="font-semibold text-slate-800">Catat Mutasi</h3>

        <div className="grid grid-cols-2 gap-2">
          {[
            ['keluar', 'Siswa Keluar'],
            ['masuk', 'Siswa Masuk'],
          ].map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => setJenis(v)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                jenis === v
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {jenis === 'masuk' && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Untuk siswa pindahan, tambahkan dulu datanya di halaman Siswa, lalu catat asal sekolahnya di sini.
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Cari siswa (nama / NISN)</label>
          <input className={inputCls} value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik nama…" />
        </div>
        <div>
          <select
            className={inputCls}
            size={5}
            value={siswaId}
            onChange={(e) => setSiswaId(e.target.value)}
          >
            {kandidat.map((s) => (
              <option key={s.id} value={s.id}>
                {namaSiswa(s)} {kelasMap[s.kelas_id] ? `(${kelasMap[s.kelas_id]})` : ''}
              </option>
            ))}
          </select>
          {siswaAktif.length > 100 && kandidat.length === 100 && (
            <p className="mt-1 text-xs text-slate-400">Menampilkan 100 pertama, persempit dengan pencarian.</p>
          )}
        </div>

        {jenis === 'keluar' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Alasan mutasi</label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(LABEL_STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tanggal</label>
          <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {jenis === 'keluar' ? 'Sekolah tujuan' : 'Sekolah asal'}
          </label>
          <input className={inputCls} value={sekolahLain} onChange={(e) => setSekolahLain(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nomor surat (opsional)</label>
          <input className={inputCls} value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Keterangan (opsional)</label>
          <textarea rows={2} className={inputCls} value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </div>

        <button type="submit" disabled={sibuk || !siswaId} className={`${btnPrimer} w-full`}>
          {sibuk ? 'Menyimpan…' : 'Simpan Mutasi'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="flex-1 font-semibold text-slate-800">Riwayat Mutasi ({tampil.length})</h3>
          <select className={`${inputCls} w-40`} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="semua">Semua</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
          </select>
          <button
            className={btnSekunder}
            disabled={tampil.length === 0}
            onClick={() =>
              unduhCsv('mutasi-siswa.csv', [
                ['Tanggal', 'Jenis', 'Status', 'Nama', 'NISN', 'Kelas terakhir', 'Sekolah asal/tujuan', 'No. surat', 'Keterangan'],
                ...tampil.map((r) => [
                  r.tanggal, r.jenis, r.status, r.nama_siswa, r.nisn, r.kelas_terakhir,
                  r.sekolah_asal_tujuan, r.nomor_surat, r.alasan,
                ]),
              ])
            }
          >
            <Download size={14} /> CSV
          </button>
        </div>

        {tampil.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada catatan mutasi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Siswa</th>
                  <th className="py-2 pr-3">Jenis</th>
                  <th className="py-2 pr-3">Sekolah asal/tujuan</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {tampil.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{formatTanggal(r.tanggal)}</td>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-800">{r.nama_siswa || '-'}</p>
                      <p className="text-xs text-slate-500">
                        {r.nisn || '-'}
                        {r.kelas_terakhir ? ` · ${r.kelas_terakhir}` : ''}
                      </p>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.jenis === 'masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.jenis === 'masuk' ? 'Masuk' : LABEL_STATUS[r.status] || 'Keluar'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {r.sekolah_asal_tujuan || '-'}
                      {r.nomor_surat && <p className="text-xs text-slate-400">No. {r.nomor_surat}</p>}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        title="Batalkan"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                        onClick={() => batalkan(r)}
                      >
                        <Undo2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
function TabAlumni({ siswaAll, kelasMap }) {
  const alumni = useMemo(() => siswaAll.filter((s) => s.status_siswa === 'lulus'), [siswaAll])
  const tahunList = useMemo(
    () => [...new Set(alumni.map((s) => s.tahun_lulus).filter(Boolean))].sort().reverse(),
    [alumni]
  )
  const [tahun, setTahun] = useState('semua')
  const [cari, setCari] = useState('')

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return alumni
      .filter((s) => tahun === 'semua' || s.tahun_lulus === tahun)
      .filter((s) => !q || namaSiswa(s).toLowerCase().includes(q) || String(nisnSiswa(s)).includes(q))
      .sort((a, b) => namaSiswa(a).localeCompare(namaSiswa(b)))
  }, [alumni, tahun, cari])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="flex-1 font-semibold text-slate-800">Alumni ({tampil.length})</h3>
        <select className={`${inputCls} w-40`} value={tahun} onChange={(e) => setTahun(e.target.value)}>
          <option value="semua">Semua tahun</option>
          {tahunList.map((t) => (
            <option key={t} value={t}>
              Lulus {t}
            </option>
          ))}
        </select>
        <input
          className={`${inputCls} w-52`}
          placeholder="Cari nama / NISN"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <button
          className={btnSekunder}
          disabled={tampil.length === 0}
          onClick={() =>
            unduhCsv('alumni.csv', [
              ['Nama', 'NISN', 'Tahun lulus', 'Kelas terakhir'],
              ...tampil.map((s) => [namaSiswa(s), nisnSiswa(s), s.tahun_lulus, kelasMap[s.kelas_id]]),
            ])
          }
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {alumni.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada alumni. Siswa kelas akhir otomatis menjadi alumni saat Kenaikan Kelas diproses.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">NISN</th>
                <th className="py-2 pr-3">Tahun lulus</th>
                <th className="py-2">Kelas terakhir</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-800">{namaSiswa(s)}</td>
                  <td className="py-2 pr-3 text-slate-500">{nisnSiswa(s)}</td>
                  <td className="py-2 pr-3 text-slate-600">{s.tahun_lulus || '-'}</td>
                  <td className="py-2 text-slate-600">{kelasMap[s.kelas_id] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
