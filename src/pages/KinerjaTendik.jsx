// src/pages/KinerjaTendik.jsx  ->  rute /administrasi-kepsek/kinerja-tendik
import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  KopSurat, TandaTanganKepsek, BilahTab, KotakSimpan, Th, Td, Baris, cssCetak, tombolKecil,
} from '../components/AdministrasiKepsekKomponen'
import {
  Isian, BilahGuru, IsianTtd, useTarikOtomatis, hitungNilai, kategoriNilai, hapusBarisKe,
} from '../components/AdministrasiKepsekIsian'
import {
  useDataSekolah, useDokumenTersimpan, ubahBaris, gabungkanGuru, segarkanIdentitas, adalahTendik, fmt1,
} from '../lib/administrasiKepsek'

const TAB = [
  { id: 'daftar', label: 'Daftar dan Tugas', sub: 'Otomatis dari data guru' },
  { id: 'penilaian', label: 'Penilaian Kinerja', sub: 'Skor, nilai, tindak lanjut' },
]

// Aspek penilaian: skor 1 (kurang) sampai 4 (sangat baik).
const ASPEK = [
  'Kehadiran dan kedisiplinan',
  'Tanggung jawab terhadap tugas',
  'Kualitas hasil kerja',
  'Kerja sama dan komunikasi',
  'Inisiatif dan pelayanan',
]

const barisTendik = (g) => ({
  uid: g.id, nama: g.nama, nip: g.nip, gol: g.gol, jabatan: g.jabatan,
  tugas: '', skor: ASPEK.map(() => ''), tl: '',
})

const bawaan = () => ({
  tahunAjaran: '',
  semester: 'Ganjil',
  tempat: '',
  tanggal: '',
  tendik: [],
})

export default function KinerjaTendik() {
  const { profile } = useAuth()
  const sekolahId = profile?.sekolah_id
  const [tab, setTab] = useState('daftar')
  const [pilihManual, setPilihManual] = useState('')

  const { info, guruList, memuat: memuatGuru, galat, muatUlang } = useDataSekolah(sekolahId)
  const dok = useDokumenTersimpan({ sekolahId, dokumen: 'kinerja-tendik', buatBawaan: bawaan })
  const { data, setData } = dok

  // Tenaga kependidikan = data guru yang jabatannya memuat kata kunci (operator, TU, penjaga, dll.).
  const daftarTendik = useMemo(() => guruList.filter(adalahTendik), [guruList])

  useTarikOtomatis({
    siap: !dok.memuat && !memuatGuru,
    adaTersimpan: dok.adaTersimpan,
    daftar: daftarTendik,
    setData,
    kunci: 'tendik',
    buat: barisTendik,
  })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }))
  const sudahAda = new Set(data.tendik.map((r) => String(r.uid)))
  const bisaDipilih = guruList.filter((g) => !sudahAda.has(String(g.id)))

  const ubahSkor = (i, k) => (e) => {
    const v = e.target.value
    setData((d) => ({
      ...d,
      tendik: d.tendik.map((r, j) => (j === i ? { ...r, skor: r.skor.map((s, m) => (m === k ? v : s)) } : r)),
    }))
  }

  const tambahManual = () => {
    const g = guruList.find((x) => String(x.id) === String(pilihManual))
    if (!g) return
    setData((d) => ({ ...d, tendik: gabungkanGuru(d.tendik, [g], barisTendik).rows }))
    setPilihManual('')
  }

  return (
    <Layout title="Kinerja Tenaga Kependidikan" subtitle="Daftar tugas dan penilaian kinerja tenaga kependidikan.">
      <style>{cssCetak(tab === 'penilaian' ? 'landscape' : 'portrait')}</style>

      <BilahTab tab={TAB} aktif={tab} onPilih={setTab} />

      <KotakSimpan
        judul="Kinerja Tenaga Kependidikan"
        status={dok.status}
        waktu={dok.waktu}
        memuat={dok.memuat}
        menyimpan={dok.menyimpan}
        pesan={dok.pesan}
        onSimpan={dok.simpan}
        disabled={!sekolahId}
      />

      <div className="no-print mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <label className="flex flex-col gap-1">
          Tahun ajaran
          <input
            value={data.tahunAjaran}
            onChange={(e) => set('tahunAjaran')(e.target.value)}
            placeholder="2026/2027"
            className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          Semester
          <select
            value={data.semester}
            onChange={(e) => set('semester')(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            <option>Ganjil</option>
            <option>Genap</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
        >
          <Printer size={16} /> Cetak
        </button>
      </div>

      <IsianTtd
        tempat={data.tempat}
        tanggal={data.tanggal}
        onTempat={set('tempat')}
        onTanggal={set('tanggal')}
        tempatBawaan={info.tempat}
      />

      <BilahGuru
        daftar={daftarTendik}
        rows={data.tendik}
        satuan="tenaga kependidikan"
        memuat={memuatGuru}
        galat={galat}
        onMuatUlang={muatUlang}
        onTambah={() => setData((d) => ({ ...d, tendik: gabungkanGuru(d.tendik, daftarTendik, barisTendik).rows }))}
        onSegarkan={() => setData((d) => ({ ...d, tendik: segarkanIdentitas(d.tendik, guruList) }))}
      />

      {/* Cadangan manual: dipakai bila kolom jabatan di data guru kosong atau tidak terdeteksi. */}
      <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <span>
          {daftarTendik.length === 0 && !memuatGuru
            ? 'Tidak ada data guru dengan jabatan tenaga kependidikan. Pilih manual dari daftar:'
            : 'Tambah orang lain dari data guru:'}
        </span>
        <select
          value={pilihManual}
          onChange={(e) => setPilihManual(e.target.value)}
          className="min-w-[12rem] rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="">Pilih nama…</option>
          {bisaDipilih.map((g) => (
            <option key={g.id} value={g.id}>{g.nama}</option>
          ))}
        </select>
        <button type="button" className={tombolKecil} disabled={!pilihManual} onClick={tambahManual}>
          Tambah
        </button>
      </div>

      <div id="area-cetak-adm" className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-900 sm:p-6">
        <KopSurat info={info} namaSekolah={namaSekolah} />

        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase underline underline-offset-4">
            {tab === 'daftar' ? 'Daftar Tenaga Kependidikan dan Uraian Tugas' : 'Penilaian Kinerja Tenaga Kependidikan'}
          </p>
          <p>Tahun Ajaran {data.tahunAjaran || '…………'} Semester {data.semester}</p>
        </div>

        <div className="mb-3">
          <Baris label="Nama Sekolah" nilai={namaSekolah || '…………'} />
          <Baris label="Kepala Sekolah" nilai={info.kepalaNama || '…………'} />
        </div>

        {tab === 'daftar' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-8">No</Th>
                  <Th className="w-48">Nama</Th>
                  <Th className="w-40">NIP</Th>
                  <Th className="w-24">Gol.</Th>
                  <Th className="w-36">Jabatan</Th>
                  <Th>Uraian Tugas</Th>
                  <Th className="no-print w-14">Hapus</Th>
                </tr>
              </thead>
              <tbody>
                {data.tendik.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="py-4 text-center text-slate-500">
                      Belum ada baris. Klik "Tambah tenaga kependidikan baru" atau pilih manual dari daftar.
                    </Td>
                  </tr>
                )}
                {data.tendik.map((r, i) => (
                  <tr key={r.uid}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{r.nama}</Td>
                    <Td>{r.nip || '-'}</Td>
                    <Td><Isian value={r.gol} onChange={ubahBaris(setData, 'tendik', i, 'gol')} /></Td>
                    <Td><Isian value={r.jabatan} onChange={ubahBaris(setData, 'tendik', i, 'jabatan')} /></Td>
                    <Td><Isian area kiri value={r.tugas} onChange={ubahBaris(setData, 'tendik', i, 'tugas')} /></Td>
                    <Td className="no-print text-center">
                      <button type="button" className={tombolKecil} onClick={() => hapusBarisKe(setData, 'tendik', i)}>Hapus</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'penilaian' && (
          <>
            <p className="mb-2 text-xs">Skala: 1 = Kurang, 2 = Cukup, 3 = Baik, 4 = Sangat Baik.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th rowSpan={2} className="w-8">No</Th>
                    <Th rowSpan={2} className="w-44">Nama / Jabatan</Th>
                    <Th colSpan={ASPEK.length}>Aspek Penilaian</Th>
                    <Th rowSpan={2} className="w-16">Nilai</Th>
                    <Th rowSpan={2} className="w-24">Kategori</Th>
                    <Th rowSpan={2}>Tindak Lanjut</Th>
                  </tr>
                  <tr>
                    {ASPEK.map((a, k) => (
                      <Th key={a} className="w-20 text-[11px] font-medium">{k + 1}. {a}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.tendik.length === 0 && (
                    <tr>
                      <Td colSpan={ASPEK.length + 5} className="py-4 text-center text-slate-500">
                        Belum ada tenaga kependidikan di tabel.
                      </Td>
                    </tr>
                  )}
                  {data.tendik.map((r, i) => {
                    const nilai = hitungNilai(r.skor)
                    return (
                      <tr key={r.uid}>
                        <Td className="text-center">{i + 1}</Td>
                        <Td>
                          <span className="block font-medium">{r.nama}</span>
                          <span className="block text-xs text-slate-500">{r.jabatan || '-'}</span>
                        </Td>
                        {ASPEK.map((a, k) => (
                          <Td key={a}>
                            <Isian value={r.skor[k]} onChange={ubahSkor(i, k)}>
                              <option value="">-</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                            </Isian>
                          </Td>
                        ))}
                        <Td className="text-center font-semibold">{fmt1(nilai) || '-'}</Td>
                        <Td className="text-center">{kategoriNilai(nilai) || '-'}</Td>
                        <Td><Isian area kiri value={r.tl} onChange={ubahBaris(setData, 'tendik', i, 'tl')} /></Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <TandaTanganKepsek
          tempat={data.tempat || info.tempat}
          tanggal={data.tanggal}
          nama={info.kepalaNama}
          nip={info.kepalaNip}
        />
      </div>
    </Layout>
  )
}
