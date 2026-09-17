import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Clock3, X, Eye } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

const TAB = [
  { id: 'menunggu', label: 'Menunggu' },
  { id: 'diverifikasi', label: 'Diverifikasi' },
  { id: 'ditolak', label: 'Ditolak' },
]

export default function VerifikasiNikah() {
  const { isSuperAdmin, sekolahId, session } = useAuth()
  const [tab, setTab] = useState('menunggu')
  const [daftar, setDaftar] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [prosesId, setProsesId] = useState(null)

  async function muatData() {
    setLoading(true)
    let query = supabase
      .from('pendaftaran_nikah')
      .select('id, status, data_n1, data_n2, catatan_admin, dibuat_pada, diverifikasi_pada, profil:profil_id(nama_lengkap_pendaftar, email_pendaftar)')
      .eq('status', tab)
      .order('dibuat_pada', { ascending: false })

    if (!isSuperAdmin) {
      query = query.eq('sekolah_id', sekolahId)
    }

    const { data } = await query
    setDaftar(data || [])
    setLoading(false)
  }

  useEffect(() => {
    muatData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function setujui(id) {
    if (!window.confirm('Setujui pendaftaran nikah ini?')) return
    setProsesId(id)
    const { error } = await supabase
      .from('pendaftaran_nikah')
      .update({
        status: 'diverifikasi',
        diverifikasi_oleh: session?.user?.id,
        diverifikasi_pada: new Date().toISOString(),
      })
      .eq('id', id)
    setProsesId(null)
    if (error) {
      window.alert('Gagal menyetujui: ' + error.message)
      return
    }
    setDetail(null)
    muatData()
  }

  async function tolak(id) {
    const catatan = window.prompt('Alasan penolakan (wajib diisi supaya jamaah tahu apa yang perlu diperbaiki):')
    if (catatan === null) return
    if (!catatan.trim()) {
      window.alert('Alasan penolakan wajib diisi.')
      return
    }
    setProsesId(id)
    const { error } = await supabase
      .from('pendaftaran_nikah')
      .update({
        status: 'ditolak',
        catatan_admin: catatan,
        diverifikasi_oleh: session?.user?.id,
        diverifikasi_pada: new Date().toISOString(),
      })
      .eq('id', id)
    setProsesId(null)
    if (error) {
      window.alert('Gagal menolak: ' + error.message)
      return
    }
    setDetail(null)
    muatData()
  }

  // Ambil detail lengkap (termasuk data_n4, data_n5 yang tidak diambil
  // di listing supaya query ringan) saat modal detail dibuka.
  async function bukaDetail(id) {
    const { data, error } = await supabase
      .from('pendaftaran_nikah')
      .select('*, profil:profil_id(nama_lengkap_pendaftar, email_pendaftar)')
      .eq('id', id)
      .single()
    if (error) {
      window.alert('Gagal memuat detail: ' + error.message)
      return
    }
    setDetail(data)
  }

  return (
    <Layout title="Verifikasi Nikah" subtitle="Kelola pendaftaran nikah yang diajukan jamaah.">
      <div className="flex gap-2 mb-4">
        {TAB.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-400 text-center">Memuat data...</p>
        ) : daftar.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">
            {tab === 'menunggu' ? 'Tidak ada pendaftaran yang menunggu verifikasi.' : 'Belum ada data.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Calon Suami</th>
                <th className="text-left px-4 py-3 font-medium">Calon Istri</th>
                <th className="text-left px-4 py-3 font-medium">Rencana Akad</th>
                <th className="text-left px-4 py-3 font-medium">Diajukan Oleh</th>
                <th className="text-right px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daftar.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-700">{p.data_n1?.calon_suami?.nama_lengkap || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{p.data_n1?.calon_istri?.nama_lengkap || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.data_n2?.rencana_tanggal_akad || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.profil?.nama_lengkap_pendaftar || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => bukaDetail(p.id)}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Eye size={14} /> Detail
                      </button>
                      {tab === 'menunggu' && (
                        <>
                          <button
                            onClick={() => setujui(p.id)}
                            disabled={prosesId === p.id}
                            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-60"
                          >
                            <CheckCircle2 size={14} /> Setujui
                          </button>
                          <button
                            onClick={() => tolak(p.id)}
                            disabled={prosesId === p.id}
                            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
                          >
                            <XCircle size={14} /> Tolak
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && <ModalDetail detail={detail} prosesId={prosesId} onClose={() => setDetail(null)} onSetujui={setujui} onTolak={tolak} />}
    </Layout>
  )
}

function Baris({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 text-right">{value || '—'}</span>
    </div>
  )
}

function ModalDetail({ detail, prosesId, onClose, onSetujui, onTolak }) {
  const n1 = detail.data_n1 || {}
  const n2 = detail.data_n2 || {}
  const n4 = detail.data_n4 || {}
  const n5 = detail.data_n5 || {}

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Detail Pendaftaran Nikah</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Model N1 — Calon Suami</p>
            <Baris label="Nama" value={n1.calon_suami?.nama_lengkap} />
            <Baris label="NIK" value={n1.calon_suami?.nik} />
            <Baris label="TTL" value={`${n1.calon_suami?.tempat_lahir || ''}, ${n1.calon_suami?.tanggal_lahir || ''}`} />
            <Baris label="Agama" value={n1.calon_suami?.agama} />
            <Baris label="Pekerjaan" value={n1.calon_suami?.pekerjaan} />
            <Baris label="Alamat" value={n1.calon_suami?.alamat} />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Model N1 — Calon Istri</p>
            <Baris label="Nama" value={n1.calon_istri?.nama_lengkap} />
            <Baris label="NIK" value={n1.calon_istri?.nik} />
            <Baris label="TTL" value={`${n1.calon_istri?.tempat_lahir || ''}, ${n1.calon_istri?.tanggal_lahir || ''}`} />
            <Baris label="Agama" value={n1.calon_istri?.agama} />
            <Baris label="Pekerjaan" value={n1.calon_istri?.pekerjaan} />
            <Baris label="Alamat" value={n1.calon_istri?.alamat} />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">Model N2 — Rencana Akad</p>
          <Baris label="Tanggal" value={n2.rencana_tanggal_akad} />
          <Baris label="Waktu" value={n2.rencana_waktu_akad} />
          <Baris label="Tempat" value={n2.tempat_akad} />
          <Baris label="KUA Tujuan" value={n2.kua_tujuan} />
          <Baris label="Catatan" value={n2.catatan} />
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-600 mb-1">Model N4 — Persetujuan Mempelai</p>
          <Baris label="Calon suami setuju" value={n4.persetujuan_calon_suami ? 'Ya' : 'Belum'} />
          <Baris label="Calon istri setuju" value={n4.persetujuan_calon_istri ? 'Ya' : 'Belum'} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Model N5 — Orang Tua Suami</p>
            <Baris label="Ayah" value={n5.suami?.ayah?.nama_lengkap} />
            <Baris label="Ibu" value={n5.suami?.ibu?.nama_lengkap} />
            <Baris label="Persetujuan" value={n5.suami?.persetujuan ? 'Ya' : 'Belum'} />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-600 mb-1">Model N5 — Orang Tua Istri</p>
            <Baris label="Ayah" value={n5.istri?.ayah?.nama_lengkap} />
            <Baris label="Ibu" value={n5.istri?.ibu?.nama_lengkap} />
            <Baris label="Persetujuan" value={n5.istri?.persetujuan ? 'Ya' : 'Belum'} />
          </div>
        </div>

        {detail.status === 'menunggu' && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSetujui(detail.id)}
              disabled={prosesId === detail.id}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> Setujui
            </button>
            <button
              onClick={() => onTolak(detail.id)}
              disabled={prosesId === detail.id}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
            >
              <XCircle size={16} /> Tolak
            </button>
          </div>
        )}

        {detail.status !== 'menunggu' && detail.catatan_admin && (
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2">
            {detail.status === 'ditolak' ? (
              <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
            ) : (
              <Clock3 size={14} className="text-slate-400 mt-0.5 shrink-0" />
            )}
            <p className="text-xs text-slate-500">Catatan admin: "{detail.catatan_admin}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
