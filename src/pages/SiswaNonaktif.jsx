import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { RotateCcw, Loader2, Search } from 'lucide-react'

export default function SiswaNonaktif() {
  const { sekolahId } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [aktivasiId, setAktivasiId] = useState(null) // id siswa yang sedang diproses aktifkan-kembali

  async function loadData() {
    if (!sekolahId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data: siswa, error } = await supabase
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('sekolah_id', sekolahId)
      .eq('status', 'nonaktif')
      .order('nama_lengkap')

    if (error) console.error('Gagal memuat siswa nonaktif:', error)
    setData(siswa || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  async function handleAktifkanKembali(siswaId) {
    if (!confirm('Aktifkan kembali siswa ini? Statusnya akan diubah menjadi "Aktif".')) return
    setAktivasiId(siswaId)
    const { error } = await supabase
      .from('siswa')
      .update({ status: 'aktif' })
      .eq('id', siswaId)
      .eq('sekolah_id', sekolahId)
    setAktivasiId(null)
    if (!error) {
      loadData()
    } else {
      alert('Gagal mengaktifkan kembali: ' + error.message)
    }
  }

  const filtered = data.filter((s) =>
    `${s.nama_lengkap} ${s.nis} ${s.nisn}`.toLowerCase().includes(search.toLowerCase())
  )

  if (!sekolahId) {
    return (
      <Layout title="Siswa Nonaktif" subtitle="Belum ada sekolah aktif">
        <div className="card p-8 text-center">
          <p className="font-display text-lg font-semibold text-ink-950">Belum ada sekolah aktif.</p>
          <p className="text-sm text-ink-700/60 mt-1">Pilih sekolah aktif terlebih dahulu.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Siswa Nonaktif" subtitle={`${data.length} siswa berstatus nonaktif`}>
      <div className="relative overflow-hidden rounded-xl p-6 mb-4 flex items-center gap-4 bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="relative w-10 h-10 rounded-full bg-white/10 ring-2 ring-white/20 text-white flex items-center justify-center shrink-0">
          <Search size={18} />
        </div>
        <div className="relative max-w-sm w-full">
          <input
            className="input-field w-full"
            placeholder="Cari nama, NIS, atau NISN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card relative overflow-hidden overflow-x-auto">
        <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400" />
        <table className="table-shell">
          <thead>
            <tr>
              <th>Nama Lengkap</th>
              <th>NIS</th>
              <th>NISN</th>
              <th>Kelas</th>
              <th>Jenis Kelamin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Memuat data...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-ink-700/50">Tidak ada siswa berstatus nonaktif.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.nama_lengkap}</td>
                <td className="font-mono text-xs">{s.nis}</td>
                <td className="font-mono text-xs">{s.nisn}</td>
                <td>{s.kelas?.nama_kelas || '—'}</td>
                <td>{s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                <td>
                  <button
                    onClick={() => handleAktifkanKembali(s.id)}
                    disabled={aktivasiId === s.id}
                    className="btn-secondary text-sage-600 hover:bg-sage-50 whitespace-nowrap"
                  >
                    {aktivasiId === s.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    Aktifkan Kembali
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
