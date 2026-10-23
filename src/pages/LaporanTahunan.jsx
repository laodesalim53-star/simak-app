// src/pages/LaporanTahunan.jsx  ->  rute /administrasi-kepsek/laporan-tahunan
// Dibuat dengan pola yang sama seperti BukuKerjaKepsek.jsx: komponen cetak, KopSurat, TandaTanganKepsek,
// dan penyimpanan lewat useDokumenTersimpan (dokumen: 'laporan-tahunan'), jadi TIDAK perlu tabel baru.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { KopSurat, TandaTanganKepsek, KotakSimpan, Th, Td, Baris, cssCetak, tombolKecil } from '../components/AdministrasiKepsekKomponen'
import { IsianTtd } from '../components/AdministrasiKepsekIsian'
import { useDataSekolah, useDokumenTersimpan } from '../lib/administrasiKepsek'

// Rekap jumlah dari tabel modul lain. SESUAIKAN nama tabel / kolom tanggal; tabel yang tidak ada tampil "–".
const SUMBER = [
  { id: 'mutasi', label: 'Mutasi siswa', tabel: 'mutasi_siswa', tgl: 'tanggal' },
  { id: 'tamu', label: 'Kunjungan tamu', tabel: 'buku_tamu', tgl: 'tanggal' },
  { id: 'surat_masuk', label: 'Surat masuk', tabel: 'surat_masuk', tgl: 'tanggal' },
  { id: 'surat_keluar', label: 'Surat keluar', tabel: 'surat_keluar', tgl: 'tanggal' },
  { id: 'inventaris', label: 'Barang inventaris', tabel: 'inventaris', tgl: null },
  { id: 'notulen', label: 'Rapat (notulen)', tabel: 'notulen_rapat', tgl: 'tanggal' },
]

// Keuangan dari impor ARKAS. Sesuaikan kolom jumlah / tahun bila berbeda.
const KEUANGAN = {
  anggaran: { tabel: 'arkas_anggaran', kolomJumlah: 'jumlah', kolomTahun: 'tahun' },
  penerimaan: { tabel: 'arkas_penerimaan', kolomJumlah: 'jumlah', kolomTahun: 'tahun' },
}

const rupiah = (n) =>
  n == null ? '–' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

async function hitung(s, sekolahId, tahun) {
  let q = supabase.from(s.tabel).select('*', { count: 'exact', head: true }).eq('sekolah_id', sekolahId)
  if (s.tgl) q = q.gte(s.tgl, `${tahun}-01-01`).lte(s.tgl, `${tahun}-12-31`)
  const { count, error } = await q
  return error ? null : count
}

async function jumlahkan(cfg, tahun) {
  // Tabel ARKAS memakai npsn, bukan sekolah_id; isolasi antar sekolah ditangani RLS.
  const { data, error } = await supabase.from(cfg.tabel).select('*').eq(cfg.kolomTahun, tahun)
  if (error || !data) return null
  return data.reduce((t, r) => t + (Number(r[cfg.kolomJumlah]) || 0), 0)
}

const NARASI_KOSONG = { pendahuluan: '', capaian: '', kendala: '', tindak_lanjut: '' }
const bawaan = () => ({ tempat: '', tanggal: '', narasi: {} })
const bawaanBukuKerja = () => ({ jurnal: [], program: [], pembinaan: [] })

function Bagian({ huruf, judul, children }) {
  return (
    <section className="mt-5" style={{ breakInside: 'avoid-page' }}>
      <h3 className="mb-2 text-sm font-bold uppercase">{huruf}. {judul}</h3>
      {children}
    </section>
  )
}

function Narasi({ nilai, onUbah, label, baris = 4 }) {
  return (
    <>
      <textarea
        rows={baris}
        value={nilai}
        onChange={(e) => onUbah(e.target.value)}
        placeholder={label}
        className="no-print w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <p className="hidden whitespace-pre-line text-justify print:block">{nilai || '-'}</p>
    </>
  )
}

export default function LaporanTahunan() {
  const { sekolahId } = useAuth()
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [vm, setVm] = useState(null)
  const [sebaran, setSebaran] = useState([])
  const [angka, setAngka] = useState({})
  const [uang, setUang] = useState({ anggaran: null, penerimaan: null })
  const [memuatAngka, setMemuatAngka] = useState(false)

  const { info, guruList } = useDataSekolah(sekolahId)
  const dok = useDokumenTersimpan({ sekolahId, dokumen: 'laporan-tahunan', buatBawaan: bawaan })
  const { data, setData } = dok
  // Hanya dibaca: rekap dari dokumen Buku Kerja Kepala Sekolah yang sudah tersimpan.
  const bukuKerja = useDokumenTersimpan({ sekolahId, dokumen: 'buku-kerja', buatBawaan: bawaanBukuKerja })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''
  const narasi = { ...NARASI_KOSONG, ...(data.narasi?.[tahun] || {}) }
  const setNarasi = (k) => (v) =>
    setData((d) => ({ ...d, narasi: { ...(d.narasi || {}), [tahun]: { ...NARASI_KOSONG, ...(d.narasi?.[tahun] || {}), [k]: v } } }))
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }))

  const muat = useCallback(async () => {
    if (!sekolahId) return
    setMemuatAngka(true)

    const { data: v } = await supabase.from('visi_misi_sekolah').select('*').eq('sekolah_id', sekolahId).maybeSingle()
    setVm(v || null)

    const { data: sw } = await supabase.from('siswa').select('kelas, jenis_kelamin').eq('sekolah_id', sekolahId)
    const peta = {}
    ;(sw || []).forEach((r) => {
      const k = r.kelas || 'Tanpa kelas'
      peta[k] = peta[k] || { kelas: k, L: 0, P: 0 }
      const jk = String(r.jenis_kelamin || '').trim().toUpperCase()[0]
      if (jk === 'L') peta[k].L++
      else if (jk === 'P') peta[k].P++
    })
    setSebaran(Object.values(peta).sort((a, b) => String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true })))

    const hasil = await Promise.all(SUMBER.map((s) => hitung(s, sekolahId, tahun)))
    setAngka(Object.fromEntries(SUMBER.map((s, i) => [s.id, hasil[i]])))

    const [a, p] = await Promise.all([jumlahkan(KEUANGAN.anggaran, tahun), jumlahkan(KEUANGAN.penerimaan, tahun)])
    setUang({ anggaran: a, penerimaan: p })
    setMemuatAngka(false)
  }, [sekolahId, tahun])

  useEffect(() => { muat() }, [muat])

  const totalL = sebaran.reduce((t, r) => t + r.L, 0)
  const totalP = sebaran.reduce((t, r) => t + r.P, 0)
  const selisih = uang.anggaran != null && uang.penerimaan != null ? uang.penerimaan - uang.anggaran : null

  // Rekap Buku Kerja Kepala Sekolah (hanya baris yang benar-benar terisi)
  const bk = useMemo(() => {
    const d = bukuKerja.data || {}
    return {
      jurnal: (d.jurnal || []).filter((r) => r.kegiatan?.trim()).length,
      program: (d.program || []).filter((r) => r.program?.trim()),
      pembinaan: (d.pembinaan || []).filter((r) => r.topik?.trim()).length,
      tahunAjaran: d.tahunAjaran || '',
    }
  }, [bukuKerja.data])

  return (
    <Layout title="Laporan Tahunan" subtitle="Disusun otomatis dari data administrasi yang sudah ada.">
      <style>{cssCetak('portrait')}</style>

      <KotakSimpan
        judul="Laporan Tahunan"
        status={dok.status}
        waktu={dok.waktu}
        memuat={dok.memuat}
        menyimpan={dok.menyimpan}
        pesan={dok.pesan}
        onSimpan={dok.simpan}
        disabled={!sekolahId}
      />

      <div className="no-print mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <Link to="/administrasi-kepsek" className="text-sm text-slate-600 hover:text-slate-900">← Kembali</Link>
        <label className="flex flex-col gap-1">
          Tahun laporan
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            {[0, 1, 2, 3, 4].map((i) => {
              const t = new Date().getFullYear() - i
              return <option key={t} value={t}>{t}</option>
            })}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={tombolKecil} onClick={muat}>
            <RefreshCw size={13} className={`mr-1 inline ${memuatAngka ? 'animate-spin' : ''}`} /> Muat ulang angka
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>

      <IsianTtd tempat={data.tempat} tanggal={data.tanggal} onTempat={set('tempat')} onTanggal={set('tanggal')} tempatBawaan={info.tempat} />

      <div id="area-cetak-adm" className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-900 sm:p-6">
        <KopSurat info={info} namaSekolah={namaSekolah} />

        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase underline underline-offset-4">Laporan Tahunan Kepala Sekolah</p>
          <p>Tahun {tahun}{vm?.tahun_ajaran ? ` (Tahun Ajaran ${vm.tahun_ajaran})` : ''}</p>
        </div>

        <div className="mb-3">
          <Baris label="Nama Sekolah" nilai={namaSekolah || '…………'} />
          <Baris label="Kepala Sekolah" nilai={info.kepalaNama || '…………'} />
          <Baris label="NIP" nilai={info.kepalaNip || '…………'} />
        </div>

        <Bagian huruf="A" judul="Pendahuluan">
          <Narasi nilai={narasi.pendahuluan} onUbah={setNarasi('pendahuluan')} label="Latar belakang dan tujuan laporan" />
        </Bagian>

        <Bagian huruf="B" judul="Visi, Misi, dan Tujuan Sekolah">
          {vm?.visi || vm?.misi?.length || vm?.tujuan?.length ? (
            <div className="space-y-2">
              {vm.motto && <p><b>Motto:</b> {vm.motto}</p>}
              {vm.visi && <p className="text-justify"><b>Visi:</b> {vm.visi}</p>}
              {vm.misi?.length > 0 && (
                <div><b>Misi:</b>
                  <ol className="list-decimal space-y-1 pl-6 text-justify">{vm.misi.map((m, i) => <li key={i}>{m}</li>)}</ol>
                </div>
              )}
              {vm.tujuan?.length > 0 && (
                <div><b>Tujuan:</b>
                  <ol className="list-decimal space-y-1 pl-6 text-justify">{vm.tujuan.map((m, i) => <li key={i}>{m}</li>)}</ol>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500">
              Belum diisi. Isi dulu di <Link to="/administrasi-kepsek/visi-misi" className="text-blue-700 underline">Visi, Misi, dan Tujuan</Link>.
            </p>
          )}
        </Bagian>

        <Bagian huruf="C" judul="Data Peserta Didik dan Pendidik">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr><Th className="w-8">No</Th><Th>Kelas</Th><Th className="w-24">Laki-laki</Th><Th className="w-24">Perempuan</Th><Th className="w-24">Jumlah</Th></tr>
              </thead>
              <tbody>
                {sebaran.map((r, i) => (
                  <tr key={r.kelas}>
                    <Td className="text-center">{i + 1}</Td><Td>{r.kelas}</Td>
                    <Td className="text-center">{r.L}</Td><Td className="text-center">{r.P}</Td><Td className="text-center">{r.L + r.P}</Td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <Td className="text-center" colSpan={2}>Total</Td>
                  <Td className="text-center">{totalL}</Td><Td className="text-center">{totalP}</Td><Td className="text-center">{totalL + totalP}</Td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">Jumlah guru dan tenaga kependidikan terdata: <b>{guruList?.length ?? '–'}</b> orang.</p>
        </Bagian>

        <Bagian huruf="D" judul="Pelaksanaan Tugas Kepala Sekolah">
          <p>
            Jurnal kegiatan harian terisi: <b>{bk.jurnal}</b> kegiatan. Pembinaan guru dan tenaga kependidikan tercatat: <b>{bk.pembinaan}</b> kali
            {bk.tahunAjaran ? ` (Tahun Ajaran ${bk.tahunAjaran})` : ''}.
          </p>
          {bk.program.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><Th className="w-8">No</Th><Th>Bidang</Th><Th>Program / Kegiatan</Th><Th>Target</Th><Th className="w-28">Waktu</Th></tr></thead>
                <tbody>
                  {bk.program.map((r, i) => (
                    <tr key={i}><Td className="text-center">{i + 1}</Td><Td>{r.bidang}</Td><Td>{r.program}</Td><Td>{r.target}</Td><Td>{r.waktu}</Td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Bagian>

        <Bagian huruf="E" judul={`Rekap Administrasi Tahun ${tahun}`}>
          <table className="w-full border-collapse">
            <thead><tr><Th className="w-8">No</Th><Th>Jenis</Th><Th className="w-28">Jumlah</Th></tr></thead>
            <tbody>
              {SUMBER.map((s, i) => (
                <tr key={s.id}><Td className="text-center">{i + 1}</Td><Td>{s.label}</Td><Td className="text-center">{angka[s.id] ?? '–'}</Td></tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        <Bagian huruf="F" judul="Keuangan">
          <table className="w-full border-collapse">
            <tbody>
              <tr><Td>Total anggaran (RKAS/ARKAS)</Td><Td className="text-right">{rupiah(uang.anggaran)}</Td></tr>
              <tr><Td>Total penerimaan</Td><Td className="text-right">{rupiah(uang.penerimaan)}</Td></tr>
              <tr className="font-bold"><Td>Selisih penerimaan terhadap anggaran</Td><Td className="text-right">{rupiah(selisih)}</Td></tr>
            </tbody>
          </table>
        </Bagian>

        <Bagian huruf="G" judul="Capaian Program dan Prestasi">
          <Narasi nilai={narasi.capaian} onUbah={setNarasi('capaian')} label="Capaian program dan prestasi sekolah" baris={6} />
        </Bagian>
        <Bagian huruf="H" judul="Kendala dan Hambatan">
          <Narasi nilai={narasi.kendala} onUbah={setNarasi('kendala')} label="Kendala yang dihadapi" />
        </Bagian>
        <Bagian huruf="I" judul="Tindak Lanjut dan Rencana Tahun Berikutnya">
          <Narasi nilai={narasi.tindak_lanjut} onUbah={setNarasi('tindak_lanjut')} label="Tindak lanjut" />
        </Bagian>

        <TandaTanganKepsek tempat={data.tempat || info.tempat} tanggal={data.tanggal} nama={info.kepalaNama} nip={info.kepalaNip} />
      </div>
    </Layout>
  )
}
