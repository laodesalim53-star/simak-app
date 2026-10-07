// src/pages/SupervisiAkademik.jsx  ->  rute /administrasi-kepsek/supervisi-akademik
import { useState } from 'react'
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
  useDataSekolah, useDokumenTersimpan, ubahBaris, gabungkanGuru, segarkanIdentitas, fmt1, tanggalPanjang,
} from '../lib/administrasiKepsek'

const TAB = [
  { id: 'jadwal', label: 'Jadwal Supervisi', sub: 'Otomatis dari data guru' },
  { id: 'instrumen', label: 'Instrumen Observasi', sub: 'Penilaian per guru' },
  { id: 'rekap', label: 'Rekap dan Tindak Lanjut', sub: 'Nilai semua guru' },
]

// Butir instrumen: skor 1 (kurang) sampai 4 (sangat baik).
const ASPEK = [
  {
    nama: 'A. Perencanaan Pembelajaran',
    butir: [
      'Menyusun modul ajar sesuai capaian dan alur tujuan pembelajaran',
      'Merumuskan tujuan pembelajaran yang jelas dan terukur',
      'Menyiapkan media dan sumber belajar',
      'Merencanakan asesmen yang sesuai dengan tujuan',
    ],
  },
  {
    nama: 'B. Pelaksanaan Pembelajaran',
    butir: [
      'Kegiatan pembuka: apersepsi dan motivasi',
      'Penguasaan dan ketepatan penyampaian materi',
      'Penggunaan metode dan media yang bervariasi',
      'Pengelolaan kelas dan keterlibatan murid',
      'Kegiatan penutup: refleksi dan kesimpulan',
    ],
  },
  {
    nama: 'C. Penilaian dan Tindak Lanjut',
    butir: [
      'Melakukan asesmen formatif selama pembelajaran',
      'Memberi umpan balik kepada murid',
      'Merencanakan remedial dan pengayaan',
    ],
  },
]
const SEMUA_BUTIR = ASPEK.flatMap((a) => a.butir)

const barisJadwal = (g) => ({
  uid: g.id, nama: g.nama, nip: g.nip, gol: g.gol, mapel: g.mapel, kelas: g.kelas, tanggal: '', catatan: '', tl: '',
})

const bawaan = () => ({
  tahunAjaran: '',
  semester: 'Ganjil',
  tempat: '',
  tanggal: '',
  jadwal: [],
  guruPilih: '',
  skor: {}, // { [uidGuru]: { [indeksButir]: '1'..'4' } }
  catatanObservasi: {}, // { [uidGuru]: 'teks' }
})

const skorGuru = (data, uid) => SEMUA_BUTIR.map((_, i) => data.skor?.[uid]?.[i])

export default function SupervisiAkademik() {
  const { profile } = useAuth()
  const sekolahId = profile?.sekolah_id
  const [tab, setTab] = useState('jadwal')

  const { info, guruList, memuat: memuatGuru, galat, muatUlang } = useDataSekolah(sekolahId)
  const dok = useDokumenTersimpan({ sekolahId, dokumen: 'supervisi-akademik', buatBawaan: bawaan })
  const { data, setData } = dok

  useTarikOtomatis({
    siap: !dok.memuat && !memuatGuru,
    adaTersimpan: dok.adaTersimpan,
    daftar: guruList,
    setData,
    kunci: 'jadwal',
    buat: barisJadwal,
  })

  const namaSekolah = info.sekolah?.nama_sekolah || info.sekolah?.nama || ''
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }))
  const guruTerpilih = data.jadwal.find((r) => String(r.uid) === String(data.guruPilih))

  const ubahSkor = (uid, i) => (e) => {
    const v = e.target.value
    setData((d) => ({ ...d, skor: { ...d.skor, [uid]: { ...(d.skor?.[uid] || {}), [i]: v } } }))
  }

  const judul = {
    jadwal: 'Jadwal dan Pelaksanaan Supervisi Akademik',
    instrumen: 'Instrumen Observasi Pembelajaran',
    rekap: 'Rekap Hasil dan Tindak Lanjut Supervisi Akademik',
  }[tab]

  return (
    <Layout title="Supervisi Akademik" subtitle="Jadwal, instrumen observasi kelas, dan rekap hasil supervisi.">
      <style>{cssCetak(tab === 'instrumen' ? 'portrait' : 'landscape')}</style>

      <BilahTab tab={TAB} aktif={tab} onPilih={setTab} />

      <KotakSimpan
        judul="Supervisi Akademik"
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
        {tab === 'instrumen' && (
          <label className="flex flex-col gap-1">
            Guru yang disupervisi
            <select
              value={data.guruPilih}
              onChange={(e) => set('guruPilih')(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            >
              <option value="">Pilih guru…</option>
              {data.jadwal.map((r) => (
                <option key={r.uid} value={r.uid}>{r.nama}</option>
              ))}
            </select>
          </label>
        )}
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

      {tab !== 'instrumen' && (
        <BilahGuru
          daftar={guruList}
          rows={data.jadwal}
          memuat={memuatGuru}
          galat={galat}
          onMuatUlang={muatUlang}
          onTambah={() => setData((d) => ({ ...d, jadwal: gabungkanGuru(d.jadwal, guruList, barisJadwal).rows }))}
          onSegarkan={() => setData((d) => ({ ...d, jadwal: segarkanIdentitas(d.jadwal, guruList) }))}
        />
      )}

      <div id="area-cetak-adm" className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-900 sm:p-6">
        <KopSurat info={info} namaSekolah={namaSekolah} />

        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase underline underline-offset-4">{judul}</p>
          <p>Tahun Ajaran {data.tahunAjaran || '…………'} Semester {data.semester}</p>
        </div>

        {tab === 'jadwal' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-8">No</Th>
                  <Th className="w-48">Nama Guru</Th>
                  <Th className="w-40">NIP</Th>
                  <Th className="w-24">Gol.</Th>
                  <Th className="w-32">Mapel</Th>
                  <Th className="w-24">Kelas</Th>
                  <Th className="w-32">Tanggal</Th>
                  <Th>Catatan</Th>
                  <Th className="no-print w-14">Hapus</Th>
                </tr>
              </thead>
              <tbody>
                {data.jadwal.length === 0 && (
                  <tr>
                    <Td colSpan={9} className="py-4 text-center text-slate-500">
                      Belum ada baris. Klik "Tambah guru baru" untuk menarik dari data guru.
                    </Td>
                  </tr>
                )}
                {data.jadwal.map((r, i) => (
                  <tr key={r.uid}>
                    <Td className="text-center">{i + 1}</Td>
                    <Td>{r.nama}</Td>
                    <Td>{r.nip || '-'}</Td>
                    <Td><Isian value={r.gol} onChange={ubahBaris(setData, 'jadwal', i, 'gol')} /></Td>
                    <Td><Isian value={r.mapel} onChange={ubahBaris(setData, 'jadwal', i, 'mapel')} /></Td>
                    <Td><Isian value={r.kelas} onChange={ubahBaris(setData, 'jadwal', i, 'kelas')} /></Td>
                    <Td><Isian type="date" value={r.tanggal} onChange={ubahBaris(setData, 'jadwal', i, 'tanggal')} /></Td>
                    <Td><Isian area kiri value={r.catatan} onChange={ubahBaris(setData, 'jadwal', i, 'catatan')} /></Td>
                    <Td className="no-print text-center">
                      <button type="button" className={tombolKecil} onClick={() => hapusBarisKe(setData, 'jadwal', i)}>Hapus</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'instrumen' && (
          <>
            {!guruTerpilih ? (
              <p className="no-print rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Pilih guru yang disupervisi pada kolom di atas. Daftar guru berasal dari tab Jadwal Supervisi.
              </p>
            ) : (
              <>
                <div className="mb-3">
                  <Baris label="Nama Guru" nilai={guruTerpilih.nama} />
                  <Baris label="NIP" nilai={guruTerpilih.nip || '-'} />
                  <Baris label="Mata Pelajaran / Kelas" nilai={`${guruTerpilih.mapel || '…………'} / ${guruTerpilih.kelas || '…………'}`} />
                  <Baris label="Tanggal Supervisi" nilai={tanggalPanjang(guruTerpilih.tanggal) || '…………'} />
                </div>
                <p className="mb-2 text-xs">Skala: 1 = Kurang, 2 = Cukup, 3 = Baik, 4 = Sangat Baik.</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th className="w-8">No</Th>
                      <Th>Butir yang Diamati</Th>
                      <Th className="w-16">Skor</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let n = 0
                      return ASPEK.map((a) => (
                        <FragmenAspek key={a.nama} aspek={a}>
                          {a.butir.map((b) => {
                            const idx = n++
                            return (
                              <tr key={idx}>
                                <Td className="text-center">{idx + 1}</Td>
                                <Td>{b}</Td>
                                <Td>
                                  <Isian value={data.skor?.[guruTerpilih.uid]?.[idx] ?? ''} onChange={ubahSkor(guruTerpilih.uid, idx)}>
                                    <option value="">-</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                  </Isian>
                                </Td>
                              </tr>
                            )
                          })}
                        </FragmenAspek>
                      ))
                    })()}
                    <tr>
                      <Td colSpan={2} className="text-right font-semibold">Nilai (0-100) dan kategori</Td>
                      <Td className="text-center font-semibold">
                        {fmt1(hitungNilai(skorGuru(data, guruTerpilih.uid)))}
                      </Td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1 text-right text-xs">
                  Kategori: {kategoriNilai(hitungNilai(skorGuru(data, guruTerpilih.uid))) || '-'}
                </p>
                <div className="mt-3">
                  <p className="font-semibold">Catatan hasil observasi:</p>
                  <Isian
                    area
                    kiri
                    value={data.catatanObservasi?.[guruTerpilih.uid] || ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setData((d) => ({ ...d, catatanObservasi: { ...d.catatanObservasi, [guruTerpilih.uid]: v } }))
                    }}
                    className="rounded border border-slate-200 print:border-0"
                  />
                </div>
              </>
            )}
          </>
        )}

        {tab === 'rekap' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th className="w-8">No</Th>
                  <Th className="w-48">Nama Guru</Th>
                  <Th className="w-40">NIP</Th>
                  <Th className="w-32">Tanggal</Th>
                  <Th className="w-20">Nilai</Th>
                  <Th className="w-28">Kategori</Th>
                  <Th>Tindak Lanjut</Th>
                </tr>
              </thead>
              <tbody>
                {data.jadwal.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="py-4 text-center text-slate-500">Belum ada guru di tabel.</Td>
                  </tr>
                )}
                {data.jadwal.map((r, i) => {
                  const nilai = hitungNilai(skorGuru(data, r.uid))
                  return (
                    <tr key={r.uid}>
                      <Td className="text-center">{i + 1}</Td>
                      <Td>{r.nama}</Td>
                      <Td>{r.nip || '-'}</Td>
                      <Td className="text-center">{tanggalPanjang(r.tanggal) || '-'}</Td>
                      <Td className="text-center">{fmt1(nilai) || '-'}</Td>
                      <Td className="text-center">{kategoriNilai(nilai) || '-'}</Td>
                      <Td><Isian area kiri value={r.tl} onChange={ubahBaris(setData, 'jadwal', i, 'tl')} /></Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {(tab !== 'instrumen' || guruTerpilih) && (
          <TandaTanganKepsek
            tempat={data.tempat || info.tempat}
            tanggal={data.tanggal}
            nama={info.kepalaNama}
            nip={info.kepalaNip}
          />
        )}
      </div>
    </Layout>
  )
}

// Baris judul aspek + butir-butirnya di dalam <tbody>.
function FragmenAspek({ aspek, children }) {
  return (
    <>
      <tr>
        <Td colSpan={3} className="bg-slate-100 font-semibold">{aspek.nama}</Td>
      </tr>
      {children}
    </>
  )
}
