import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Loader2, Users, Save, FolderPlus, Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import { daftarKelompokBinaan } from './PusatKelompokBinaan'

// Kelompok yang pakai struktur Desa + Nama Kelompok + Peserta.
// Lapas & RSU tetap pakai form sederhana (Nama + Alamat).
const SLUG_PAKAI_DESA_KELOMPOK = ['majelis-taklim', 'masyarakat']

const kunciGrup = (desa, namaKelompok) => `${(desa || '').trim()}||${(namaKelompok || '').trim()}`

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
  const [menyimpan, setMenyimpan] = useState(false)

  // Form buat kelompok baru (Majelis Taklim/Masyarakat)
  const [desaBaru, setDesaBaru] = useState('')
  const [kelompokBaru, setKelompokBaru] = useState('')

  // Kelompok yang baru dibuat tapi belum punya peserta (belum masuk database)
  const [grupDraf, setGrupDraf] = useState([])
  // Nilai input "tambah peserta" per kelompok
  const [pesertaBaru, setPesertaBaru] = useState({})
  // Perubahan Desa/Nama Kelompok yang belum disimpan
  const [editGrup, setEditGrup] = useState({})
  // Status per kelompok: ada perubahan / sedang menyimpan / baru tersimpan
  const [belumTersimpan, setBelumTersimpan] = useState({})
  const [grupMenyimpan, setGrupMenyimpan] = useState(null)
  const [grupTersimpan, setGrupTersimpan] = useState(null)

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
    setGrupDraf([])
    setEditGrup({})
    setBelumTersimpan({})
    muatAnggota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Gabungkan data database + kelompok draf jadi satu daftar kelompok
  const daftarGrup = useMemo(() => {
    const peta = new Map()
    grupDraf.forEach((g) => peta.set(g.key, { ...g, anggota: [], draf: true }))
    anggota.forEach((a) => {
      const key = kunciGrup(a.desa, a.nama_kelompok)
      if (!peta.has(key)) {
        peta.set(key, {
          key,
          desa: a.desa || '',
          nama_kelompok: a.nama_kelompok || '',
          anggota: [],
          draf: false,
        })
      }
      const grup = peta.get(key)
      grup.draf = false
      grup.anggota.push(a)
    })
    return Array.from(peta.values())
  }, [anggota, grupDraf])

  const nilaiGrup = (grup, field) =>
    editGrup[grup.key]?.[field] !== undefined ? editGrup[grup.key][field] : grup[field]

  function buatKelompok(e) {
    e.preventDefault()
    if (!desaBaru.trim() && !kelompokBaru.trim()) return
    const key = kunciGrup(desaBaru, kelompokBaru)
    if (daftarGrup.some((g) => g.key === key)) return
    setGrupDraf((prev) => [
      ...prev,
      { key, desa: desaBaru.trim(), nama_kelompok: kelompokBaru.trim() },
    ])
    setDesaBaru('')
    setKelompokBaru('')
  }

  async function tambahPeserta(grup) {
    const nama = (pesertaBaru[grup.key] || '').trim()
    if (!nama) return
    setGrupMenyimpan(grup.key)
    const { error } = await supabase.from('kelompok_binaan_anggota').insert({
      kelompok: slug,
      nama,
      desa: nilaiGrup(grup, 'desa') || null,
      nama_kelompok: nilaiGrup(grup, 'nama_kelompok') || null,
      urutan: anggota.length,
    })
    if (!error) {
      setPesertaBaru((prev) => ({ ...prev, [grup.key]: '' }))
      setGrupDraf((prev) => prev.filter((g) => g.key !== grup.key))
      await muatAnggota()
    }
    setGrupMenyimpan(null)
  }

  // Simpan seluruh isi satu kelompok: Desa, Nama Kelompok, dan semua nama peserta
  async function simpanKelompok(grup) {
    const desa = (nilaiGrup(grup, 'desa') || '').trim()
    const namaKelompok = (nilaiGrup(grup, 'nama_kelompok') || '').trim()

    if (grup.anggota.length === 0) {
      // Kelompok masih kosong: cukup perbarui draf lokal
      const keyBaru = kunciGrup(desa, namaKelompok)
      setGrupDraf((prev) =>
        prev.map((g) => (g.key === grup.key ? { key: keyBaru, desa, nama_kelompok: namaKelompok } : g)),
      )
      setEditGrup((prev) => {
        const salinan = { ...prev }
        delete salinan[grup.key]
        return salinan
      })
      return
    }

    setGrupMenyimpan(grup.key)
    await Promise.all(
      grup.anggota.map((a) =>
        supabase
          .from('kelompok_binaan_anggota')
          .update({
            desa: desa || null,
            nama_kelompok: namaKelompok || null,
            nama: (a.nama || '').trim(),
          })
          .eq('id', a.id),
      ),
    )
    setEditGrup((prev) => {
      const salinan = { ...prev }
      delete salinan[grup.key]
      return salinan
    })
    setBelumTersimpan((prev) => ({ ...prev, [grup.key]: false }))
    await muatAnggota()
    setGrupMenyimpan(null)
    setGrupTersimpan(grup.key)
    setTimeout(() => setGrupTersimpan(null), 2000)
  }

  async function hapusKelompok(grup) {
    if (grup.anggota.length > 0) {
      const konfirmasi = window.confirm(
        `Hapus kelompok "${grup.nama_kelompok || 'tanpa nama'}" beserta ${grup.anggota.length} peserta di dalamnya?`,
      )
      if (!konfirmasi) return
      await Promise.all(
        grup.anggota.map((a) => supabase.from('kelompok_binaan_anggota').delete().eq('id', a.id)),
      )
      await muatAnggota()
    }
    setGrupDraf((prev) => prev.filter((g) => g.key !== grup.key))
  }

  async function tambahAnggotaSederhana(e) {
    e.preventDefault()
    if (!namaBaru.trim()) return
    setMenyimpan(true)
    const { error } = await supabase.from('kelompok_binaan_anggota').insert({
      kelompok: slug,
      nama: namaBaru.trim(),
      alamat: alamatBaru.trim() || null,
      urutan: anggota.length,
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

  function perbaruiField(id, field, value) {
    setAnggota((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  async function simpanField(id, field, value) {
    await supabase
      .from('kelompok_binaan_anggota')
      .update({ [field]: value || null })
      .eq('id', id)
  }

  const kelasInput =
    'w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300'

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

      <div className="max-w-4xl mx-auto space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Icon size={20} />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-slate-900">
                {info ? info.judul : slug}
              </h1>
              <p className="text-xs text-slate-500">
                {pakaiDesaKelompok
                  ? `${daftarGrup.length} kelompok · ${anggota.length} peserta tersimpan`
                  : `${anggota.length} peserta tersimpan`}
              </p>
            </div>
          </div>

          {pakaiDesaKelompok ? (
            <form
              onSubmit={buatKelompok}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nama Desa</label>
                <input
                  value={desaBaru}
                  onChange={(e) => setDesaBaru(e.target.value)}
                  className={kelasInput}
                  placeholder="Contoh: Desa Sukamaju"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nama Kelompok</label>
                <input
                  value={kelompokBaru}
                  onChange={(e) => setKelompokBaru(e.target.value)}
                  className={kelasInput}
                  placeholder="Contoh: Majelis Al-Ikhlas"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!desaBaru.trim() && !kelompokBaru.trim()}
                  className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                >
                  <FolderPlus size={16} /> Buat kelompok
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={tambahAnggotaSederhana}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4"
            >
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nama</label>
                <input
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  className={kelasInput}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Alamat (opsional)
                </label>
                <input
                  value={alamatBaru}
                  onChange={(e) => setAlamatBaru(e.target.value)}
                  className={kelasInput}
                  placeholder="Alamat"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={menyimpan || !namaBaru.trim()}
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                >
                  {menyimpan ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Simpan
                </button>
              </div>
            </form>
          )}
        </div>

        {memuat ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : pakaiDesaKelompok ? (
          daftarGrup.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-slate-100">
              Belum ada kelompok. Isi nama desa dan nama kelompok di atas untuk memulai.
            </p>
          ) : (
            daftarGrup.map((grup) => (
              <div key={grup.key} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 sm:items-end">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Nama Desa</label>
                    <input
                      value={nilaiGrup(grup, 'desa')}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditGrup((prev) => ({
                          ...prev,
                          [grup.key]: { ...prev[grup.key], desa: v },
                        }))
                        setBelumTersimpan((prev) => ({ ...prev, [grup.key]: true }))
                      }}
                      className={kelasInput}
                      placeholder="Nama desa"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Nama Kelompok
                    </label>
                    <input
                      value={nilaiGrup(grup, 'nama_kelompok')}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditGrup((prev) => ({
                          ...prev,
                          [grup.key]: { ...prev[grup.key], nama_kelompok: v },
                        }))
                        setBelumTersimpan((prev) => ({ ...prev, [grup.key]: true }))
                      }}
                      className={kelasInput}
                      placeholder="Nama kelompok"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => simpanKelompok(grup)}
                      disabled={grupMenyimpan === grup.key}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {grupMenyimpan === grup.key ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : grupTersimpan === grup.key ? (
                        <Check size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      {grupTersimpan === grup.key ? 'Tersimpan' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => hapusKelompok(grup)}
                      className="text-rose-500 hover:text-rose-700 p-2 shrink-0"
                      title="Hapus kelompok"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {belumTersimpan[grup.key] && grupMenyimpan !== grup.key && (
                  <p className="text-xs text-amber-600 mt-2">
                    Ada perubahan yang belum disimpan. Tekan Simpan.
                  </p>
                )}

                <div className="mt-5">
                  {grup.anggota.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                      Belum ada peserta di kelompok ini. Tambahkan lewat kolom di bawah.
                    </p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                      <table className="w-full min-w-[320px] border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-200 px-2 py-2 w-10">No</th>
                            <th className="border border-slate-200 px-2 py-2 text-left">
                              Nama Peserta
                            </th>
                            <th className="border border-slate-200 px-2 py-2 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {grup.anggota.map((a, i) => (
                            <tr key={a.id}>
                              <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">
                                {i + 1}
                              </td>
                              <td className="border border-slate-200 px-1 py-1">
                                <input
                                  value={a.nama || ''}
                                  onChange={(e) => {
                                    perbaruiField(a.id, 'nama', e.target.value)
                                    setBelumTersimpan((prev) => ({ ...prev, [grup.key]: true }))
                                  }}
                                  className="w-full text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                              </td>
                              <td className="border border-slate-200 px-2 py-1.5 text-center">
                                <button
                                  onClick={() => hapusAnggota(a.id)}
                                  className="text-rose-500 hover:text-rose-700"
                                  title="Hapus peserta"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <input
                      value={pesertaBaru[grup.key] || ''}
                      onChange={(e) =>
                        setPesertaBaru((prev) => ({ ...prev, [grup.key]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          tambahPeserta(grup)
                        }
                      }}
                      className={kelasInput}
                      placeholder="Nama peserta baru"
                    />
                    <button
                      type="button"
                      onClick={() => tambahPeserta(grup)}
                      disabled={!(pesertaBaru[grup.key] || '').trim() || grupMenyimpan === grup.key}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto shrink-0"
                    >
                      <Plus size={16} /> Tambah
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : anggota.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10 bg-white rounded-2xl border border-slate-100">
            Belum ada peserta. Tambahkan lewat form di atas — data akan tersimpan permanen.
          </p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[420px] border-collapse text-sm">
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
                          value={a.nama || ''}
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
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
