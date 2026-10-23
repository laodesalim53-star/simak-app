// src/components/LaporanLpjOtomatis.jsx
// Komponen penyempurna LPJ Kepala Sekolah:
//   buatKendalaSolusi  -> kendala + usulan solusi dari data nyata (murid, guru, keuangan, Buku Kerja)
//   buatRtl            -> rencana tindak lanjut yang selaras dengan kendala
//   buatPenutup        -> kalimat penutup baku
//   periksaDokumen     -> daftar masalah/kejanggalan sebelum dicetak
//   PemeriksaDokumen   -> tampilan daftar pemeriksaan (tidak ikut tercetak)
// Semua teks hanya USULAN dari data yang tercatat; tetap bisa disunting di halaman.
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0)
const num = (v) => Number(v) || 0
const daftar = (rows) =>
  rows.slice(0, 3).map((r) => r.uraian).join('; ') + (rows.length > 3 ? ', dan lainnya' : '')

function analisisKeuangan(keuangan) {
  const totA = keuangan.reduce((a, r) => a + num(r.anggaran), 0)
  const totR = keuangan.reduce((a, r) => a + num(r.realisasi), 0)
  const lebih = keuangan.filter((r) => num(r.anggaran) > 0 && num(r.realisasi) > num(r.anggaran))
  const tanpa = keuangan.filter((r) => num(r.anggaran) === 0 && num(r.realisasi) > 0)
  return { totA, totR, lebih, tanpa, melampaui: totA > 0 && totR > totA }
}

export function buatKendalaSolusi({ ks, keuangan = [], bk = {} }) {
  const k = []
  const tambah = (masalah, solusi) => k.push({ masalah, solusi })

  if (ks.siswaTanpaTingkat > 0) {
    tambah(
      `Sebanyak ${ks.siswaTanpaTingkat} siswa aktif belum terhubung ke kelas atau tingkat, sehingga belum terhitung penuh dalam laporan.`,
      'Melengkapi data kelas siswa melalui menu Data Siswa dan Data Kelas, lalu memverifikasinya pada awal semester berikutnya.'
    )
  }
  if (ks.guru.total > 0 && ks.guru.tanpaNip > 0) {
    tambah(
      `Sebanyak ${ks.guru.tanpaNip} dari ${ks.guru.total} guru dan tenaga kependidikan belum ber-NIP, sehingga kebutuhan pendidik masih bergantung pada tenaga non-ASN.`,
      'Mengusulkan formasi pengangkatan kepada dinas pendidikan dan memfasilitasi peningkatan kompetensi guru non-ASN.'
    )
  }
  if (ks.rasioMuridPerGuru != null && ks.rasioMuridPerGuru > 28) {
    tambah(
      `Rasio peserta didik terhadap guru dan tenaga kependidikan masih tinggi (${ks.rasioMuridPerGuru.toFixed(1)} : 1).`,
      'Mengoptimalkan pembagian rombongan belajar dan mengusulkan tambahan tenaga pendidik.'
    )
  }

  const a = analisisKeuangan(keuangan)
  if (a.melampaui) {
    tambah(
      `Total realisasi belanja (${rupiah(a.totR)}) melampaui total anggaran (${rupiah(a.totA)}) sebesar ${rupiah(a.totR - a.totA)}.`,
      'Memeriksa kesesuaian pencatatan BKU dengan RKAS/ARKAS, mengoreksi kode rekening yang keliru, dan menyusun perubahan RKAS bila diperlukan.'
    )
  }
  if (a.lebih.length) {
    tambah(
      `Realisasi melebihi anggaran pada: ${daftar(a.lebih)}.`,
      'Melakukan pergeseran anggaran antar-kegiatan sesuai ketentuan dan memperketat pengendalian belanja terhadap RKAS.'
    )
  }
  if (a.tanpa.length) {
    tambah(
      `Terdapat realisasi belanja yang belum memiliki anggaran pada: ${daftar(a.tanpa)}.`,
      'Melengkapi kode rekening pada BKU agar sesuai dengan ARKAS dan mencatat kegiatan tersebut pada perubahan RKAS.'
    )
  }

  if (!bk.jurnal) {
    tambah(
      'Pencatatan jurnal kegiatan harian kepala sekolah belum dilakukan secara rutin.',
      'Membiasakan pengisian jurnal pada Buku Kerja Kepala Sekolah setiap akhir hari kerja.'
    )
  }
  if (!bk.pembinaan) {
    tambah(
      'Pembinaan guru dan tenaga kependidikan belum tercatat.',
      'Menjadwalkan supervisi dan pembinaan secara berkala serta mencatatnya pada Buku Kerja Kepala Sekolah.'
    )
  }
  return k
}

export function buatRtl({ ks, keuangan = [], bk = {} }) {
  const t = []
  const a = analisisKeuangan(keuangan)
  if (ks.siswaTanpaTingkat > 0) t.push('Melengkapi dan memverifikasi data peserta didik (kelas, tingkat, jenis kelamin) pada awal tahun ajaran berikutnya.')
  if (ks.guru.tanpaNip > 0) t.push('Mengusulkan formasi dan memfasilitasi pengembangan kompetensi bagi guru dan tenaga kependidikan yang belum ber-NIP.')
  if (a.melampaui || a.lebih.length || a.tanpa.length) {
    t.push('Menyusun RKAS tahun berikutnya berdasarkan realisasi dan skala prioritas, serta menyelaraskan kode rekening BKU dengan ARKAS.')
  }
  t.push(`Meningkatkan supervisi dan pembinaan guru${bk.pembinaan ? ` (tahun ini tercatat ${bk.pembinaan} kali)` : ''} secara terjadwal.`)
  t.push('Melanjutkan program yang berjalan baik dan mengevaluasi program yang belum mencapai target dalam rapat evaluasi berkala.')
  t.push('Memperkuat tertib administrasi sekolah (surat, inventaris, notulen) dan keterbukaan pelaporan kepada komite sekolah dan orang tua.')
  return t
}

export function buatPenutup({ namaSekolah, tahun }) {
  return (
    `Demikian Laporan Pertanggungjawaban Kepala Sekolah ${namaSekolah || 'sekolah'} Tahun Ajaran ${tahun} ini disusun sebagai bahan evaluasi ` +
    'dan pertanggungjawaban atas pelaksanaan tugas. Kritik dan saran yang membangun sangat diharapkan untuk perbaikan pada tahun berikutnya. ' +
    'Atas perhatian dan dukungan semua pihak, kami ucapkan terima kasih.'
  )
}

// ---------------------------------------------------------------------------
// Pemeriksa kelengkapan
// ---------------------------------------------------------------------------
export function periksaDokumen(d, ctx) {
  const { ks, keu, bk, thnAnggaran, visiMisi, kepala, nipKepala, total } = ctx
  const out = []
  const err = (teks) => out.push({ level: 'error', teks })
  const warn = (teks) => out.push({ level: 'warn', teks })

  if (!d.pendahuluan.trim()) err('Pendahuluan (A) masih kosong.')
  if (!String(kepala || '').trim()) err('Nama kepala sekolah belum ada (G).')
  if (!String(nipKepala || '').trim()) warn('NIP kepala sekolah belum ada (G).')
  if (!d.tanggal) warn('Tanggal pengesahan (G) belum diisi.')
  if (!d.penutup.trim()) warn('Kalimat penutup (G) masih kosong.')

  // Murid & guru
  const s = d.jumlah_siswa === '' ? null : Number(d.jumlah_siswa)
  const l = d.jumlah_l === '' ? null : Number(d.jumlah_l)
  const p = d.jumlah_p === '' ? null : Number(d.jumlah_p)
  const g = d.jumlah_guru === '' ? null : Number(d.jumlah_guru)
  if (!s) err('Jumlah siswa (B) belum terisi.')
  if (s != null && l != null && p != null && l + p !== s) warn(`Laki-laki (${l}) ditambah perempuan (${p}) tidak sama dengan jumlah siswa (${s}).`)
  if (!ks.memuat && ks.totalSiswaAktif > 0 && s != null && s !== ks.totalSiswaAktif) {
    warn(`Jumlah siswa di laporan (${s}) berbeda dari database (${ks.totalSiswaAktif}). Klik "Tarik Data Otomatis" bila ingin menyamakan.`)
  }
  if (!ks.memuat && ks.guru.total > 0 && g != null && g !== ks.guru.total) {
    warn(`Jumlah guru di laporan (${g}) berbeda dari database (${ks.guru.total}). Klik "Tarik Data Otomatis" bila ingin menyamakan.`)
  }
  if (!ks.memuat && ks.siswaTanpaTingkat > 0) warn(`${ks.siswaTanpaTingkat} siswa aktif belum punya kelas/tingkat, jadi tidak terhitung di tabel per tingkat.`)

  // Capaian
  const prog = d.capaian.filter((r) => r.program.trim())
  if (!prog.length) warn('Capaian program (C) masih kosong.')
  else {
    const kosong = prog.filter((r) => !r.capaian.trim()).length
    if (kosong) warn(`${kosong} dari ${prog.length} program belum diisi kolom Capaian (C).`)
  }
  if (!bk.program.length) warn('Belum ada program di Buku Kerja Kepala Sekolah.')

  // Keuangan
  const rows = d.keuangan.filter((r) => r.uraian.trim())
  if (!rows.length) warn('Tabel keuangan (D) masih kosong.')
  if (keu.dimuat && keu.anggaran == null) warn(`Belum ada data ARKAS tahun ${thnAnggaran}; isi manual atau impor ARKAS di menu Keuangan.`)
  if (keu.dimuat && keu.penerimaan == null) warn(`Belum ada data BKU tahun ${thnAnggaran}; isi manual atau impor BKU di menu Keuangan.`)
  const a = analisisKeuangan(rows)
  if (a.melampaui) {
    warn(`Total realisasi (${rupiah(a.totR)}) melebihi total anggaran (${rupiah(a.totA)}), serapan ${((a.totR / a.totA) * 100).toFixed(1)}%. Periksa kesesuaian kode rekening BKU dengan ARKAS.`)
  }
  if (a.lebih.length) warn(`Realisasi melebihi anggaran pada: ${daftar(a.lebih)}.`)
  if (a.tanpa.length) warn(`Ada realisasi tanpa anggaran pada: ${daftar(a.tanpa)}.`)
  if (num(d.penerimaan) > 0 && num(d.penerimaan) - total.realisasi < 0) {
    warn('Sisa kas negatif: realisasi lebih besar dari total penerimaan. Kemungkinan saldo awal tahun belum tercatat di BKU.')
  }

  // Kendala & RTL
  const kd = d.kendala.filter((r) => r.masalah.trim())
  const tanpaSolusi = kd.filter((r) => !r.solusi.trim()).length
  if (tanpaSolusi) warn(`${tanpaSolusi} kendala belum punya solusi (E).`)
  if (!d.rtl.some((x) => x.trim())) warn('Rencana tindak lanjut (F) masih kosong.')

  // Placeholder
  const teks = [
    d.pendahuluan, d.penutup,
    ...d.kendala.flatMap((r) => [r.masalah, r.solusi]),
    ...d.rtl,
    ...d.capaian.flatMap((r) => [r.bidang, r.program, r.target, r.capaian, r.ket]),
  ]
  if (teks.some((x) => /\[[^\]]+\]/.test(String(x || '')))) warn('Masih ada teks placeholder dalam kurung siku [ ... ] yang perlu diganti.')

  if (!(visiMisi?.visi || visiMisi?.misi?.length)) warn('Visi dan misi belum diisi di menu Visi, Misi, dan Tujuan.')
  return out
}

export function PemeriksaDokumen({ hasil, terbuka = true }) {
  const e = hasil.filter((h) => h.level === 'error').length
  const w = hasil.filter((h) => h.level === 'warn').length
  const bersih = hasil.length === 0
  return (
    <details open={terbuka} className="no-print mb-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-700">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900">
        {bersih ? <CheckCircle2 size={16} className="text-emerald-600" /> : e ? <XCircle size={16} className="text-red-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
        Pemeriksa dokumen:{' '}
        {bersih ? 'tidak ada masalah, siap dicetak' : `${e} wajib diperbaiki, ${w} perlu dicek`}
      </summary>
      {!bersih && (
        <ul className="space-y-1 px-4 pb-3">
          {hasil.map((h, i) => (
            <li key={i} className={`flex items-start gap-1.5 ${h.level === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
              {h.level === 'error' ? <XCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
              {h.teks}
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
