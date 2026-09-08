import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import { Loader2, Save, CheckCircle2, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

// Field tambahan yang belum ada di form Siswa/PPDB biasa, khusus dipakai
// untuk mengisi Formulir 8355 (Daftar Calon Peserta Ujian) Kelas 6.
// Ditaruh terpisah dari form Data Siswa utama supaya tidak mengganggu
// form yang sudah ada, dan gampang dicari admin saat musim ujian.
const KOLOM_TAMBAHAN = [
  { key: 'no_absen', label: 'No Absen', type: 'number', width: 'w-20' },
  { key: 'kode_peserta_ujian', label: 'Kode Peserta', width: 'w-28' },
  { key: 'no_peserta_ujian', label: 'No Peserta', width: 'w-28' },
  { key: 'kode_pos', label: 'Kode Pos', width: 'w-24' },
  { key: 'hobi_anak', label: 'Hobi Anak', width: 'w-32' },
  { key: 'cita_cita_anak', label: 'Cita-cita Anak', width: 'w-32' },
  { key: 'gaji_orang_tua', label: 'Gaji Orang Tua', width: 'w-32' },
  { key: 'jarak_rumah_sekolah', label: 'Jarak Rumah-Sekolah', width: 'w-32' },
  { key: 'transportasi_ke_sekolah', label: 'Transportasi', width: 'w-28' },
  { key: 'jumlah_saudara', label: 'Jml Saudara', type: 'number', width: 'w-24' },
  { key: 'no_skhun', label: 'No SKHUN', width: 'w-28' },
]

export default function DataUjian8355() {
  const { profil, isSuperAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [loading, setLoading] = useState(true)
  const [siswaList, setSiswaList] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [tersimpanId, setTersimpanId] = useState(null)

  useEffect(() => {
    if (isSuperAdmin) muatData()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, isSuperAdmin])

  async function muatData() {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)
    // Kelas 6 diambil dari nama_kelas yang diawali "6" (mis. "6A", "6B",
    // "Kelas 6"), supaya otomatis mencakup semua rombel paralel kelas 6.
    const { data } = await supabase
      .from('siswa')
      .select('*, kelas!inner(nama_kelas)')
      .eq('sekolah_id', sekolahId)
      .ilike('kelas.nama_kelas', '6%')
      .order('nama_lengkap')
    setSiswaList(data || [])
    setLoading(false)
  }

  function ubahField(siswaId, field, value) {
    setSiswaList((list) =>
      list.map((s) => (s.id === siswaId ? { ...s, [field]: value } : s))
    )
  }

  async function simpanBaris(siswa) {
    setSavingId(siswa.id)
    setTersimpanId(null)
    const payload = {}
    for (const kolom of KOLOM_TAMBAHAN) {
      let v = siswa[kolom.key]
      if (kolom.type === 'number') v = v === '' || v === null ? null : Number(v)
      payload[kolom.key] = v
    }
    const { error } = await supabase.from('siswa').update(payload).eq('id', siswa.id)
    setSavingId(null)
    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setTersimpanId(siswa.id)
      setTimeout(() => setTersimpanId(null), 2000)
    }
  }

  if (!isSuperAdmin) {
    return (
      <Layout title="Data Ujian 8355" subtitle="Lengkapi data tambahan Kelas 6 untuk Formulir 8355">
        <div className="card p-6 text-center text-sm text-ink-700/60">
          Halaman ini khusus untuk Superadmin.
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout title="Data Ujian 8355" subtitle="Lengkapi data tambahan Kelas 6 untuk Formulir 8355">
        <p className="text-center py-8 text-ink-700/50 text-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Memuat data siswa Kelas 6...
        </p>
      </Layout>
    )
  }

  return (
    <Layout
      title="Data Ujian 8355"
      subtitle="Lengkapi data tambahan siswa Kelas 6 sebelum mencetak Daftar Calon Peserta Ujian (8355)"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-ink-700/50">
          Field lain (nama, NIS, NISN, tempat/tanggal lahir, nama ayah/ibu, pekerjaan, alamat, dst.) diambil
          otomatis dari data siswa yang sudah ada — form ini hanya untuk melengkapi kolom yang belum ada.
        </p>
        <Link to="/cetak-8355" className="btn-secondary shrink-0 ml-4 inline-flex items-center gap-1.5">
          <Printer size={16} /> Ke Halaman Cetak
        </Link>
      </div>

      {siswaList.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-700/60">
          Belum ada siswa di Kelas 6 (kelas dengan nama diawali "6"), atau data siswa belum diisi.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-ink-900/[0.1]">
                <th className="text-left py-2 px-2 sticky left-0 bg-white">Nama Siswa</th>
                {KOLOM_TAMBAHAN.map((k) => (
                  <th key={k.key} className="text-left py-2 px-2">{k.label}</th>
                ))}
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s) => (
                <tr key={s.id} className="border-b border-ink-900/[0.05]">
                  <td className="py-1.5 px-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                    {s.nama_lengkap}
                  </td>
                  {KOLOM_TAMBAHAN.map((k) => (
                    <td key={k.key} className="py-1.5 px-2">
                      <input
                        type={k.type === 'number' ? 'number' : 'text'}
                        className={`input-field !py-1 !text-xs ${k.width}`}
                        value={s[k.key] ?? ''}
                        onChange={(e) => ubahField(s.id, k.key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 px-2">
                    <button
                      type="button"
                      onClick={() => simpanBaris(s)}
                      disabled={savingId === s.id}
                      className="btn-secondary !px-2 !py-1"
                      title="Simpan baris ini"
                    >
                      {savingId === s.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : tersimpanId === s.id ? (
                        <CheckCircle2 size={14} className="text-sage-500" />
                      ) : (
                        <Save size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
