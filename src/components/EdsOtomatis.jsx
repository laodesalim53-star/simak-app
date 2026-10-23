// src/components/EdsOtomatis.jsx
//
// Pengisian otomatis untuk modal "Tambah Evaluasi Diri Sekolah".
// Saat Standar dipilih, kolom Capaian Saat Ini, Bukti / Data Dukung, dan Rencana Perbaikan
// diisi draf dari data yang sudah ada di aplikasi:
//  - Murid & guru   : useKeadaanSekolah (components/LaporanTahunanOtomatis.jsx)
//  - Keuangan       : muatKeuanganTahun (lib/dataKeuanganLaporan.js), ARKAS + BKU
//  - Program kerja  : dokumen 'buku-kerja' (Buku Kerja Kepala Sekolah)
//  - Visi & misi    : tabel visi_misi_sekolah
//
// Isian yang sudah ditulis pengguna TIDAK ditimpa, kecuali kotak "Timpa isian" dicentang.
// Bagian yang tidak bisa diketahui dari database ditandai [lengkapi: ...] agar diisi sendiri.
//
// Cara pakai di modal (sesuaikan nama state form Anda):
//
//   <EdsOtomatis
//     sekolahId={sekolahId}
//     tanggal={form.tanggal}
//     standar={form.standar}
//     nilai={{ capaian: form.capaian, bukti: form.bukti, rencana: form.rencana }}
//     onTerapkan={(p) => setForm((f) => ({ ...f, ...p }))}
//   />
//
// onTerapkan menerima objek { capaian, bukti, rencana } (hanya kunci yang berubah).

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useDokumenTersimpan } from '../lib/administrasiKepsek'
import { useKeadaanSekolah } from './LaporanTahunanOtomatis'
import { muatKeuanganTahun, KEUANGAN_LPJ_KOSONG } from '../lib/dataKeuanganLaporan'

const bawaanBukuKerja = () => ({ jurnal: [], program: [], pembinaan: [] })

const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0)

const daftarBernomor = (arr) => arr.map((s, i) => `${i + 1}. ${s}`).join('\n')

// Kenali standar dari teks pilihan (label atau nilai). Mengikuti 8 Standar Nasional Pendidikan.
export function kenaliStandar(teks) {
  const t = String(teks || '').toLowerCase()
  if (!t.trim()) return null
  if (/penilaian/.test(t)) return 'penilaian'
  if (/proses/.test(t)) return 'proses'
  if (/lulusan/.test(t)) return 'lulusan'
  if (/pendidik|tenaga/.test(t)) return 'pendidik'
  if (/sarana|prasarana/.test(t)) return 'sarpras'
  if (/pengelolaan/.test(t)) return 'pengelolaan'
  if (/pembiayaan/.test(t)) return 'pembiayaan'
  if (/\bisi\b/.test(t)) return 'isi'
  return null
}

// Menyusun draf { capaian, bukti, rencana } untuk satu standar dari data terkini.
export function susunDrafEds(kunci, { ks, keu, bk, visiMisi, tahunAnggaran }) {
  const siswa = ks?.totalSiswaAktif || 0
  const guru = ks?.guru?.total || 0
  const rombel = ks?.totalRombel || 0
  const program = bk?.program || []
  const namaProgram = program.map((p) => p.program).filter(Boolean)

  const totalRealisasi = (keu?.perKelompok || []).reduce((a, g) => a + (Number(g.realisasi) || 0), 0)
  const totalAnggaran = keu?.anggaran != null ? Number(keu.anggaran) : (keu?.perKelompok || []).reduce((a, g) => a + (Number(g.anggaran) || 0), 0)
  const persen = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : null

  switch (kunci) {
    case 'lulusan':
      return {
        capaian: [
          `Sekolah memiliki ${siswa} siswa aktif dalam ${rombel} rombongan belajar.`,
          '[lengkapi: persentase kelulusan dan hasil asesmen akhir tahun terakhir]',
          '[lengkapi: capaian profil pelajar Pancasila / karakter lulusan]',
        ].join('\n'),
        bukti: 'Daftar nilai dan rapor siswa, rekap hasil asesmen, Surat Keterangan Lulus (SKL), dan dokumentasi kegiatan penguatan karakter.',
        rencana: daftarBernomor([
          'Menganalisis hasil asesmen untuk menentukan kompetensi yang masih rendah dan menyusun program remedial atau pengayaan.',
          'Memperkuat kegiatan literasi dan numerasi secara terjadwal.',
          'Memantau perkembangan karakter siswa melalui catatan wali kelas.',
        ]),
      }

    case 'isi':
      return {
        capaian: [
          namaProgram.length
            ? `Program kerja yang tercantum dalam Buku Kerja Kepala Sekolah berjumlah ${namaProgram.length}, antara lain ${namaProgram.slice(0, 3).join('; ')}.`
            : '[lengkapi: program kerja kurikulum yang sudah berjalan]',
          visiMisi?.visi ? 'Visi, misi, dan tujuan sekolah sudah tersusun dan menjadi acuan penyusunan KOSP.' : '[lengkapi: status penyusunan KOSP dan visi misi]',
        ].join('\n'),
        bukti: 'Dokumen KOSP, Kalender Pendidikan, Buku Kerja Kepala Sekolah, dan dokumen Visi, Misi, dan Tujuan sekolah.',
        rencana: daftarBernomor([
          'Meninjau KOSP setiap awal tahun ajaran agar sesuai dengan kebutuhan murid dan kondisi sekolah.',
          'Menyosialisasikan KOSP kepada seluruh guru dan komite sekolah.',
          'Menyesuaikan muatan lokal dengan potensi daerah setempat.',
        ]),
      }

    case 'proses':
      return {
        capaian: [
          bk?.jurnal ? `Kegiatan kepala sekolah tercatat dalam ${bk.jurnal} entri jurnal Buku Kerja.` : '[lengkapi: pelaksanaan pembelajaran dan perangkat ajar yang digunakan guru]',
          bk?.pembinaan ? `Pembinaan guru telah dilaksanakan sebanyak ${bk.pembinaan} kali.` : '[lengkapi: pelaksanaan supervisi dan pembinaan guru]',
        ].join('\n'),
        bukti: 'Perangkat pembelajaran (RPP/modul ajar), laporan supervisi akademik, jurnal Buku Kerja, dan dokumentasi pembelajaran.',
        rencana: daftarBernomor([
          'Melaksanakan supervisi akademik secara terjadwal dan menindaklanjuti hasilnya dengan pembinaan.',
          'Mendorong guru menggunakan metode dan media pembelajaran yang bervariasi.',
          'Mengadakan diskusi kelompok kerja guru untuk berbagi praktik baik.',
        ]),
      }

    case 'penilaian':
      return {
        capaian: [
          `Penilaian dilaksanakan untuk ${siswa} siswa aktif pada ${rombel} rombongan belajar.`,
          '[lengkapi: bentuk penilaian (formatif, sumatif) dan tindak lanjut hasilnya]',
        ].join('\n'),
        bukti: 'Kisi-kisi dan soal asesmen, daftar nilai, rapor, serta catatan remedial dan pengayaan.',
        rencana: daftarBernomor([
          'Menyeragamkan format penilaian dan pelaporan hasil belajar antarkelas.',
          'Memanfaatkan hasil asesmen sebagai dasar perbaikan pembelajaran.',
          'Melatih guru menyusun instrumen penilaian yang sesuai dengan tujuan pembelajaran.',
        ]),
      }

    case 'pendidik': {
      const rasio = guru > 0 ? (siswa / guru).toFixed(1) : null
      return {
        capaian: [
          `Sekolah memiliki ${guru} guru dan tenaga kependidikan aktif untuk ${siswa} siswa${rasio ? ` (rata-rata ${rasio} siswa per guru)` : ''}.`,
          bk?.pembinaan ? `Pembinaan guru telah dilaksanakan sebanyak ${bk.pembinaan} kali.` : '[lengkapi: kualifikasi pendidikan dan pelatihan guru]',
        ].join('\n'),
        bukti: 'Data guru dan tenaga kependidikan, SK pembagian tugas, laporan supervisi akademik, evaluasi kinerja guru, dan sertifikat pelatihan.',
        rencana: daftarBernomor([
          'Mengikutsertakan guru dalam pelatihan dan komunitas belajar sesuai kebutuhan hasil supervisi.',
          'Mengusulkan penambahan guru atau tenaga kependidikan bila masih ada kekurangan.',
          'Menjaga pembagian tugas yang adil sesuai kompetensi dan beban kerja.',
        ]),
      }
    }

    case 'sarpras':
      return {
        capaian: [
          `Sarana dan prasarana digunakan untuk melayani ${siswa} siswa dalam ${rombel} rombongan belajar.`,
          '[lengkapi: kondisi ruang kelas, perpustakaan, sanitasi, dan alat peraga]',
        ].join('\n'),
        bukti: 'Buku Inventaris, daftar kondisi ruang dan barang, serta foto sarana dan prasarana.',
        rencana: daftarBernomor([
          'Memutakhirkan Buku Inventaris dan memeriksa kondisi barang secara berkala.',
          'Mengusulkan perbaikan atau pengadaan sarana prioritas melalui RKAS.',
          'Melibatkan warga sekolah dalam perawatan lingkungan dan fasilitas.',
        ]),
      }

    case 'pengelolaan':
      return {
        capaian: [
          visiMisi?.visi ? 'Visi, misi, dan tujuan sekolah telah dirumuskan.' : '[lengkapi: perencanaan sekolah (visi, misi, RKT)]',
          namaProgram.length ? `Buku Kerja Kepala Sekolah memuat ${namaProgram.length} program kerja.` : '[lengkapi: program kerja kepala sekolah]',
          bk?.jurnal ? `Jurnal kegiatan kepala sekolah tercatat ${bk.jurnal} entri.` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        bukti: 'Dokumen KOSP, RKT, RKAS, Buku Kerja Kepala Sekolah, notulen rapat, dan laporan bulanan.',
        rencana: daftarBernomor([
          'Menyusun RKT dan RKAS berdasarkan hasil evaluasi diri sekolah.',
          'Mengadakan rapat evaluasi program secara berkala dan mencatatnya dalam notulen.',
          'Meningkatkan keterlibatan komite sekolah dalam perencanaan dan pengawasan program.',
        ]),
      }

    case 'pembiayaan': {
      const baris = []
      if (totalAnggaran > 0) {
        baris.push(
          `Pada tahun anggaran ${tahunAnggaran}, anggaran sekolah sebesar ${rupiah(totalAnggaran)} dengan realisasi belanja ${rupiah(totalRealisasi)}${persen != null ? ` (${persen.toFixed(1)}% dari anggaran)` : ''}.`
        )
      } else {
        baris.push(`[lengkapi: anggaran dan realisasi tahun ${tahunAnggaran}; data ARKAS belum terbaca]`)
      }
      if (keu?.penerimaan != null) baris.push(`Total penerimaan dana yang tercatat di BKU sebesar ${rupiah(keu.penerimaan)}.`)
      const terbesar = [...(keu?.perKelompok || [])].sort((a, b) => (b.anggaran || 0) - (a.anggaran || 0)).slice(0, 3)
      if (terbesar.length) baris.push(`Alokasi terbesar: ${terbesar.map((g) => `${g.label} (${rupiah(g.anggaran)})`).join('; ')}.`)

      const rencana = ['Menyusun RKAS yang bersumber dari hasil evaluasi diri dan prioritas peningkatan mutu.']
      if (persen != null && persen < 70) rencana.unshift('Mempercepat serapan anggaran sesuai jadwal kegiatan di RKAS.')
      else rencana.push('Menjaga ketepatan waktu dan ketertiban pencatatan realisasi di BKU.')
      rencana.push('Mengumumkan penggunaan dana BOSP kepada warga sekolah dan komite secara transparan.')

      return {
        capaian: baris.join('\n'),
        bukti: `Dokumen ARKAS/RKAS ${tahunAnggaran}, Buku Kas Umum (BKU) ${tahunAnggaran}, bukti pengeluaran (kuitansi/nota), dan laporan penggunaan dana.`,
        rencana: daftarBernomor(rencana),
      }
    }

    default:
      return null
  }
}

const KOLOM = ['capaian', 'bukti', 'rencana']
const kosong = (v) => !String(v || '').trim()

export default function EdsOtomatis({ sekolahId, tanggal, standar, nilai, onTerapkan, otomatis = true }) {
  const ks = useKeadaanSekolah(sekolahId)
  const bukuKerja = useDokumenTersimpan({ sekolahId, dokumen: 'buku-kerja', buatBawaan: bawaanBukuKerja })
  const [visiMisi, setVisiMisi] = useState(null)
  const [keu, setKeu] = useState(KEUANGAN_LPJ_KOSONG)
  const [timpa, setTimpa] = useState(false)
  const [pesan, setPesan] = useState('')

  const tahunAnggaran = useMemo(() => {
    const y = tanggal ? new Date(tanggal).getFullYear() : NaN
    return Number.isFinite(y) && y > 2000 ? y : new Date().getFullYear()
  }, [tanggal])

  useEffect(() => {
    if (!sekolahId) return
    supabase
      .from('visi_misi_sekolah')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => data && setVisiMisi(data))
  }, [sekolahId])

  useEffect(() => {
    if (!sekolahId) return
    let batal = false
    muatKeuanganTahun(sekolahId, tahunAnggaran).then((h) => !batal && setKeu(h))
    return () => {
      batal = true
    }
  }, [sekolahId, tahunAnggaran])

  const bk = useMemo(() => {
    const x = bukuKerja.data || {}
    return {
      jurnal: (x.jurnal || []).filter((r) => r.kegiatan?.trim()).length,
      program: (x.program || []).filter((r) => r.program?.trim()),
      pembinaan: (x.pembinaan || []).filter((r) => r.topik?.trim()).length,
    }
  }, [bukuKerja.data])

  const kunci = kenaliStandar(standar)
  const siap = !ks.memuat && !bukuKerja.memuat && keu.dimuat
  const drafSekarang = useMemo(
    () => (kunci && siap ? susunDrafEds(kunci, { ks, keu, bk, visiMisi, tahunAnggaran }) : null),
    [kunci, siap, ks, keu, bk, visiMisi, tahunAnggaran]
  )

  // Draf terakhir yang kita isikan sendiri; dipakai agar ganti Standar boleh mengganti draf lama
  // selama pengguna belum mengubahnya.
  const drafTerakhir = useRef(null)

  function terapkan(paksa) {
    if (!drafSekarang) return
    const patch = {}
    for (const k of KOLOM) {
      const sebelumnya = drafTerakhir.current?.[k]
      const masihDraf = sebelumnya != null && nilai?.[k] === sebelumnya
      if (paksa || kosong(nilai?.[k]) || masihDraf) patch[k] = drafSekarang[k]
    }
    if (Object.keys(patch).length) {
      onTerapkan(patch)
      drafTerakhir.current = { ...(drafTerakhir.current || {}), ...patch }
    }
    return Object.keys(patch).length
  }

  // Otomatis: setiap Standar berganti (dan data siap), isi bagian yang masih kosong / masih draf lama.
  useEffect(() => {
    if (!otomatis || !drafSekarang) return
    terapkan(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci, siap])

  function klik() {
    const n = terapkan(timpa)
    setPesan(n ? 'Draf diisi. Periksa dan lengkapi bagian bertanda [lengkapi: ...].' : 'Semua kolom sudah terisi. Centang "Timpa isian" untuk menggantinya.')
  }

  return (
    <div className="my-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={klik}
          disabled={!kunci || !siap}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
        >
          {siap ? <Sparkles size={14} /> : <Loader2 size={14} className="animate-spin" />}
          Isi draf dari data sekolah
        </button>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={timpa} onChange={(e) => setTimpa(e.target.checked)} />
          Timpa isian
        </label>
        {!standar && <span className="text-slate-500">Pilih Standar terlebih dahulu.</span>}
        {standar && !kunci && <span className="text-amber-700">Standar ini belum dikenali; isi manual.</span>}
      </div>
      {pesan && (
        <p role="status" className="mt-1.5 text-[11px] text-slate-600">
          {pesan}
        </p>
      )}
    </div>
  )
}
