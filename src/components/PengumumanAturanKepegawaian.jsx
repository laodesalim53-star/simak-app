import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// ============================================================
// PENGATURAN — sesuaikan bila nama tabel/kolom di Supabase berbeda
// ============================================================
const TABEL_GURU = 'guru'

// Ganti nilai ini saat ada aturan baru agar pengumuman aturan muncul lagi
// untuk guru yang sebelumnya sudah menutupnya.
const VERSI_ATURAN = '2026-10'

// Pengingat jadwal mulai tampil sekian bulan sebelum perkiraan jatuh tempo.
const BULAN_PERINGATAN = 6

const KUNCI_TUTUP = 'notif_kepegawaian_ditutup'

// Kolom yang dicoba (urut) pada tabel guru.
const KOLOM = {
  nama: ['nama', 'nama_guru', 'nama_lengkap', 'name'],
  status: ['status_kepegawaian', 'status_pegawai', 'jenis_kepegawaian', 'status_guru', 'status'],
  golongan: ['pangkat_golongan', 'golongan', 'pangkat', 'golongan_ruang'],
  tmtPangkat: ['tmt_pangkat', 'tmt_golongan', 'tmt_pangkat_terakhir', 'tmt_pangkat_golongan'],
  tmtKgb: ['tmt_kgb', 'tmt_gaji_berkala', 'tmt_kgb_terakhir', 'tmt_gaji_berkala_terakhir', 'kgb_terakhir'],
  tmtMulai: ['tmt_pppk', 'tmt_cpns', 'tmt_pengangkatan', 'tmt_sk_pertama', 'tmt_pns'],
}

function pilih(g, kolom) {
  for (const k of kolom) {
    if (g[k] !== undefined && g[k] !== null && g[k] !== '') return g[k]
  }
  return ''
}

function bacaGuru(g) {
  return {
    id: String(g.id),
    nama: String(pilih(g, KOLOM.nama)),
    statusMentah: String(pilih(g, KOLOM.status)),
    golongan: String(pilih(g, KOLOM.golongan)),
    tmtPangkat: pilih(g, KOLOM.tmtPangkat),
    tmtKgb: pilih(g, KOLOM.tmtKgb),
    tmtMulai: pilih(g, KOLOM.tmtMulai),
  }
}

// 'pns' | 'pppk' | null (honorer/GTT/tidak diketahui -> tidak ada pengumuman)
function jenisKepegawaian(raw) {
  const s = String(raw || '').toLowerCase()
  if (!s) return null
  if (/\bnon\b|non-|honor|gtt|gty|tidak tetap/.test(s)) return null
  if (/p3k|pppk/.test(s)) return 'pppk'
  if (/pns|cpns|asn/.test(s)) return 'pns'
  return null
}

// ============================================================
// Mencari data guru milik pengguna yang sedang login
// Urutan: profil.guru_id -> NIP -> NUPTK -> email -> nama
// ============================================================
async function cariGuruSaya({ sekolahId, profil, user }) {
  const dasar = () => supabase.from(TABEL_GURU).select('*').eq('sekolah_id', sekolahId)
  const percobaan = []

  if (profil?.guru_id) percobaan.push(() => dasar().eq('id', profil.guru_id))
  if (profil?.nip) percobaan.push(() => dasar().eq('nip', String(profil.nip)))
  if (profil?.nuptk) percobaan.push(() => dasar().eq('nuptk', String(profil.nuptk)))
  if (user?.email) percobaan.push(() => dasar().ilike('email', user.email))
  const nama = profil?.nama ?? profil?.nama_lengkap ?? profil?.full_name
  if (nama) percobaan.push(() => dasar().ilike('nama', String(nama).trim()))

  for (const buat of percobaan) {
    const { data, error } = await buat().limit(1)
    // error biasanya berarti kolomnya tidak ada di tabel -> coba cara berikutnya
    if (!error && data && data.length) return data[0]
  }
  return null
}

// ============================================================
// Tanggal
// ============================================================
function parseTanggal(v) {
  if (!v) return null
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1])
  return null
}

const tambahTahun = (d, n) => new Date(d.getFullYear() + n, d.getMonth(), d.getDate())
const tambahBulan = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
const isoTanggal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const bulanTahun = (d) => d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

// ============================================================
// Isi pengumuman
// ============================================================
const ATURAN = {
  pns: {
    judul: 'Info aturan terbaru untuk Guru PNS',
    bagian: [
      {
        judul: 'Kenaikan pangkat',
        poin: [
          'Usul kenaikan pangkat kini dapat diproses setiap bulan (Peraturan BKN No. 4 Tahun 2025, berlaku sejak 1 Oktober 2025), tidak lagi hanya April dan Oktober.',
          'Jabatan fungsional guru: paling singkat 2 tahun dalam pangkat terakhir, angka kredit mencukupi, dan predikat kinerja paling rendah "Baik" selama 2 tahun terakhir (Peraturan BKN No. 3 Tahun 2023).',
          'Kenaikan pangkat yang bersamaan dengan naik jenjang jabatan wajib melampirkan bukti lulus uji kompetensi.',
          'Usulan diproses melalui SIASN.',
        ],
      },
      {
        judul: 'Kenaikan Gaji Berkala (KGB)',
        poin: [
          'KGB diberikan setiap 2 tahun sekali bagi PNS yang memenuhi syarat.',
          'Gaji pokok mengacu pada PP No. 15 Tahun 2019 sebagaimana disesuaikan dengan PP No. 5 Tahun 2024.',
        ],
      },
    ],
  },
  pppk: {
    judul: 'Info aturan terbaru untuk Guru PPPK',
    bagian: [
      {
        judul: 'Kenaikan Gaji Berkala (KGB)',
        poin: [
          'Dasar: PermenPAN-RB No. 7 Tahun 2023. Syarat: masa perjanjian kerja lebih dari 2 tahun, masa kerja golongan terpenuhi, dan predikat kinerja paling rendah "Baik" dalam 2 tahun terakhir.',
          'PPPK juga dapat memperoleh Kenaikan Gaji Istimewa sesuai ketentuan yang sama.',
        ],
      },
      {
        judul: 'Pangkat dan golongan',
        poin: [
          'PPPK tidak memiliki sistem kenaikan pangkat/golongan seperti PNS. Golongan mengikuti kualifikasi pendidikan saat pengangkatan; jenjang karier melalui jenjang jabatan fungsional.',
          'Gaji pokok PPPK mengacu pada Perpres No. 11 Tahun 2024.',
        ],
      },
    ],
  },
}

const CATATAN =
  'Informasi ini ringkasan dan bukan pengganti peraturan resmi. Untuk kepastian, rujuk JDIH BKN/KemenPAN-RB atau tanyakan kepada BKD/BKPSDM dan operator kepegawaian.'

// Pengingat jadwal pribadi dari data TMT guru
function susunPengingat(g, jenis, sekarang) {
  const hasil = []

  function tambah(kode, label, due) {
    const batas = tambahBulan(due, -BULAN_PERINGATAN)
    let tahap = null
    if (sekarang >= due) tahap = 'sudah'
    else if (sekarang >= batas) tahap = 'segera'
    if (!tahap) return
    hasil.push({
      id: `${g.id}-${kode}-${isoTanggal(due)}`,
      tahap,
      judul: tahap === 'sudah' ? `${label}: sudah dapat diusulkan` : `${label}: segera jatuh tempo`,
      teks:
        tahap === 'sudah'
          ? `Berdasarkan data TMT Anda, perkiraan syarat masa waktu terpenuhi sejak ${bulanTahun(due)}. Segera siapkan berkas dan hubungi operator sekolah.`
          : `Berdasarkan data TMT Anda, perkiraan syarat masa waktu terpenuhi pada ${bulanTahun(due)}. Mulai siapkan berkas dari sekarang.`,
    })
  }

  const tmtPangkat = parseTanggal(g.tmtPangkat)
  const tmtKgb = parseTanggal(g.tmtKgb)
  const tmtMulai = parseTanggal(g.tmtMulai)

  if (jenis === 'pns') {
    if (tmtPangkat) tambah('pangkat', 'Kenaikan Pangkat', tambahTahun(tmtPangkat, 2))
    const acuanKgb = tmtKgb ?? tmtPangkat
    if (acuanKgb) tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(acuanKgb, 2))
  } else if (jenis === 'pppk') {
    const acuanKgb = tmtKgb ?? tmtMulai
    if (acuanKgb) tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(acuanKgb, 2))
  }

  const adaTmt = jenis === 'pns' ? Boolean(tmtPangkat || tmtKgb) : Boolean(tmtKgb || tmtMulai)
  return { pengingat: hasil, adaTmt }
}

// ============================================================
// Tampilan
// ============================================================
function bacaDitutup() {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI_TUTUP) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function simpanDitutup(daftar) {
  try {
    localStorage.setItem(KUNCI_TUTUP, JSON.stringify(daftar))
  } catch {
    /* abaikan */
  }
}

function Kartu({ warna, label, judul, children, onTutup }) {
  const gaya =
    warna === 'merah'
      ? 'border-red-300 bg-red-50'
      : warna === 'kuning'
        ? 'border-amber-300 bg-amber-50'
        : 'border-blue-200 bg-blue-50'
  return (
    <section className={`rounded-lg border p-4 text-slate-800 ${gaya}`} role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">{judul}</h2>
        </div>
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup pemberitahuan"
          className="shrink-0 rounded px-2 py-1 text-sm text-slate-500 hover:bg-white/60 hover:text-slate-800"
        >
          ✕
        </button>
      </div>
      {children}
    </section>
  )
}

function KartuAturan({ aturan, adaTmt, nama, onTutup }) {
  const [terbuka, setTerbuka] = useState(false)
  return (
    <Kartu warna="biru" label="Pemberitahuan untuk Anda" judul={aturan.judul} onTutup={onTutup}>
      <p className="mt-1 text-sm">
        {nama ? `Bapak/Ibu ${nama}, ` : ''}berikut ketentuan terbaru yang berkaitan dengan status kepegawaian Anda.
      </p>
      {!adaTmt && (
        <p className="mt-2 rounded bg-white/70 p-2 text-xs text-slate-600">
          Data TMT Anda belum lengkap sehingga pengingat jadwal belum dapat ditampilkan. Mohon hubungi operator untuk
          melengkapinya.
        </p>
      )}
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        className="mt-2 text-sm font-medium text-blue-700 hover:underline"
      >
        {terbuka ? 'Sembunyikan rincian' : 'Lihat rincian'}
      </button>
      {terbuka && (
        <div className="mt-3 space-y-3">
          {aturan.bagian.map((b) => (
            <div key={b.judul}>
              <h3 className="text-sm font-semibold text-slate-900">{b.judul}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {b.poin.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="rounded bg-white/70 p-2 text-xs text-slate-600">{CATATAN}</p>
        </div>
      )}
    </Kartu>
  )
}

// Pasang di halaman Beranda:  <PengumumanAturanKepegawaian />
// Hanya tampil bila pengguna yang login cocok dengan data guru berstatus PNS/PPPK.
export default function PengumumanAturanKepegawaian() {
  const { sekolahId: sekolahIdCtx, profil, user } = useAuth()
  const sekolahId = sekolahIdCtx ?? profil?.sekolah_id

  const [guru, setGuru] = useState(null)
  const [ditutup, setDitutup] = useState(bacaDitutup)

  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    cariGuruSaya({ sekolahId, profil, user })
      .then((row) => {
        if (!batal) setGuru(row ? bacaGuru(row) : null)
      })
      .catch((e) => console.error('PengumumanAturanKepegawaian:', e))
    return () => {
      batal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId, profil?.guru_id, profil?.nip, profil?.nuptk, user?.email])

  const jenis = guru ? jenisKepegawaian(guru.statusMentah) : null

  const { pengingat, adaTmt } = useMemo(
    () => (guru && jenis ? susunPengingat(guru, jenis, new Date()) : { pengingat: [], adaTmt: false }),
    [guru, jenis]
  )

  if (!guru || !jenis) return null

  function tutup(id) {
    const baru = [...ditutup, id]
    setDitutup(baru)
    simpanDitutup(baru)
  }

  const idAturan = `${guru.id}-aturan-${jenis}-${VERSI_ATURAN}`
  const pengingatTampil = pengingat.filter((p) => !ditutup.includes(p.id))
  const tampilAturan = !ditutup.includes(idAturan)

  if (!pengingatTampil.length && !tampilAturan) return null

  return (
    <div className="space-y-3">
      {pengingatTampil.map((p) => (
        <Kartu
          key={p.id}
          warna={p.tahap === 'sudah' ? 'merah' : 'kuning'}
          label="Pengingat untuk Anda"
          judul={p.judul}
          onTutup={() => tutup(p.id)}
        >
          <p className="mt-1 text-sm">{p.teks}</p>
          <p className="mt-2 text-xs text-slate-500">
            Perkiraan dihitung dari TMT pada data guru; angka kredit dan penilaian kinerja belum diperhitungkan.
          </p>
        </Kartu>
      ))}
      {tampilAturan && (
        <KartuAturan aturan={ATURAN[jenis]} adaTmt={adaTmt} nama={guru.nama} onTutup={() => tutup(idAturan)} />
      )}
    </div>
  )
}
