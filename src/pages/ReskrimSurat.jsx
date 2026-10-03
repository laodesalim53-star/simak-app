import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'
import KopSurat from '../components/KopSurat'
import { useAuth } from '../lib/AuthContext'
import { ArrowLeft, Ban, FilePlus, Loader2, Printer, Save, Search } from 'lucide-react'

// Laman Reskrim - Surat-menyurat otomatis (tenant Polres).
// Surat terisi otomatis dari data perkara (perkara_reskrim, pihak_perkara,
// barang_bukti_perkara, riwayat_perkara). Nomor surat dibuat otomatis oleh
// database lewat fungsi buat_surat_reskrim (lihat reskrim_surat.sql): urutan
// per satuan, per jenis surat, per tahun. Surat tidak bisa dihapus, hanya
// dibatalkan, sehingga nomor tidak pernah dipakai ulang.
//
// Redaksi tiap jenis surat hanya titik awal. Cocokkan dengan tata naskah dinas
// satuan Anda; semua isian bisa diedit sebelum surat disimpan dan dicetak.

const BUCKET_POLRES = 'profil-polres'

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

// Sama dengan STATUS di ReskrimPenyidik.jsx (hanya label).
const STATUS_LABEL = {
  lidik: 'Penyelidikan', sidik: 'Penyidikan', tahap1: 'Berkas Tahap I',
  p19: 'P-19 (Berkas Dikembalikan)', p21: 'P-21 (Berkas Lengkap)', tahap2: 'Tahap II',
  sp3: 'SP3', rj: 'Restorative Justice', selesai: 'Selesai',
}

const PENUTUP_DEFAULT =
  'Demikian yang dapat kami sampaikan untuk diketahui dan ditindaklanjuti, sebelumnya kami sampaikan terima kasih.'

/* ------------------------------ helper ------------------------------ */
const hariIni = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const parse = (v) => new Date(v + (v.length === 10 ? 'T00:00:00' : ''))
const tglPanjang = (v) =>
  v ? parse(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '........'
const hariTanggal = (v) =>
  v
    ? parse(v).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '........'
const tglPendek = (v) =>
  v ? parse(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

function renderTebal(teks) {
  return teks.split('**').map((bagian, i) =>
    i % 2 === 1 ? <strong key={i}>{bagian}</strong> : <span key={i}>{bagian}</span>
  )
}

const barisPangkatNrp = (pangkat, nrp) =>
  `${pangkat ? pangkat + ' ' : ''}NRP ${nrp || '..............................'}`

function susunNomor({ prefix, urut, bulan, klasifikasi, tahun, kode }) {
  return [prefix, urut, ROMAWI[bulan - 1], klasifikasi, tahun, kode]
    .filter((x) => x !== '' && x != null)
    .join('/')
}

/* --------------------------- templat surat --------------------------- */
const rujukanLp = (p) => `Laporan Polisi Nomor: ${p.nomor_lp} tanggal ${tglPanjang(p.tanggal_lp)}`
const tentangPerkara = (p) => `${p.jenis_perkara || '........'}${p.pasal ? ` (${p.pasal})` : ''}`
const namaTersangka = (pihak) => {
  const n = pihak.filter((x) => x.jenis === 'tersangka').map((x) => x.nama)
  return n.length ? n.join(', ') : '........'
}
const tkp = (p) =>
  `${p.tanggal_kejadian ? ` yang terjadi pada ${tglPanjang(p.tanggal_kejadian)}` : ''}${p.tempat_kejadian ? ` di ${p.tempat_kejadian}` : ''}`
const tujuanKejari = (kab) => `Kepala Kejaksaan Negeri${kab ? ` ${kab}` : ''}`
const diKota = (kota) => (kota ? `di ${kota}` : '')

const TAHAP_BERKAS = [
  { k: 'tahap1', l: 'Tahap I (pengiriman berkas perkara)' },
  { k: 'p19', l: 'Pengiriman kembali berkas (setelah P-19)' },
  { k: 'tahap2', l: 'Tahap II (penyerahan tersangka dan barang bukti)' },
]

const JENIS_SURAT = {
  spdp: {
    label: 'SPDP - Pemberitahuan Dimulainya Penyidikan',
    prefix: 'B',
    susun: ({ perkara: p, pihak, profil, kab, tempat }) => ({
      lampiran: '1 (satu) berkas',
      perihal: 'Pemberitahuan dimulainya penyidikan\n(SPDP)',
      tujuan: tujuanKejari(kab),
      cq: 'Kepala Seksi Tindak Pidana Umum',
      kotaTujuan: diKota(tempat),
      isi:
        `Rujukan:\n1. ${rujukanLp(p)};\n2. Surat Perintah Penyidikan Nomor: ${p.nomor_sprindik || '........'} tanggal ${tglPanjang(p.tanggal_sprindik)}.\n\n` +
        `Sehubungan dengan rujukan tersebut di atas, bersama ini kami beritahukan bahwa penyidik ${profil?.nama_satuan || 'Polres'} telah memulai penyidikan tindak pidana **${tentangPerkara(p)}**${tkp(p)}, dengan terlapor/tersangka **${namaTersangka(pihak)}**.`,
      penutup: 'Demikian untuk menjadi maklum.',
      tembusan: '',
    }),
  },
  sp2hp: {
    label: 'SP2HP - Pemberitahuan Perkembangan Hasil Penyidikan',
    prefix: 'SP2HP',
    susun: ({ perkara: p, riwayat, tempat, sp2hpKe }) => ({
      lampiran: '-',
      perihal: `Surat Pemberitahuan Perkembangan Hasil Penyidikan (SP2HP) ke-${sp2hpKe}`,
      tujuan: `Sdr. ${p.pelapor || '........'}`,
      cq: '',
      kotaTujuan: diKota(tempat),
      isi:
        `Rujukan: ${rujukanLp(p)}.\n\n` +
        `Menindaklanjuti laporan Saudara tersebut, bersama ini kami beritahukan perkembangan penanganan perkara **${tentangPerkara(p)}** sebagai berikut: perkara berada pada tahap **${STATUS_LABEL[p.status] || p.status}**` +
        `${riwayat ? ` (${riwayat.tahapan}, ${tglPanjang(riwayat.tanggal)}${riwayat.catatan ? `: ${riwayat.catatan}` : ''})` : ''}.\n\n` +
        `Penyidik yang menangani: ${[p.penyidik, p.unit].filter(Boolean).join(', ') || '........'}. Penyidik akan terus mengupayakan penyelesaian perkara sesuai ketentuan yang berlaku dan menyampaikan perkembangan berikutnya.`,
      penutup: 'Demikian untuk menjadi maklum.',
      tembusan: '',
    }),
  },
  panggilan: {
    label: 'Surat Panggilan (saksi / tersangka / korban / ahli)',
    prefix: 'S.Pgl',
    susun: ({ perkara: p, pihak, ekstra }) => {
      const dipanggil = pihak.find((x) => x.id === ekstra.pihakId)
      const sebagai = dipanggil ? dipanggil.jenis : 'saksi'
      return {
        lampiran: '-',
        perihal: `Panggilan sebagai ${sebagai}`,
        tujuan: `Sdr. ${dipanggil?.nama || '........'}`,
        cq: '',
        kotaTujuan: dipanggil?.alamat || '',
        isi:
          `Sehubungan dengan penyidikan tindak pidana **${tentangPerkara(p)}** sebagaimana ${rujukanLp(p)}, dengan ini kami minta Saudara hadir guna didengar keterangannya sebagai **${sebagai}** pada:\n\n` +
          `Mohon Saudara membawa kartu identitas dan surat panggilan ini.`,
        penutup: 'Atas perhatian dan kehadiran Saudara, kami ucapkan terima kasih.',
        tembusan: '',
      }
    },
  },
  pengantar_berkas: {
    label: 'Pengantar Berkas Perkara ke Kejaksaan',
    prefix: 'B',
    susun: ({ perkara: p, pihak, bbCount, kab, tempat, ekstra }) => {
      const nama = namaTersangka(pihak)
      const lp = `Rujukan: ${rujukanLp(p)}.\n\n`
      let isi
      if (ekstra.tahap === 'p19') {
        isi = `${lp}Bersama ini kami kirimkan kembali berkas perkara atas nama tersangka **${nama}** (${tentangPerkara(p)}) yang telah dilengkapi sesuai petunjuk Jaksa Penuntut Umum (P-19) Nomor: ........ tanggal ........, guna dilakukan penelitian dan proses selanjutnya.`
      } else if (ekstra.tahap === 'tahap2') {
        isi = `${lp}Bersama ini kami serahkan tersangka **${nama}** beserta ${bbCount > 0 ? `${bbCount} jenis ` : ''}barang bukti dalam perkara **${tentangPerkara(p)}** (Tahap II), guna dilakukan proses selanjutnya sesuai ketentuan yang berlaku.`
      } else {
        isi = `${lp}Bersama ini kami kirimkan berkas perkara atas nama tersangka **${nama}** (${tentangPerkara(p)}) beserta kelengkapannya, guna dilakukan penelitian dan proses selanjutnya sesuai ketentuan yang berlaku.`
      }
      return {
        lampiran: '1 (satu) berkas',
        perihal: `${ekstra.tahap === 'tahap2' ? 'Penyerahan tersangka dan barang bukti' : 'Pengiriman berkas perkara'}\na.n. tersangka ${nama}`,
        tujuan: tujuanKejari(kab),
        cq: 'Kepala Seksi Tindak Pidana Umum',
        kotaTujuan: diKota(tempat),
        isi,
        penutup: PENUTUP_DEFAULT,
        tembusan: '',
      }
    },
  },
  lainnya: {
    label: 'Surat Lainnya (isi sendiri)',
    prefix: 'B',
    susun: () => ({
      lampiran: '-', perihal: '', tujuan: '', cq: '', kotaTujuan: '', isi: '',
      penutup: PENUTUP_DEFAULT, tembusan: '',
    }),
  },
}

const KOSONG_TEMPLAT = {
  lampiran: '-', perihal: '', tujuan: '', cq: '', kotaTujuan: '', isi: '',
  penutup: PENUTUP_DEFAULT, tembusan: '',
}

const EKSTRA_KOSONG = { pihakId: '', hariTgl: '', jam: '', tempat: '', menghadap: '', tahap: 'tahap1' }
const RINCI_KOSONG = { pihak: [], riwayat: null, bbCount: 0, surat: [] }

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-500'
const labelCls = 'block text-xs font-medium text-slate-600 mb-1'

/* ------------------------------ halaman ------------------------------ */
export default function ReskrimSurat() {
  const navigate = useNavigate()
  const { sekolahId, isPolres } = useAuth()

  const [tab, setTab] = useState('buat') // 'buat' | 'register'
  const [profil, setProfil] = useState(null)
  const [perkaraList, setPerkaraList] = useState([])
  const [cariPerkara, setCariPerkara] = useState('')
  const [perkaraId, setPerkaraId] = useState('')
  const [jenis, setJenis] = useState('spdp')
  const [rinci, setRinci] = useState(RINCI_KOSONG)
  const [ekstra, setEkstra] = useState(EKSTRA_KOSONG)
  const [memuat, setMemuat] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    tanggal: hariIni(), prefix: JENIS_SURAT.spdp.prefix, klasifikasi: '', kode: 'Reskrim',
    sifat: 'Biasa', ...KOSONG_TEMPLAT,
  })
  const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const ubahEkstra = (k) => (e) => setEkstra((x) => ({ ...x, [k]: e.target.value }))

  const [penandatangan, setPenandatangan] = useState('manual') // 'kapolres' | 'arsip' | 'manual'
  const [ttdManual, setTtdManual] = useState({ jabatan: '', nama: '', pangkat: '', nrp: '' })
  const [ttdDiubah, setTtdDiubah] = useState(false)

  const [suratAktif, setSuratAktif] = useState(null) // baris surat_reskrim yang sudah tersimpan
  const [register, setRegister] = useState([])
  const [loadingRegister, setLoadingRegister] = useState(false)
  const [cariRegister, setCariRegister] = useState('')
  const [filterJenis, setFilterJenis] = useState('')

  const kunciTtd = `reskrim_surat_ttd:${sekolahId}`
  const kab = (profil?.kabupaten_kota || '').replace(/^(kabupaten|kota)\s+/i, '').trim()
  const tempatSurat = profil?.tempat_ttd || profil?.kabupaten_kota || ''
  const namaResor = (profil?.nama_satuan || '').replace(/^(polres|resor)\s+/i, '').trim()

  /* --- muat profil + daftar perkara --- */
  useEffect(() => {
    if (!sekolahId || !isPolres) return
    supabase
      .from('profil_polres')
      .select(
        'nama_satuan, polda, kabupaten_kota, kapolres, pangkat_kapolres, nrp_kapolres, tempat_ttd, ttd_kapolres_path, jabatan_pejabat_arsip, pejabat_arsip, pangkat_pejabat_arsip, nrp_pejabat_arsip'
      )
      .eq('sekolah_id', sekolahId)
      .maybeSingle()
      .then(({ data }) => setProfil(data))

    supabase
      .from('perkara_reskrim')
      .select('id, nomor_lp, tanggal_lp, jenis_perkara, pasal, pelapor, penyidik, unit, status, nomor_sprindik, tanggal_sprindik, tempat_kejadian, tanggal_kejadian')
      .eq('sekolah_id', sekolahId)
      .order('tanggal_lp', { ascending: false, nullsFirst: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) alert('Gagal memuat daftar perkara: ' + error.message)
        setPerkaraList(data || [])
      })
  }, [sekolahId, isPolres])

  // Penandatangan manual: ingat per perangkat; default jabatan Kasat Reskrim a.n. Kapolres.
  useEffect(() => {
    if (!sekolahId) return
    let tersimpan = null
    try { tersimpan = JSON.parse(localStorage.getItem(kunciTtd) || 'null') } catch { /* abaikan */ }
    setTtdManual(
      tersimpan || {
        jabatan: namaResor
          ? `A.n. KEPALA KEPOLISIAN RESOR ${namaResor.toUpperCase()}\nKEPALA SATUAN RESERSE KRIMINAL`
          : 'KEPALA SATUAN RESERSE KRIMINAL',
        nama: '', pangkat: '', nrp: '',
      }
    )
  }, [sekolahId, namaResor]) // eslint-disable-line react-hooks/exhaustive-deps

  const ubahTtd = (k) => (e) => {
    setTtdDiubah(true)
    setTtdManual((t) => {
      const baru = { ...t, [k]: e.target.value }
      try { localStorage.setItem(kunciTtd, JSON.stringify(baru)) } catch { /* abaikan */ }
      return baru
    })
  }

  const perkara = perkaraList.find((p) => p.id === perkaraId) || null

  const perkaraTersaring = useMemo(() => {
    const q = cariPerkara.trim().toLowerCase()
    const hasil = q
      ? perkaraList.filter((p) =>
        [p.nomor_lp, p.jenis_perkara, p.pelapor, p.pasal].some((v) => v?.toLowerCase().includes(q)))
      : perkaraList
    return hasil.slice(0, 100)
  }, [perkaraList, cariPerkara])

  /* --- isi otomatis dari templat --- */
  function terapkan({ jenisBaru = jenis, perkaraBaru = perkara, rinciBaru = rinci, ekstraBaru = ekstra }) {
    const def = JENIS_SURAT[jenisBaru]
    if (!perkaraBaru || jenisBaru === 'lainnya') {
      setForm((f) => ({ ...f, sifat: 'Biasa', ...KOSONG_TEMPLAT }))
      return
    }
    const sp2hpKe = rinciBaru.surat.filter((s) => s.jenis === 'sp2hp' && s.status === 'aktif').length + 1
    const hasil = def.susun({
      perkara: perkaraBaru, pihak: rinciBaru.pihak, riwayat: rinciBaru.riwayat, bbCount: rinciBaru.bbCount,
      profil, kab, tempat: tempatSurat, ekstra: ekstraBaru, sp2hpKe,
    })
    setForm((f) => ({ ...f, sifat: 'Biasa', ...hasil }))
  }

  function ekstraDefault(jenisBaru, p, r) {
    const dipanggil = r.pihak.find((x) => x.jenis === 'saksi') || r.pihak[0]
    return {
      ...EKSTRA_KOSONG,
      pihakId: jenisBaru === 'panggilan' ? dipanggil?.id || '' : '',
      tempat: `Ruang Penyidik ${profil?.nama_satuan || ''}`.trim(),
      menghadap: p?.penyidik || '',
    }
  }

  async function muatRinci(id) {
    const [a, b, c, d] = await Promise.all([
      supabase.from('pihak_perkara').select('id, jenis, nama, alamat').eq('perkara_id', id).order('dibuat_pada'),
      supabase.from('riwayat_perkara').select('tahapan, tanggal, catatan').eq('perkara_id', id)
        .order('tanggal', { ascending: false }).order('dibuat_pada', { ascending: false }).limit(1),
      supabase.from('barang_bukti_perkara').select('id', { count: 'exact', head: true }).eq('perkara_id', id),
      supabase.from('surat_reskrim').select('jenis, status').eq('perkara_id', id),
    ])
    const err = a.error || b.error || c.error || d.error
    if (err) alert('Gagal memuat data perkara: ' + err.message)
    const r = { pihak: a.data || [], riwayat: b.data?.[0] || null, bbCount: c.count || 0, surat: d.data || [] }
    setRinci(r)
    return r
  }

  async function pilihPerkara(id) {
    setPerkaraId(id)
    if (suratAktif) return
    const p = perkaraList.find((x) => x.id === id) || null
    if (!id) {
      setRinci(RINCI_KOSONG)
      terapkan({ perkaraBaru: null, rinciBaru: RINCI_KOSONG })
      return
    }
    setMemuat(true)
    const r = await muatRinci(id)
    setMemuat(false)
    const ek = ekstraDefault(jenis, p, r)
    setEkstra(ek)
    terapkan({ perkaraBaru: p, rinciBaru: r, ekstraBaru: ek })
  }

  async function pilihJenis(j, paksa = false) {
    setJenis(j)
    if (suratAktif && !paksa) return
    // Nomor: pakai prefix/klasifikasi/kode dari surat terakhir jenis yang sama.
    const { data } = await supabase
      .from('surat_reskrim')
      .select('prefix, klasifikasi, kode_satuan')
      .eq('sekolah_id', sekolahId)
      .eq('jenis', j)
      .order('dibuat_pada', { ascending: false })
      .limit(1)
    const terakhir = data?.[0]
    setForm((f) => ({
      ...f,
      prefix: terakhir?.prefix ?? JENIS_SURAT[j].prefix,
      klasifikasi: terakhir?.klasifikasi ?? '',
      kode: terakhir?.kode_satuan ?? 'Reskrim',
    }))
    const ek = ekstraDefault(j, perkara, rinci)
    setEkstra(ek)
    terapkan({ jenisBaru: j, ekstraBaru: ek })
  }

  function pilihPihak(id) {
    const ek = { ...ekstra, pihakId: id }
    setEkstra(ek)
    if (!suratAktif) terapkan({ ekstraBaru: ek })
  }

  function pilihTahap(t) {
    const ek = { ...ekstra, tahap: t }
    setEkstra(ek)
    if (!suratAktif) terapkan({ ekstraBaru: ek })
  }

  /* --- penandatangan --- */
  const ttdHitung = useMemo(() => {
    if (penandatangan === 'kapolres') {
      return {
        sumber: 'kapolres',
        jabatan: `Kapolres ${namaResor}`.trim(),
        nama: profil?.kapolres || '..............................',
        baris: barisPangkatNrp(profil?.pangkat_kapolres, profil?.nrp_kapolres),
      }
    }
    if (penandatangan === 'arsip') {
      return {
        sumber: 'arsip',
        jabatan: profil?.jabatan_pejabat_arsip || '..............................',
        nama: profil?.pejabat_arsip || '..............................',
        baris: barisPangkatNrp(profil?.pangkat_pejabat_arsip, profil?.nrp_pejabat_arsip),
      }
    }
    return {
      sumber: 'manual',
      jabatan: ttdManual.jabatan || '..............................',
      nama: ttdManual.nama || '..............................',
      baris: barisPangkatNrp(ttdManual.pangkat, ttdManual.nrp),
    }
  }, [penandatangan, profil, ttdManual, namaResor])

  // Surat yang sudah tersimpan memakai cuplikan penandatangan saat dibuat,
  // kecuali penandatangannya sengaja diubah.
  const ttd = suratAktif && !ttdDiubah && suratAktif.penandatangan?.jabatan ? suratAktif.penandatangan : ttdHitung
  const ttdUrl =
    ttd.sumber === 'kapolres' && profil?.ttd_kapolres_path
      ? supabase.storage.from(BUCKET_POLRES).getPublicUrl(profil.ttd_kapolres_path).data.publicUrl
      : null

  /* --- nomor --- */
  const bulanSurat = Number(form.tanggal.slice(5, 7)) || 1
  const tahunSurat = Number(form.tanggal.slice(0, 4)) || new Date().getFullYear()
  const nomorTampil = suratAktif
    ? suratAktif.nomor
    : susunNomor({
      prefix: form.prefix.trim(), urut: '...', bulan: bulanSurat,
      klasifikasi: form.klasifikasi.trim(), tahun: tahunSurat, kode: form.kode.trim(),
    })

  /* --- simpan / ubah / batalkan --- */
  const payloadIsi = () => ({
    sifat: form.sifat || null, lampiran: form.lampiran || null, perihal: form.perihal || null,
    tujuan: form.tujuan || null, cq: form.cq || null, kota_tujuan: form.kotaTujuan || null,
    isi: form.isi || null, penutup: form.penutup || null, tembusan: form.tembusan || null,
  })

  async function simpanBaru() {
    if (saving) return
    if (jenis !== 'lainnya' && !perkaraId) return alert('Pilih perkara terlebih dahulu.')
    if (!form.perihal.trim() || !form.tujuan.trim()) return alert('Perihal dan tujuan surat wajib diisi.')
    setSaving(true)
    const { data, error } = await supabase.rpc('buat_surat_reskrim', {
      p_sekolah_id: sekolahId,
      p_perkara_id: perkaraId || null,
      p_jenis: jenis,
      p_tanggal: form.tanggal,
      p_prefix: form.prefix,
      p_klasifikasi: form.klasifikasi,
      p_kode: form.kode,
      p_sifat: form.sifat || null,
      p_lampiran: form.lampiran || null,
      p_perihal: form.perihal || null,
      p_tujuan: form.tujuan || null,
      p_cq: form.cq || null,
      p_kota_tujuan: form.kotaTujuan || null,
      p_isi: form.isi || null,
      p_penutup: form.penutup || null,
      p_tembusan: form.tembusan || null,
      p_penandatangan: ttdHitung,
      p_data: { ekstra, nomor_lp: perkara?.nomor_lp || null },
    })
    setSaving(false)
    if (error) return alert('Gagal menyimpan surat: ' + error.message)
    setSuratAktif(data)
    setTtdDiubah(false)
    if (perkaraId) muatRinci(perkaraId)
    muatRegister()
  }

  async function simpanPerubahan() {
    if (saving || !suratAktif) return
    setSaving(true)
    const { data, error } = await supabase
      .from('surat_reskrim')
      .update({
        ...payloadIsi(),
        penandatangan: ttdDiubah ? ttdHitung : suratAktif.penandatangan,
        data: { ...(suratAktif.data || {}), ekstra },
      })
      .eq('id', suratAktif.id)
      .select()
      .single()
    setSaving(false)
    if (error) return alert('Gagal menyimpan perubahan: ' + error.message)
    setSuratAktif(data)
    setTtdDiubah(false)
    muatRegister()
  }

  async function batalkan() {
    if (!suratAktif) return
    const alasan = prompt(`Batalkan surat ${suratAktif.nomor}?\nNomor tidak akan dipakai ulang. Alasan pembatalan:`)
    if (alasan === null) return
    const { data, error } = await supabase
      .from('surat_reskrim')
      .update({ status: 'batal', alasan_batal: alasan.trim() || null })
      .eq('id', suratAktif.id)
      .select()
      .single()
    if (error) return alert('Gagal membatalkan surat: ' + error.message)
    setSuratAktif(data)
    muatRegister()
  }

  function suratBaru() {
    setSuratAktif(null)
    setTtdDiubah(false)
    setForm((f) => ({ ...f, tanggal: hariIni() }))
    pilihJenis(jenis, true)
  }

  /* --- register surat --- */
  async function muatRegister() {
    if (!sekolahId) return
    setLoadingRegister(true)
    const { data, error } = await supabase
      .from('surat_reskrim')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('dibuat_pada', { ascending: false })
      .limit(300)
    setLoadingRegister(false)
    if (error) return alert('Gagal memuat register surat: ' + error.message)
    setRegister(data || [])
  }
  useEffect(() => {
    if (isPolres && sekolahId) muatRegister()
  }, [sekolahId, isPolres]) // eslint-disable-line react-hooks/exhaustive-deps

  const registerTersaring = useMemo(() => {
    const q = cariRegister.trim().toLowerCase()
    return register.filter((s) => {
      if (filterJenis && s.jenis !== filterJenis) return false
      if (!q) return true
      return [s.nomor, s.perihal, s.tujuan, s.data?.nomor_lp].some((v) => v?.toLowerCase().includes(q))
    })
  }, [register, cariRegister, filterJenis])

  function bukaSurat(s) {
    setSuratAktif(s)
    setTtdDiubah(false)
    setJenis(s.jenis)
    setPerkaraId(s.perkara_id || '')
    setForm({
      tanggal: s.tanggal, prefix: s.prefix || '', klasifikasi: s.klasifikasi || '', kode: s.kode_satuan || '',
      sifat: s.sifat || '', lampiran: s.lampiran || '', perihal: s.perihal || '', tujuan: s.tujuan || '',
      cq: s.cq || '', kotaTujuan: s.kota_tujuan || '', isi: s.isi || '', penutup: s.penutup || '',
      tembusan: s.tembusan || '',
    })
    setEkstra({ ...EKSTRA_KOSONG, ...(s.data?.ekstra || {}) })
    if (s.penandatangan?.sumber) setPenandatangan(s.penandatangan.sumber)
    if (s.perkara_id) muatRinci(s.perkara_id)
    else setRinci(RINCI_KOSONG)
    setTab('buat')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const terkunci = Boolean(suratAktif)
  const batal = suratAktif?.status === 'batal'
  const boleCetak = suratAktif && !batal
  const paragrafIsi = form.isi.split(/\n\s*\n/).filter((p) => p.trim())
  const dipanggil = rinci.pihak.find((x) => x.id === ekstra.pihakId)

  if (!isPolres) {
    return (
      <Layout title="Surat Reskrim">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
          Laman ini hanya tersedia untuk satuan Polres.
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Surat Reskrim" subtitle="Surat terisi otomatis dari data perkara, nomor surat dibuat otomatis.">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="flex gap-2">
          {['buat', 'register'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                tab === t ? 'bg-amber-50 border-amber-400 text-amber-800 font-medium' : 'border-slate-200 text-slate-600'
              }`}
            >
              {t === 'buat' ? 'Buat Surat' : `Register Surat (${register.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ============ REGISTER SURAT ============ */}
      {tab === 'register' && (
        <div className="no-print bg-white rounded-2xl border border-slate-100 p-5 mx-auto" style={{ maxWidth: '260mm' }}>
          <div className="flex flex-wrap gap-3 items-end mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className={labelCls}>Cari (nomor surat, perihal, tujuan, nomor LP)</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-9`} value={cariRegister} onChange={(e) => setCariRegister(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Jenis</label>
              <select className={inputCls} value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}>
                <option value="">Semua</option>
                {Object.entries(JENIS_SURAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {loadingRegister ? (
            <div className="p-6 text-center text-slate-500"><Loader2 size={18} className="animate-spin inline mr-2" />Memuat...</div>
          ) : registerTersaring.length === 0 ? (
            <p className="text-sm text-slate-500 p-4 text-center">Belum ada surat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3 font-medium">Nomor</th>
                    <th className="py-2 pr-3 font-medium">Jenis / Perihal</th>
                    <th className="py-2 pr-3 font-medium">Tujuan</th>
                    <th className="py-2 pr-3 font-medium">Tanggal</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registerTersaring.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 align-top cursor-pointer hover:bg-slate-50" onClick={() => bukaSurat(s)}>
                      <td className="py-2 pr-3 font-medium break-all">{s.nomor}</td>
                      <td className="py-2 pr-3">
                        <div>{JENIS_SURAT[s.jenis]?.label.split(' - ')[0] || s.jenis}</div>
                        <div className="text-xs text-slate-500 whitespace-pre-line">{s.perihal}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{s.tujuan}</div>
                        {s.data?.nomor_lp && <div className="text-xs text-slate-500 break-all">LP: {s.data.nomor_lp}</div>}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{tglPendek(s.tanggal)}</td>
                      <td className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === 'batal' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {s.status === 'batal' ? 'Dibatalkan' : 'Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ BUAT / UBAH SURAT ============ */}
      {tab === 'buat' && (
        <>
          <div className="no-print bg-white rounded-2xl border border-slate-100 p-5 mb-6 mx-auto" style={{ maxWidth: '210mm' }}>
            {suratAktif && (
              <div className={`mb-4 rounded-lg px-3 py-2 text-sm border ${
                batal ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {batal ? 'Surat DIBATALKAN' : 'Surat tersimpan'}: <strong>{suratAktif.nomor}</strong>
                {batal && suratAktif.alasan_batal ? ` - ${suratAktif.alasan_batal}` : ''}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Jenis surat</label>
                <select className={inputCls} value={jenis} disabled={terkunci} onChange={(e) => pilihJenis(e.target.value)}>
                  {Object.entries(JENIS_SURAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Perkara {jenis === 'lainnya' ? '(opsional)' : ''}</label>
                <div className="relative mb-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9`}
                    placeholder="Cari nomor LP, jenis perkara, pelapor, pasal"
                    value={cariPerkara}
                    disabled={terkunci}
                    onChange={(e) => setCariPerkara(e.target.value)}
                  />
                </div>
                <select className={inputCls} value={perkaraId} disabled={terkunci} onChange={(e) => pilihPerkara(e.target.value)}>
                  <option value="">- pilih perkara -</option>
                  {perkaraTersaring.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nomor_lp} - {p.jenis_perkara || 'perkara'} ({tglPendek(p.tanggal_lp)})
                    </option>
                  ))}
                </select>
                {memuat && <p className="text-xs text-slate-500 mt-1"><Loader2 size={12} className="animate-spin inline mr-1" />Memuat data perkara...</p>}
              </div>

              {jenis === 'panggilan' && (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Pihak yang dipanggil</label>
                    <select className={inputCls} value={ekstra.pihakId} onChange={(e) => pilihPihak(e.target.value)}>
                      <option value="">- pilih -</option>
                      {rinci.pihak.map((x) => <option key={x.id} value={x.id}>{x.nama} ({x.jenis})</option>)}
                    </select>
                    {perkaraId && rinci.pihak.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1">Perkara ini belum punya data pihak. Tambahkan di halaman Penyidik.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Hari / tanggal menghadap</label>
                    <input type="date" className={inputCls} value={ekstra.hariTgl} onChange={ubahEkstra('hariTgl')} />
                  </div>
                  <div>
                    <label className={labelCls}>Pukul</label>
                    <input className={inputCls} placeholder="mis. 09.00 WIT" value={ekstra.jam} onChange={ubahEkstra('jam')} />
                  </div>
                  <div>
                    <label className={labelCls}>Tempat</label>
                    <input className={inputCls} value={ekstra.tempat} onChange={ubahEkstra('tempat')} />
                  </div>
                  <div>
                    <label className={labelCls}>Menghadap</label>
                    <input className={inputCls} value={ekstra.menghadap} onChange={ubahEkstra('menghadap')} />
                  </div>
                </>
              )}

              {jenis === 'pengantar_berkas' && (
                <div className="sm:col-span-2">
                  <label className={labelCls}>Tahap pengiriman</label>
                  <select className={inputCls} value={ekstra.tahap} onChange={(e) => pilihTahap(e.target.value)}>
                    {TAHAP_BERKAS.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Penomoran */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
              <div>
                <label className={labelCls}>Tanggal surat</label>
                <input type="date" className={inputCls} value={form.tanggal} disabled={terkunci} onChange={ubah('tanggal')} />
              </div>
              <div>
                <label className={labelCls}>Awalan nomor</label>
                <input className={inputCls} value={form.prefix} disabled={terkunci} onChange={ubah('prefix')} />
              </div>
              <div>
                <label className={labelCls}>Kode klasifikasi</label>
                <input className={inputCls} value={form.klasifikasi} disabled={terkunci} onChange={ubah('klasifikasi')} />
              </div>
              <div>
                <label className={labelCls}>Kode satuan</label>
                <input className={inputCls} value={form.kode} disabled={terkunci} onChange={ubah('kode')} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Nomor surat: <span className="font-medium text-slate-700">{nomorTampil}</span>
              {!terkunci && ' (nomor urut diberikan otomatis saat disimpan)'}
              {terkunci && ' (nomor sudah terkunci)'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Sifat</label>
                <input className={inputCls} value={form.sifat} onChange={ubah('sifat')} />
              </div>
              <div>
                <label className={labelCls}>Lampiran</label>
                <input className={inputCls} value={form.lampiran} onChange={ubah('lampiran')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Perihal (Enter untuk baris baru)</label>
                <textarea rows={2} className={inputCls} value={form.perihal} onChange={ubah('perihal')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Yth. (tujuan surat)</label>
                <input className={inputCls} value={form.tujuan} onChange={ubah('tujuan')} />
              </div>
              <div>
                <label className={labelCls}>Cq.</label>
                <input className={inputCls} value={form.cq} onChange={ubah('cq')} />
              </div>
              <div>
                <label className={labelCls}>Alamat / kota tujuan</label>
                <input className={inputCls} value={form.kotaTujuan} onChange={ubah('kotaTujuan')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Isi surat (paragraf dipisah baris kosong; **teks** = tebal)</label>
                <textarea rows={8} className={inputCls} value={form.isi} onChange={ubah('isi')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Kalimat penutup</label>
                <textarea rows={2} className={inputCls} value={form.penutup} onChange={ubah('penutup')} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Tembusan (satu baris per tujuan; kosongkan bila tidak ada)</label>
                <textarea rows={2} className={inputCls} value={form.tembusan} onChange={ubah('tembusan')} />
              </div>
            </div>

            {/* Penandatangan */}
            <div className="border-t border-slate-100 pt-3 mb-4">
              <label className={labelCls}>Penandatangan</label>
              <select
                className={inputCls}
                value={penandatangan}
                onChange={(e) => { setPenandatangan(e.target.value); setTtdDiubah(true) }}
              >
                <option value="manual">Isi manual (mis. Kasat Reskrim a.n. Kapolres)</option>
                <option value="kapolres">Kapolres (dari Profil Polres, dengan gambar tanda tangan)</option>
                <option value="arsip">Pejabat pengesah arsip (dari Profil Polres)</option>
              </select>
              {penandatangan === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Jabatan (Enter untuk baris baru)</label>
                    <textarea rows={2} className={inputCls} value={ttdManual.jabatan} onChange={ubahTtd('jabatan')} />
                  </div>
                  <div>
                    <label className={labelCls}>Nama</label>
                    <input className={inputCls} value={ttdManual.nama} onChange={ubahTtd('nama')} />
                  </div>
                  <div>
                    <label className={labelCls}>Pangkat</label>
                    <input className={inputCls} value={ttdManual.pangkat} onChange={ubahTtd('pangkat')} />
                  </div>
                  <div>
                    <label className={labelCls}>NRP</label>
                    <input className={inputCls} value={ttdManual.nrp} onChange={ubahTtd('nrp')} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {suratAktif && (
                <button type="button" onClick={suratBaru} className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-700 text-sm px-3 py-2 rounded-lg hover:bg-slate-50">
                  <FilePlus size={16} /> Surat Baru
                </button>
              )}
              {suratAktif && !batal && (
                <button type="button" onClick={batalkan} className="inline-flex items-center gap-1.5 border border-rose-200 text-rose-700 text-sm px-3 py-2 rounded-lg hover:bg-rose-50">
                  <Ban size={16} /> Batalkan Surat
                </button>
              )}
              {!suratAktif && (
                <button type="button" onClick={simpanBaru} disabled={saving || memuat}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan &amp; Beri Nomor
                </button>
              )}
              {suratAktif && !batal && (
                <button type="button" onClick={simpanPerubahan} disabled={saving}
                  className="inline-flex items-center gap-1.5 border border-amber-300 text-amber-800 text-sm px-3 py-2 rounded-lg hover:bg-amber-50 disabled:opacity-60">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Simpan Perubahan
                </button>
              )}
              <button type="button" onClick={() => window.print()} disabled={!boleCetak}
                title={boleCetak ? '' : 'Simpan surat dulu agar mendapat nomor, baru cetak'}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg">
                <Printer size={16} /> Cetak
              </button>
            </div>
            {!suratAktif && (
              <p className="text-xs text-slate-400 mt-2 text-right">
                Surat baru bisa dicetak setelah disimpan, supaya setiap surat yang keluar tercatat di register.
              </p>
            )}
          </div>

          {/* ============ LEMBAR SURAT ============ */}
          <div
            className="lembar-cetak print-only bg-white rounded-2xl border border-slate-100 mx-auto relative"
            style={{
              width: '210mm', padding: '15mm 20mm', fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt', color: '#0f172a',
            }}
          >
            {batal && (
              <div className="no-print absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-6xl font-bold text-rose-300 -rotate-12 border-4 border-rose-300 px-4 py-1">DIBATALKAN</span>
              </div>
            )}
            <KopSurat />

            <div className="flex justify-between gap-4">
              <table className="border-collapse">
                <tbody>
                  <tr><td className="pr-2 align-top w-24">Nomor</td><td className="pr-2 align-top">:</td><td className="align-top">{nomorTampil}</td></tr>
                  <tr><td className="pr-2 align-top">Sifat</td><td className="pr-2 align-top">:</td><td className="align-top">{form.sifat || '-'}</td></tr>
                  <tr><td className="pr-2 align-top">Lampiran</td><td className="pr-2 align-top">:</td><td className="align-top">{form.lampiran || '-'}</td></tr>
                  <tr><td className="pr-2 align-top">Perihal</td><td className="pr-2 align-top">:</td><td className="align-top whitespace-pre-line">{form.perihal}</td></tr>
                </tbody>
              </table>
              <p className="shrink-0 whitespace-nowrap">
                {tempatSurat ? `${tempatSurat}, ` : ''}{tglPanjang(form.tanggal)}
              </p>
            </div>

            <div className="mt-5">
              <p>Yth.</p>
              <p>{form.tujuan}</p>
              {form.cq && <p>Cq. {form.cq}</p>}
              {form.kotaTujuan && <p>{form.kotaTujuan}</p>}
            </div>

            <div className="mt-5 space-y-3 text-justify leading-relaxed">
              {paragrafIsi.map((p, i) => (
                <div key={i}>
                  <p className="whitespace-pre-line" style={{ textIndent: i === 0 && /^Rujukan/.test(p) ? 0 : '10mm' }}>
                    {renderTebal(p)}
                  </p>
                  {/* Rincian waktu & tempat khusus surat panggilan */}
                  {jenis === 'panggilan' && i === 0 && (
                    <table className="border-collapse my-3 ml-8">
                      <tbody>
                        <tr><td className="pr-2 align-top w-32">Hari / tanggal</td><td className="pr-2 align-top">:</td><td className="align-top">{hariTanggal(ekstra.hariTgl)}</td></tr>
                        <tr><td className="pr-2 align-top">Pukul</td><td className="pr-2 align-top">:</td><td className="align-top">{ekstra.jam || '........'}</td></tr>
                        <tr><td className="pr-2 align-top">Tempat</td><td className="pr-2 align-top">:</td><td className="align-top">{ekstra.tempat || '........'}</td></tr>
                        <tr><td className="pr-2 align-top">Menghadap</td><td className="pr-2 align-top">:</td><td className="align-top">{ekstra.menghadap || '........'}</td></tr>
                        <tr><td className="pr-2 align-top">Sebagai</td><td className="pr-2 align-top">:</td><td className="align-top capitalize">{dipanggil?.jenis || '........'}</td></tr>
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
              {form.penutup && <p style={{ textIndent: '10mm' }}>{form.penutup}</p>}
            </div>

            <div className="ttd-block mt-6 ml-auto text-center" style={{ width: '80mm' }}>
              <p className="font-bold uppercase whitespace-pre-line">{ttd.jabatan}</p>
              <div className="h-20 flex items-center justify-center">
                {ttdUrl && <img src={ttdUrl} alt="Tanda Tangan" className="max-h-20 object-contain" />}
              </div>
              <p className="font-bold uppercase underline">{ttd.nama}</p>
              <p>{ttd.baris}</p>
            </div>

            {form.tembusan.trim() && (
              <div className="tembusan-block mt-6 text-[11pt]">
                <p className="font-bold">Tembusan Yth :</p>
                <p className="whitespace-pre-line">{form.tembusan}</p>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .lembar-cetak.print-only {
          position: relative !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        @media screen {
          .lembar-cetak.print-only { display: block !important; }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 210mm !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .ttd-block, .tembusan-block { page-break-inside: avoid; break-inside: avoid; }
        }
        @page { size: A4; margin: 15mm 20mm; }
      `}</style>
    </Layout>
  )
}
