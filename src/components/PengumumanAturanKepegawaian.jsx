import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

// ============================================================
// PENGATURAN
// ============================================================
const TABEL_GURU = 'guru'

// Ganti nilai ini saat ada aturan baru agar pengumuman aturan muncul lagi
// untuk guru yang sebelumnya sudah menutupnya.
const VERSI_ATURAN = '2026-10'

// Pengingat jadwal mulai tampil sekian bulan sebelum perkiraan jatuh tempo.
const BULAN_PERINGATAN = 6

const KUNCI_TUTUP = 'notif_kepegawaian_ditutup'

// Kolom tabel `guru` (sesuai ProfilSaya.jsx):
//   nama_lengkap, status_kepegawaian, tanggal_cpns, tmt_pengangkatan -> sudah ada
//   tmt_pangkat, tmt_kgb                                             -> perlu ditambahkan:
//   alter table guru add column if not exists tmt_pangkat date;
//   alter table guru add column if not exists tmt_kgb date;
function bacaGuru(g) {
  return {
    id: String(g.id),
    nama: g.nama_lengkap ? rapikanNama(g.nama_lengkap) : '',
    statusMentah: g.status_kepegawaian ? String(g.status_kepegawaian) : '',
    tmtPangkat: g.tmt_pangkat || '',
    tmtKgb: g.tmt_kgb || '',
    tmtPengangkatan: g.tmt_pengangkatan || '',
    tmtCpns: g.tanggal_cpns || '',
    // true bila kolom tmt_pangkat/tmt_kgb memang ada di tabel (walau nilainya kosong)
    adaKolomTmt: 'tmt_pangkat' in g || 'tmt_kgb' in g,
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
// "SELVIA PUTRI HARDI FID,S.PdI" -> "Selvia Putri Hardi Fid, S.PdI"
// Gelar (mengandung titik, mis. S.Pd, M.Pd.) dibiarkan apa adanya.
function rapikanNama(raw) {
  const s = String(raw || '').trim().replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ')
  if (!s) return ''
  return s
    .split(' ')
    .map((t) => {
      if (t.includes('.')) return t
      const m = t.match(/^(.*?)(,?)$/)
      const kata = m[1]
      const seragam = kata === kata.toUpperCase() || kata === kata.toLowerCase()
      const hasil = seragam ? kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase() : kata
      return hasil + m[2]
    })
    .join(' ')
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

// Pengingat jadwal pribadi dari data TMT guru.
// `perkiraan` = true bila acuannya bukan TMT terakhir (mis. TMT pengangkatan/CPNS),
// sehingga pengingat hanya ditampilkan di sekitar siklus pertama (sampai 12 bulan
// setelah jatuh tempo). Setelah itu tidak diketahui apakah KGB sudah pernah diproses.
function susunPengingat(g, jenis, sekarang) {
  const hasil = []

  function tambah(kode, label, due, perkiraan = false) {
    const batas = tambahBulan(due, -BULAN_PERINGATAN)
    let tahap = null
    if (sekarang >= due) tahap = 'sudah'
    else if (sekarang >= batas) tahap = 'segera'
    if (!tahap) return
    hasil.push({
      id: `${g.id}-${kode}-${isoTanggal(due)}`,
      tahap,
      perkiraan,
      judul: tahap === 'sudah' ? `${label}: sudah dapat diusulkan` : `${label}: segera jatuh tempo`,
      teks:
        tahap === 'sudah'
          ? `Berdasarkan data TMT Anda, perkiraan syarat masa waktu terpenuhi sejak ${bulanTahun(due)}. Segera siapkan berkas dan hubungi operator sekolah.`
          : `Berdasarkan data TMT Anda, perkiraan syarat masa waktu terpenuhi pada ${bulanTahun(due)}. Mulai siapkan berkas dari sekarang.`,
    })
  }

  const tmtPangkat = parseTanggal(g.tmtPangkat)
  const tmtKgb = parseTanggal(g.tmtKgb)
  const tmtPengangkatan = parseTanggal(g.tmtPengangkatan)
  const tmtCpns = parseTanggal(g.tmtCpns)

  if (jenis === 'pns') {
    if (tmtPangkat) tambah('pangkat', 'Kenaikan Pangkat', tambahTahun(tmtPangkat, 2))
    if (tmtKgb) {
      tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(tmtKgb, 2))
    } else if (tmtPangkat) {
      tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(tmtPangkat, 2))
    } else {
      // Belum pernah KGB / data belum diisi: acuan awal TMT CPNS atau TMT pengangkatan.
      // Bila "Tanggal CPNS" di data Anda adalah tanggal SK (bukan TMT), ganti dengan: tmtPengangkatan
      const awal = tmtCpns ?? tmtPengangkatan
      if (awal) tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(awal, 2), true)
    }
  } else if (jenis === 'pppk') {
    if (tmtKgb) tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(tmtKgb, 2))
    else if (tmtPengangkatan) tambah('kgb', 'Kenaikan Gaji Berkala', tambahTahun(tmtPengangkatan, 2), true)
  }

  const adaTmt =
    jenis === 'pns'
      ? Boolean(tmtPangkat || tmtKgb || tmtCpns || tmtPengangkatan)
      : Boolean(tmtKgb || tmtPengangkatan)
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

function KartuAturan({ aturan, tampilkanDataBelumLengkap, nama, onTutup }) {
  const [terbuka, setTerbuka] = useState(false)
  return (
    <Kartu warna="biru" label="Pemberitahuan untuk Anda" judul={aturan.judul} onTutup={onTutup}>
      {nama && <p className="mt-1 text-sm font-medium">Yth. Bapak/Ibu {nama}</p>}
      <p className={`${nama ? 'mt-0.5' : 'mt-1'} text-sm`}>
        Berikut ketentuan terbaru yang berkaitan dengan status kepegawaian Anda.
      </p>
      {tampilkanDataBelumLengkap && (
        <p className="mt-2 rounded bg-white/70 p-2 text-xs text-slate-600">
          Data TMT Anda belum lengkap sehingga pengingat jadwal belum dapat ditampilkan. Mohon lengkapi di menu Profil
          Saya atau hubungi operator.
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

// Pasang di Dasbor (DashboardSekolah):  <PengumumanAturanKepegawaian />
// Hanya tampil bila akun yang login tertaut ke data guru (profil.guru_id)
// berstatus PNS/PPPK. Admin/operator/orang tua/pegawai kantor tanpa guru_id
// tidak melihat apa-apa.
export default function PengumumanAturanKepegawaian() {
  const { profil } = useAuth()
  const guruId = profil?.guru_id

  const [guru, setGuru] = useState(null)
  const [ditutup, setDitutup] = useState(bacaDitutup)

  useEffect(() => {
    if (!guruId) {
      setGuru(null)
      return
    }
    let batal = false
    supabase
      .from(TABEL_GURU)
      .select('*')
      .eq('id', guruId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (batal) return
        if (error) console.error('PengumumanAturanKepegawaian:', error.message)
        setGuru(data ? bacaGuru(data) : null)
      })
    return () => {
      batal = true
    }
  }, [guruId])

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

  // Pemberitahuan "data TMT belum lengkap" hanya masuk akal bila guru memang bisa
  // melengkapinya: PPPK (TMT pengangkatan) atau tabel sudah punya kolom tmt_pangkat/tmt_kgb.
  const tampilkanDataBelumLengkap = !adaTmt && (jenis === 'pppk' || guru.adaKolomTmt)

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
            {p.perkiraan
              ? 'Perkiraan awal dari TMT pengangkatan/CPNS. Jika KGB sudah pernah diproses, mohon perbarui data TMT Anda atau hubungi operator.'
              : 'Perkiraan dihitung dari TMT pada data guru; angka kredit dan penilaian kinerja belum diperhitungkan.'}
          </p>
        </Kartu>
      ))}
      {tampilAturan && (
        <KartuAturan
          aturan={ATURAN[jenis]}
          tampilkanDataBelumLengkap={tampilkanDataBelumLengkap}
          nama={guru.nama}
          onTutup={() => tutup(idAturan)}
        />
      )}
    </div>
  )
}
