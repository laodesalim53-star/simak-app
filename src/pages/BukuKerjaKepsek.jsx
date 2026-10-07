// src/pages/BukuKerjaKepsek.jsx  ->  rute /administrasi-kepsek/buku-kerja
import { useState } from 'react'
import { Printer } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import {
  KopSurat, TandaTanganKepsek, BilahTab, KotakSimpan, Th, Td, Baris, cssCetak, tombolKecil,
} from '../components/AdministrasiKepsekKomponen'
import { Isian, BilahGuru, IsianTtd, useTarikOtomatis, hapusBarisKe } from '../components/AdministrasiKepsekIsian'
import {
  useDataSekolah, useDokumenTersimpan, ubahBaris, tambahBaris, hapusBarisTerakhir,
  gabungkanGuru, segarkanIdentitas,
} from '../lib/administrasiKepsek'

const TAB = [
  { id: 'jurnal', label: 'Jurnal Harian', sub: 'Catatan kerja harian' },
  { id: 'program', label: 'Program Kerja', sub: 'Tugas pokok dan target' },
  { id: 'pembinaan', label: 'Pembinaan Guru', sub: 'Otomatis dari data guru' },
]

const barisJurnal = () => ({ tanggal: '', kegiatan: '', hasil: '', ket: '' })
const barisProgram = () => ({ bidang: '', program: '', target: '', waktu: '', ket: '' })
const barisPembinaan = (g) => ({
  uid: g.id, nama: g.nama, nip: g.nip, gol: g.gol, jabatan: g.jabatan, tanggal: '', topik: '', tindak: '',
})

const bawaan = () => ({
  tahunAjaran: '',
  semester: 'Ganjil',
  tempat: '',
  tanggal: '',
  jurnal: Array.from({ length: 8 }, barisJurnal),
  program: Array.from({ length: 5 }, barisProgram),
  pembinaan: [],
})

export default function BukuKerjaKepsek() {
  const { profile } = useAuth()
  const sekolahId = profile?.sekolah_id
  const [tab, setTab] = useState('jurnal')

  const { info, guruList, memuat: memuatGuru, galat, muatUlang } = useDataSekolah(sekolahId)
  const dok = useDokumenTersimpan({ sekolahId, dokumen: 'buku-kerja', buatBawaan: bawaan })
  const { data, setData } = dok

  useTarikOtomatis({
    siap: !dok.memuat && !memuatGuru,
    adaTersimpan: dok.adaTersimpan,
    daftar: guruList,
    setData,
    kunci: 'pembinaan',
    buat: barisPembinaan,
  })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }))

  return (
    <Layout title="Buku Kerja Kepala Sekolah" subtitle="Jurnal harian, program kerja, dan pembinaan guru.">
      <style>{cssCetak(tab === 'pembinaan' ? 'landscape' : 'portrait')}</style>

      <BilahTab tab={TAB} aktif={tab} onPilih={setTab} />

      <KotakSimpan
        judul="Buku Kerja Kepala Sekolah"
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

      {tab === 'pembinaan' && (
        <BilahGuru
          daftar={guruList}
          rows={data.pembinaan}
          memuat={memuatGuru}
          galat={galat}
          onMuatUlang={muatUlang}
          onTambah={() => setData((d) => ({ ...d, pembinaan: gabungkanGuru(d.pembinaan, guruList, barisPembinaan).rows }))}
          onSegarkan={() => setData((d) => ({ ...d, pembinaan: segarkanIdentitas(d.pembinaan, guruList) }))}
        />
      )}

      <div id="area-cetak-adm" className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-900 sm:p-6">
        <KopSurat info={info} namaSekolah={namaSekolah} />

        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase underline underline-offset-4">
            {tab === 'jurnal' && 'Jurnal Kegiatan Harian Kepala Sekolah'}
            {tab === 'program' && 'Program Kerja Kepala Sekolah'}
            {tab === 'pembinaan' && 'Catatan Pembinaan Guru dan Tenaga Kependidikan'}
          </p>
          <p>Tahun Ajaran {data.tahunAjaran || '…………'} Semester {data.semester}</p>
        </div>

        <div className="mb-3">
          <Baris label="Nama Sekolah" nilai={namaSekolah || '…………'} />
          <Baris label="Kepala Sekolah" nilai={info.kepalaNama || '…………'} />
          <Baris label="NIP" nilai={info.kepalaNip || '…………'} />
        </div>

        {tab === 'jurnal' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th className="w-8">No</Th>
                    <Th className="w-32">Hari / Tanggal</Th>
                    <Th>Uraian Kegiatan</Th>
                    <Th>Hasil / Tindak Lanjut</Th>
                    <Th className="w-28">Ket.</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.jurnal.map((r, i) => (
                    <tr key={i}>
                      <Td className="text-center">{i + 1}</Td>
                      <Td><Isian type="date" value={r.tanggal} onChange={ubahBaris(setData, 'jurnal', i, 'tanggal')} /></Td>
                      <Td><Isian area kiri value={r.kegiatan} onChange={ubahBaris(setData, 'jurnal', i, 'kegiatan')} /></Td>
                      <Td><Isian area kiri value={r.hasil} onChange={ubahBaris(setData, 'jurnal', i, 'hasil')} /></Td>
                      <Td><Isian value={r.ket} onChange={ubahBaris(setData, 'jurnal', i, 'ket')} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="no-print mt-2 flex gap-2">
              <button type="button" className={tombolKecil} onClick={() => tambahBaris(setData, 'jurnal', barisJurnal())}>+ Tambah baris</button>
              <button type="button" className={tombolKecil} onClick={() => hapusBarisTerakhir(setData, 'jurnal')}>Hapus baris terakhir</button>
            </div>
          </>
        )}

        {tab === 'program' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <Th className="w-8">No</Th>
                    <Th className="w-36">Bidang</Th>
                    <Th>Program / Kegiatan</Th>
                    <Th>Target</Th>
                    <Th className="w-28">Waktu</Th>
                    <Th className="w-24">Ket.</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.program.map((r, i) => (
                    <tr key={i}>
                      <Td className="text-center">{i + 1}</Td>
                      <Td><Isian area kiri value={r.bidang} onChange={ubahBaris(setData, 'program', i, 'bidang')} /></Td>
                      <Td><Isian area kiri value={r.program} onChange={ubahBaris(setData, 'program', i, 'program')} /></Td>
                      <Td><Isian area kiri value={r.target} onChange={ubahBaris(setData, 'program', i, 'target')} /></Td>
                      <Td><Isian value={r.waktu} onChange={ubahBaris(setData, 'program', i, 'waktu')} /></Td>
                      <Td><Isian value={r.ket} onChange={ubahBaris(setData, 'program', i, 'ket')} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="no-print mt-2 flex gap-2">
              <button type="button" className={tombolKecil} onClick={() => tambahBaris(setData, 'program', barisProgram())}>+ Tambah baris</button>
              <button type="button" className={tombolKecil} onClick={() => hapusBarisTerakhir(setData, 'program')}>Hapus baris terakhir</button>
            </div>
          </>
        )}

        {tab === 'pembinaan' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-8">No</Th>
                  <Th className="w-48">Nama</Th>
                  <Th className="w-40">NIP</Th>
                  <Th className="w-32">Jabatan</Th>
                  <Th className="w-32">Tanggal</Th>
                  <Th>Topik Pembinaan</Th>
                  <Th>Tindak Lanjut</Th>
                  <Th className="no-print w-14">Hapus</Th>
                </tr>
              </thead>
              <tbody>
                {data.pembinaan.length === 0 && (
                  <tr>
                    <Td colSpan={8} className="py-4 text-center text-slate-500">
                      Belum ada baris. Klik "Tambah guru baru" untuk menarik dari data guru.
                    </Td>
                  </tr>
                )}
                {data.pembinaan.map((r, i) => (
                  <tr key={r.uid}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{r.nama}</Td>
                    <Td>{r.nip || '-'}</Td>
                    <Td><Isian value={r.jabatan} onChange={ubahBaris(setData, 'pembinaan', i, 'jabatan')} /></Td>
                    <Td><Isian type="date" value={r.tanggal} onChange={ubahBaris(setData, 'pembinaan', i, 'tanggal')} /></Td>
                    <Td><Isian area kiri value={r.topik} onChange={ubahBaris(setData, 'pembinaan', i, 'topik')} /></Td>
                    <Td><Isian area kiri value={r.tindak} onChange={ubahBaris(setData, 'pembinaan', i, 'tindak')} /></Td>
                    <Td className="no-print text-center">
                      <button type="button" className={tombolKecil} onClick={() => hapusBarisKe(setData, 'pembinaan', i)}>Hapus</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
