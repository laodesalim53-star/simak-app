import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  ClipboardList,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Save,
  Loader2,
} from 'lucide-react'
import Layout from '../components/Layout'

const LOGO_BUCKET = 'profil-kantor'

// === DAFTAR MATERI UNTUK REKOMENDASI OTOMATIS ===
// Tambahkan entri baru di sini setiap kali ada materi/laporan baru yang
// ingin ikut direkomendasikan berdasarkan kata kunci pada Butir/Tahapan
// Kegiatan.
const DAFTAR_MATERI_REKOMENDASI = [
  {
    id: 'keluarga-sakinah',
    judul: 'Keluarga Sakinah',
    path: '/materi-keluarga-sakinah',
    kataKunci: ['keluarga', 'sakinah', 'rumah tangga', 'mawaddah', 'rahmah', 'pernikahan', 'perkawinan', 'suami istri'],
  },
  {
    id: 'pengelolaan-zakat',
    judul: 'Pengelolaan Zakat',
    path: '/materi-pengelolaan-zakat',
    kataKunci: ['zakat', 'mustahik', 'nisab', 'amil', 'baznas', 'infak', 'sedekah', 'muzaki'],
  },
  {
    id: 'wakaf',
    judul: 'Wakaf',
    path: '/materi-wakaf',
    kataKunci: ['wakaf', 'nazhir', 'wakif', 'harta wakaf', 'ikrar wakaf', 'aiw'],
  },
  {
    id: 'akhlak',
    judul: 'Akhlak',
    path: '/materi-akhlak',
    kataKunci: ['akhlak', 'moral', 'budi pekerti', 'sabar', 'taubat', 'jujur', 'amanah', 'lisan', 'muhasabah'],
  },
  {
    id: 'moderasi-beragama',
    judul: 'Moderasi Beragama',
    path: '/materi-moderasi-beragama',
    kataKunci: ['moderasi', 'toleransi', 'radikal', 'ekstrem', 'ukhuwah', 'kerukunan', 'kebangsaan', 'wasathiyah'],
  },
  {
    id: 'laporan-masyarakat-bermoral-harmonis',
    judul: 'Laporan: Masyarakat Bermoral & Harmonis',
    path: '/laporan-masyarakat-bermoral-harmonis',
    kataKunci: ['masyarakat', 'harmonis', 'konflik sosial', 'gotong royong', 'silaturahmi', 'pemetaan', 'binaan', 'kelompok sasaran', 'sosial'],
  },
]

function cariRekomendasi(teks) {
  const teksLower = (teks || '').toLowerCase()
  if (!teksLower.trim()) return []
  return DAFTAR_MATERI_REKOMENDASI
    .map((materi) => ({
      ...materi,
      skor: materi.kataKunci.filter((kata) => teksLower.includes(kata)).length,
    }))
    .filter((materi) => materi.skor > 0)
    .sort((a, b) => b.skor - a.skor)
}

function buatItemKosong() {
  return {
    id: crypto.randomUUID(),
    butirKegiatan: '',
    tahapanKegiatan: '',
    sasaran: '',
    tempatKegiatan: '',
    waktuPelaksanaan: '',
    volume: '',
    satuan: '',
    output: '',
  }
}

export default function RencanaKerjaTahunan() {
  const { user, profil } = useAuth()
  const userId = user?.id || profil?.id

  const [profilKantor, setProfilKantor] = useState(null)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [namaLengkap, setNamaLengkap] = useState('')
  const [nip, setNip] = useState('')
  const [pangkatGolongan, setPangkatGolongan] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [unitKerja, setUnitKerja] = useState('')
  const [items, setItems] = useState([buatItemKosong()])
  const [rekomendasiPerItem, setRekomendasiPerItem] = useState({})
  const [rktId, setRktId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pesanStatus, setPesanStatus] = useState('')

  // Kop surat instansi (sama seperti halaman materi lain)
  useEffect(() => {
    supabase
      .from('profil_kantor')
      .select('nama_kantor, alamat, kabupaten, kecamatan, telepon, email, logo_path')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setProfilKantor(data))
  }, [])

  const logoUrl = profilKantor?.logo_path
    ? supabase.storage.from(LOGO_BUCKET).getPublicUrl(profilKantor.logo_path).data.publicUrl
    : null

  // Muat data RKT untuk tahun yang dipilih (kalau sudah pernah disimpan)
  const muatData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setPesanStatus('')
    const { data, error } = await supabase
      .from('rencana_kerja_tahunan')
      .select('*')
      .eq('user_id', userId)
      .eq('tahun', tahun)
      .maybeSingle()

    if (!error && data) {
      setRktId(data.id)
      setNamaLengkap(data.nama_lengkap || profil?.nama_lengkap || '')
      setNip(data.nip || profil?.nip || '')
      setPangkatGolongan(data.pangkat_golongan || '')
      setJabatan(data.jabatan || '')
      setUnitKerja(data.unit_kerja || '')
      setItems(
        Array.isArray(data.items) && data.items.length > 0
          ? data.items.map((it) => ({ id: crypto.randomUUID(), ...it }))
          : [buatItemKosong()]
      )
    } else {
      // Belum ada data tersimpan untuk tahun ini — mulai dari form kosong,
      // tapi identitas penyuluh tetap diisi otomatis dari profil akun.
      setRktId(null)
      setNamaLengkap(profil?.nama_lengkap || '')
      setNip(profil?.nip || '')
      setPangkatGolongan('')
      setJabatan('')
      setUnitKerja('')
      setItems([buatItemKosong()])
    }
    setRekomendasiPerItem({})
    setLoading(false)
  }, [userId, tahun, profil])

  useEffect(() => {
    muatData()
  }, [muatData])

  function ubahItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  function tambahBaris() {
    setItems((prev) => [...prev, buatItemKosong()])
  }

  function hapusBaris(id) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
    setRekomendasiPerItem((prev) => {
      const salinan = { ...prev }
      delete salinan[id]
      return salinan
    })
  }

  function tampilkanRekomendasi(item) {
    const hasil = cariRekomendasi(`${item.butirKegiatan} ${item.tahapanKegiatan} ${item.output}`)
    setRekomendasiPerItem((prev) => ({ ...prev, [item.id]: hasil }))
  }

  async function simpanData() {
    if (!userId) {
      setPesanStatus('Tidak dapat menyimpan: akun tidak terdeteksi.')
      return
    }
    setSaving(true)
    setPesanStatus('')

    const payload = {
      user_id: userId,
      tahun: Number(tahun),
      nama_lengkap: namaLengkap,
      nip,
      pangkat_golongan: pangkatGolongan,
      jabatan,
      unit_kerja: unitKerja,
      items: items.map(({ id, ...rest }) => rest),
    }

    const { data, error } = await supabase
      .from('rencana_kerja_tahunan')
      .upsert(payload, { onConflict: 'user_id,tahun' })
      .select()
      .maybeSingle()

    setSaving(false)
    if (error) {
      setPesanStatus(`Gagal menyimpan: ${error.message}`)
    } else {
      setRktId(data?.id || rktId)
      setPesanStatus('Tersimpan.')
    }
  }

  return (
    <Layout
      title="Rencana Kerja Tahunan Penyuluh"
      subtitle="Susun RKT, simpan per tahun, dan dapatkan rekomendasi materi terkait secara otomatis."
    >
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-5">
        <Link
          to="/pusat-materi-majelis"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Pusat Materi
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={simpanData}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      {pesanStatus && (
        <div className="no-print mb-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {pesanStatus}
        </div>
      )}

      {/* === FORM IDENTITAS & TAHUN — TIDAK IKUT TERCETAK === */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5">
        <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">Identitas Penyuluh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tahun RKT</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">NIP</label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pangkat / Golongan / TMT</label>
            <input
              type="text"
              value={pangkatGolongan}
              onChange={(e) => setPangkatGolongan(e.target.value)}
              placeholder="Ahli Pertama - Penyuluh Agama Islam / IX"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan</label>
            <input
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit Kerja</label>
            <input
              type="text"
              value={unitKerja}
              onChange={(e) => setUnitKerja(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {/* === DAFTAR KEGIATAN — TIDAK IKUT TERCETAK, INI ADALAH FORM INPUT === */}
      <div className="no-print space-y-4 mb-5">
        {items.map((item, idx) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Kegiatan #{idx + 1}</span>
              <button
                onClick={() => hapusBaris(item.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
              >
                <Trash2 size={13} /> Hapus
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Butir Kegiatan</label>
                <textarea
                  rows={2}
                  value={item.butirKegiatan}
                  onChange={(e) => ubahItem(item.id, 'butirKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Tahapan Kegiatan</label>
                <textarea
                  rows={2}
                  value={item.tahapanKegiatan}
                  onChange={(e) => ubahItem(item.id, 'tahapanKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sasaran</label>
                <input
                  type="text"
                  value={item.sasaran}
                  onChange={(e) => ubahItem(item.id, 'sasaran', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tempat Kegiatan</label>
                <input
                  type="text"
                  value={item.tempatKegiatan}
                  onChange={(e) => ubahItem(item.id, 'tempatKegiatan', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Waktu Pelaksanaan</label>
                <input
                  type="text"
                  value={item.waktuPelaksanaan}
                  onChange={(e) => ubahItem(item.id, 'waktuPelaksanaan', e.target.value)}
                  placeholder="Januari - Maret"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Volume</label>
                <input
                  type="text"
                  value={item.volume}
                  onChange={(e) => ubahItem(item.id, 'volume', e.target.value)}
                  placeholder="1"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Satuan</label>
                <input
                  type="text"
                  value={item.satuan}
                  onChange={(e) => ubahItem(item.id, 'satuan', e.target.value)}
                  placeholder="Paket / Dokumen"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Output</label>
                <input
                  type="text"
                  value={item.output}
                  onChange={(e) => ubahItem(item.id, 'output', e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => tampilkanRekomendasi(item)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles size={13} /> Rekomendasi Materi Terkait
              </button>

              {rekomendasiPerItem[item.id] && (
                <div className="mt-2 space-y-1 pl-1">
                  {rekomendasiPerItem[item.id].length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Belum ada materi yang cocok dengan kata kunci Butir/Tahapan Kegiatan di atas.
                    </p>
                  ) : (
                    rekomendasiPerItem[item.id].map((materi) => (
                      <Link
                        key={materi.id}
                        to={materi.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-violet-700 hover:underline"
                      >
                        <ArrowRight size={12} /> {materi.judul}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          onClick={tambahBaris}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg px-4 py-2 w-full justify-center transition-colors"
        >
          <Plus size={16} /> Tambah Kegiatan
        </button>
      </div>

      {/* === LEMBAR CETAK === */}
      <div
        className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 p-5 sm:p-8 mx-auto"
        style={{ width: '277mm' }}
      >
        <div className="kop-surat flex items-center gap-4 border-b-2 border-slate-800 pb-3 mb-6">
          {logoUrl && <img src={logoUrl} alt="Logo Instansi" className="w-16 h-16 object-contain shrink-0" />}
          <div className="text-center flex-1">
            <p className="font-display text-base font-bold uppercase text-slate-900 leading-tight">
              {profilKantor?.nama_kantor || 'Nama Kantor Belum Diatur'}
            </p>
            <p className="text-xs text-slate-600 leading-tight">
              {[profilKantor?.alamat, profilKantor?.kecamatan, profilKantor?.kabupaten].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">
              Rencana Kerja Tahunan Penyuluh Agama Islam
            </h1>
            <p className="text-xs text-slate-500">Tahun {tahun}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-700 mb-5 border border-slate-200 rounded-xl p-3">
          <p><span className="font-medium">Nama Lengkap</span> : {namaLengkap || '-'}</p>
          <p><span className="font-medium">NIP.</span> : {nip || '-'}</p>
          <p><span className="font-medium">Pangkat/Golongan/TMT</span> : {pangkatGolongan || '-'}</p>
          <p><span className="font-medium">Jabatan</span> : {jabatan || '-'}</p>
          <p className="col-span-2"><span className="font-medium">Unit Kerja</span> : {unitKerja || '-'}</p>
        </div>

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1.5 text-left w-8">No</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Butir Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Tahapan Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Sasaran</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Tempat Kegiatan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Waktu Pelaksanaan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Volume</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Satuan</th>
              <th className="border border-slate-300 px-2 py-1.5 text-left">Output</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{idx + 1}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top whitespace-pre-wrap">{item.butirKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top whitespace-pre-wrap">{item.tahapanKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.sasaran}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.tempatKegiatan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.waktuPelaksanaan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.volume}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.satuan}</td>
                <td className="border border-slate-300 px-2 py-1.5 align-top">{item.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .lembar-cetak.print-only {
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
      `}</style>
    </Layout>
  )
}
