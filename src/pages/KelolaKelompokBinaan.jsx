import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { daftarKelompokBinaan } from './PusatKelompokBinaan'

export default function KelolaKelompokBinaan() {
  const { slug } = useParams()
  const info = daftarKelompokBinaan.find((k) => k.slug === slug)
  const Icon = info?.icon || Users

  const [anggota, setAnggota] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [namaBaru, setNamaBaru] = useState('')
  const [alamatBaru, setAlamatBaru] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  async function muatAnggota() {
    setMemuat(true)
    const { data } = await supabase
      .from('kelompok_binaan_anggota')
      .select('id, nama, alamat, urutan')
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
    if (!namaBaru.trim()) return
    setMenyimpan(true)
    const urutanBerikutnya = anggota.length
    const { error } = await supabase.from('kelompok_binaan_anggota').insert({
      kelompok: slug,
      nama: namaBaru.trim(),
      alamat: alamatBaru.trim() || null,
      urutan: urutanBerikutnya,
    })
    if (!error) {
      setNamaBaru('')
      setAlamatBaru('')
      await muatAnggota()
    }
    setMenyimpan(false)
  }

  async function hapusAnggota(id) {
    setAnggota((prev) => prev.filter((a) => a.id !== id))
    await supabase.from('kelompok_binaan_anggota').delete().eq('id', id)
  }

  async function perbaruiField(id, field, value) {
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
      subtitle="Nama yang ditambahkan di sini akan otomatis tersedia saat memilih kelompok ini di daftar hadir cetak."
    >
      <div className="flex items-center justify-between mb-5">
        <Link
          to="/pusat-kelompok-binaan"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Kelompok Binaan
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              {info ? info.judul : slug}
            </h1>
            <p className="text-xs text-slate-500">{anggota.length} anggota tersimpan</p>
          </div>
        </div>

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
              Tambah
            </button>
          </div>
        </form>

        {memuat ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : anggota.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">
            Belum ada anggota. Tambahkan nama pertama lewat form di atas.
          </p>
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
