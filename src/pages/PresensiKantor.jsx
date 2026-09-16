import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { daftarKelompokBinaan } from './PusatKelompokBinaan'

// Kelompok yang pakai form Desa + Nama Kelompok + Nama Peserta.
// Lapas & RSU tetap pakai form sederhana (Nama + Alamat).
const SLUG_PAKAI_DESA_KELOMPOK = ['majelis-taklim', 'masyarakat']

export default function KelolaKelompokBinaan() {
  const { slug } = useParams()
  const info = daftarKelompokBinaan.find((k) => k.slug === slug)
  const Icon = info?.icon || Users
  const pakaiDesaKelompok = SLUG_PAKAI_DESA_KELOMPOK.includes(slug)

  const [anggota, setAnggota] = useState([])
  const [memuat, setMemuat] = useState(true)

  // Form sederhana (Lapas/RSU)
  const [namaBaru, setNamaBaru] = useState('')
  const [alamatBaru, setAlamatBaru] = useState('')

  // Form Desa/Kelompok (Majelis Taklim/Masyarakat)
  const [desaBaru, setDesaBaru] = useState('')
  const [namaKelompokBaru, setNamaKelompokBaru] = useState('')
  const [namaPesertaBaru, setNamaPesertaBaru] = useState('')

  const [menyimpan, setMenyimpan] = useState(false)

  async function muatAnggota() {
    setMemuat(true)
    const { data } = await supabase
      .from('kelompok_binaan_anggota')
      .select('id, nama, alamat, desa, nama_kelompok, urutan')
      .eq('kelompok', slug)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true })
    setAnggota(data || [])
    setMemuat(false)
  }

  useEffect(() => {
    muatAnggota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function tambahAnggota(e) {
    e.preventDefault()
    const namaUntukDisimpan = pakaiDesaKelompok ? namaPesertaBaru.trim() : namaBaru.trim()
    if (!namaUntukDisimpan) return

    setMenyimpan(true)
    const urutanBerikutnya = anggota.length
    const payload = pakaiDesaKelompok
      ? {
          kelompok: slug,
          nama: namaUntukDisimpan,
          desa: desaBaru.trim() || null,
          nama_kelompok: namaKelompokBaru.trim() || null,
          urutan: urutanBerikutnya,
        }
      : {
          kelompok: slug,
          nama: namaUntukDisimpan,
          alamat: alamatBaru.trim() || null,
          urutan: urutanBerikutnya,
        }

    const { error } = await supabase.from('kelompok_binaan_anggota').insert(payload)
    if (!error) {
      setNamaBaru('')
      setAlamatBaru('')
      setDesaBaru('')
      setNamaKelompokBaru('')
      setNamaPesertaBaru('')
      await muatAnggota()
    }
    setMenyimpan(false)
  }

  async function hapusAnggota(id) {
    setAnggota((prev) => prev.filter((a) => a.id !== id))
    await supabase.from('kelompok_binaan_anggota').delete().eq('id', id)
  }

  function perbaruiField(id, field, value) {
    setAnggota((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  async function simpanField(id, field, value) {
    await supabase
      .from('kelompok_binaan_anggota')
      .update({ [field]: value || null })
      .eq('id', id)
  }

  return (
    <Layout
      title={info ? `Kelompok Binaan: ${info.judul}` : 'Kelompok Binaan'}
      subtitle="Data yang disimpan di sini permanen — tetap ada meskipun kamu mengelola kelompok lain, tinggal diedit kapan saja."
    >
      <div className="flex items-center justify-between mb-5">
        <Link
          to="/pusat-kelompok-binaan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Kelompok Binaan
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              {info ? info.judul : slug}
            </h1>
            <p className="text-xs text-slate-500">{anggota.length} peserta tersimpan</p>
          </div>
        </div>

        {pakaiDesaKelompok ? (
          <form
            onSubmit={tambahAnggota}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4"
          >
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nama Desa</label>
              <input
                value={desaBaru}
                onChange={(e) => setDesaBaru(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Contoh: Desa Sukamaju"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nama Kelompok</label>
              <input
                value={namaKelompokBaru}
                onChange={(e) => setNamaKelompokBaru(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Contoh: Majelis Al-Ikhlas"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nama Peserta</label>
              <input
                value={namaPesertaBaru}
                onChange={(e) => setNamaPesertaBaru(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Nama lengkap"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={menyimpan || !namaPesertaBaru.trim()}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"
              >
                {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Simpan
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={tambahAnggota}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4"
          >
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Nama</label>
              <input
                value={namaBaru}
                onChange={(e) => setNamaBaru(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Alamat (opsional)</label>
              <input
                value={alamatBaru}
                onChange={(e) => setAlamatBaru(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Alamat"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={menyimpan || !namaBaru.trim()}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"
              >
                {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Simpan
              </button>
            </div>
          </form>
        )}

        {memuat ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : anggota.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">
            Belum ada peserta. Tambahkan lewat form di atas — data akan tersimpan permanen.
          </p>
        ) : pakaiDesaKelompok ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-2 w-10">No</th>
                <th className="border border-slate-200 px-2 py-2 text-left">Desa</th>
                <th className="border border-slate-200 px-2 py-2 text-left">Kelompok</th>
                <th className="border border-slate-200 px-2 py-2 text-left">Nama Peserta</th>
                <th className="border border-slate-200 px-2 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {anggota.map((a, i) => (
                <tr key={a.id}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">
                    {i + 1}
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      value={a.desa || ''}
                      onChange={(e) => perbaruiField(a.id, 'desa', e.target.value)}
                      onBlur={(e) => simpanField(a.id, 'desa', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      value={a.nama_kelompok || ''}
                      onChange={(e) => perbaruiField(a.id, 'nama_kelompok', e.target.value)}
                      onBlur={(e) => simpanField(a.id, 'nama_kelompok', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      value={a.nama}
                      onChange={(e) => perbaruiField(a.id, 'nama', e.target.value)}
                      onBlur={(e) => simpanField(a.id, 'nama', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    <button
                      onClick={() => hapusAnggota(a.id)}
                      className="text-rose-500 hover:text-rose-700"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-2 py-2 w-10">No</th>
                <th className="border border-slate-200 px-2 py-2 text-left">Nama</th>
                <th className="border border-slate-200 px-2 py-2 text-left">Alamat</th>
                <th className="border border-slate-200 px-2 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {anggota.map((a, i) => (
                <tr key={a.id}>
                  <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">
                    {i + 1}
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      value={a.nama}
                      onChange={(e) => perbaruiField(a.id, 'nama', e.target.value)}
                      onBlur={(e) => simpanField(a.id, 'nama', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      value={a.alamat || ''}
                      onChange={(e) => perbaruiField(a.id, 'alamat', e.target.value)}
                      onBlur={(e) => simpanField(a.id, 'alamat', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center">
                    <button
                      onClick={() => hapusAnggota(a.id)}
                      className="text-rose-500 hover:text-rose-700"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
