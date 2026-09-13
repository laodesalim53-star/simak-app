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
//
// TAMBAHAN: setiap kolom bisa punya properti `sumber` — daftar nama kolom
// di tabel `siswa` yang datanya sudah ada di form Data Siswa utama. Kalau
// ada, nilainya otomatis ditarik ke sini SELAMA kolom 8355-nya masih kosong
// (supaya tidak menimpa data yang sudah pernah diisi/diubah manual admin).
const KOLOM_TAMBAHAN = [
  { key: 'no_absen', label: 'No Absen', type: 'number', width: 'w-20' },
  { key: 'kode_peserta_ujian', label: 'Kode Peserta', width: 'w-28' },
  { key: 'no_peserta_ujian', label: 'No Peserta', width: 'w-28' },
  { key: 'kode_pos', label: 'Kode Pos', width: 'w-24', sumber: ['kode_pos'] },
  { key: 'hobi_anak', label: 'Hobi Anak', width: 'w-32' },
  { key: 'cita_cita_anak', label: 'Cita-cita Anak', width: 'w-32' },
  { key: 'gaji_orang_tua', label: 'Gaji Orang Tua', width: 'w-32', sumber: ['penghasilan_ayah', 'penghasilan_ibu'] },
  { key: 'jarak_rumah_sekolah', label: 'Jarak Rumah-Sekolah', width: 'w-32', sumber: ['jarak_rumah_ke_sekolah'] },
  { key: 'transportasi_ke_sekolah', label: 'Transportasi', width: 'w-28', sumber: ['alat_transportasi'] },
  { key: 'jumlah_saudara', label: 'Jml Saudara', type: 'number', width: 'w-24', sumber: ['jumlah_saudara_kandung'] },
  { key: 'no_skhun', label: 'No SKHUN', width: 'w-28', sumber: ['skhun'] },
]

// TAMBAHAN: Kelas 6 di beberapa sekolah ditulis dengan angka ("6A", "Kelas 6"),
// di sekolah lain pakai angka Romawi ("VIA", "Kelas VI"). Supaya penarikan data
// tidak meleset karena beda gaya penamaan, kecocokan kelas dicek dari KEDUA
// kemungkinan itu sekaligus.
function isKelas6(namaKelas) {
  const nama = (namaKelas || '').trim().toUpperCase()
  if (!nama) return false
  // Angka: diawali "6" (mis. "6A", "6", "6-B", "KELAS 6")
  if (/^6\b/.test(nama)) return true
  if (/KELAS\s*6\b/.test(nama)) return true
  // Romawi: diawali "VI" tapi bukan "VII" atau "VIII" (kelas 7/8), dan bukan
  // "VI" yang jadi bagian kata lain — makanya dicek harus diikuti batas kata,
  // spasi, atau langsung akhir string / diikuti huruf rombel (A, B, C, ...).
  if (/^VI([^I]|$)/.test(nama)) return true
  if (/KELAS\s*VI([^I]|$)/.test(nama)) return true
  return false
}

export default function DataUjian8355() {
  const { profil, isAdmin } = useAuth()
  const sekolahId = profil?.sekolah_id

  const [loading, setLoading] = useState(true)
  const [siswaList, setSiswaList] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [tersimpanId, setTersimpanId] = useState(null)

  useEffect(() => {
    if (isAdmin) muatData()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, isAdmin])

  async function muatData() {
    if (!sekolahId) {
      setLoading(false)
      return
    }
    setLoading(true)

    // PERBAIKAN: filter kelas 6 dulunya hanya .ilike('kelas.nama_kelas', '6%')
    // sehingga kelas dengan penamaan Romawi ("VIA", "Kelas VI", dst.) tidak
    // pernah muncul. Sekarang semua siswa sekolah diambil dulu (join kelas),
    // lalu difilter di sisi client memakai isKelas6() yang menerima kedua
    // format penamaan (angka "6" maupun Romawi "VI").
    const { data, error } = await supabase
      .from('siswa')
      .select('*, kelas(nama_kelas)')
      .eq('sekolah_id', sekolahId)
      .order('nama_lengkap')

    if (error) {
      console.error('Gagal memuat siswa:', error)
      setSiswaList([])
      setLoading(false)
      return
    }

    const kelas6 = (data || []).filter((s) => isKelas6(s.kelas?.nama_kelas))

    // TAMBAHAN: sinkronkan otomatis kolom 8355 dari data siswa yang sudah ada
    // di form Data Siswa utama, TAPI hanya untuk kolom 8355 yang masih kosong
    // — supaya tidak menimpa data yang sudah pernah diisi/diedit manual oleh
    // admin sebelumnya di halaman ini.
    const disinkron = kelas6.map((s) => {
      const hasil = { ...s }
      for (const kolom of KOLOM_TAMBAHAN) {
        if (!kolom.sumber) continue
        const kosong = hasil[kolom.key] === null || hasil[kolom.key] === undefined || hasil[kolom.key] === ''
        if (kosong) {
          const nilaiSumber = kolom.sumber
            .map((src) => s[src])
            .find((v) => v !== null && v !== undefined && v !== '')
          if (nilaiSumber !== undefined) hasil[kolom.key] = nilaiSumber
        }
      }
      return hasil
    })

    setSiswaList(disinkron)
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

  if (!isAdmin) {
    return (
      <Layout title="Data Ujian 8355" subtitle="Lengkapi data tambahan Kelas 6 untuk Formulir 8355">
        <div className="card p-6 text-center text-sm text-ink-700/60">
          Halaman ini khusus untuk Admin, Admin Utama, dan Superadmin.
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
          otomatis dari data siswa yang sudah ada. Kolom bertanda <span className="italic">"otomatis dari Data Siswa"</span> di
          bawah juga sudah ditarik otomatis — cek dan koreksi bila perlu, lalu klik tombol simpan pada baris itu.
        </p>
        <Link to="/cetak-8355" className="btn-secondary shrink-0 ml-4 inline-flex items-center gap-1.5">
          <Printer size={16} /> Ke Halaman Cetak
        </Link>
      </div>

      {siswaList.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-700/60">
          Belum ada siswa di Kelas 6 (kelas dengan nama diawali "6" atau "VI"), atau data siswa belum diisi.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-ink-900/[0.1]">
                <th className="text-left py-2 px-2 sticky left-0 bg-white">Nama Siswa</th>
                {KOLOM_TAMBAHAN.map((k) => (
                  <th key={k.key} className="text-left py-2 px-2">
                    {k.label}
                    {k.sumber && (
                      <span className="block text-[10px] font-normal text-ink-700/40">
                        otomatis dari Data Siswa
                      </span>
                    )}
                  </th>
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
