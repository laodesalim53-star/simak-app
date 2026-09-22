import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, RefreshCw, Trash2, Users } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import {
  AreaLembar,
  BagianSK as Bagian,
  BarAtasCetak,
  FieldSK as Field,
  GayaCetakSK,
  HalamanKeputusan,
  HalamanLampiran,
  SEKOLAH_KOSONG,
  ambilGuruDanKelas,
  ambilProfilSekolah,
  formatTanggalSK,
  inputSK as inputCls,
  isKepalaSekolah,
  isi,
  isiTemplate,
  isoHariIni,
  pecahBaris,
  tahunPelajaranSekarang,
  urutkanGuru,
} from './CetakSK'

// ─────────────────────────────────────────────────────────────────────────────
// SKPenugasan — komponen bersama untuk SK penetapan/pengangkatan PERSONEL
// (satu atau banyak orang), dengan honorarium yang bisa dicantumkan:
//   • SK Honor Guru          (pages/SKHonorGuru.jsx)
//   • SK Tenaga Kebersihan   (pages/SKTenagaKebersihan.jsx)
//   • SK Operator Dapodik    (pages/SKOperatorDapodik.jsx)
//   • SK Pengawas Asesmen    (pages/SKPengawasAsesmen.jsx)
//
// Format KEPUTUSAN: HalamanKeputusan (halaman 1, potret) + HalamanLampiran
// (halaman 2, lanskap A4 — tabel personel, kolom honor kalau `tampilHonor`,
// dan uraian tugas kalau diisi).
//
// Catatan spasi cetak: sama seperti SKPenugasanTunggal.jsx, lembar di sini
// dibungkus class "sk-print-compact" (lihat <GayaPadatCetak> di bawah) supaya
// tabel personel + BlokTTD tidak terdorong ke halaman ke-3. Ini SENGAJA
// di-scope di sini, bukan ditaruh di CetakSK.jsx, supaya halaman SK lain yang
// memakai HalamanKeputusan/HalamanLampiran langsung (di luar komponen ini)
// tidak ikut berubah spasinya.
//
// Bentuk `konfig`:
//   {
//     judulBar, objek,                 // objek: judul setelah "Penetapan …"
//     tampilHonor: boolean,            // kolom honorarium + sumber dana
//     sumberAwal: string,              // sumber dana awal
//     isiOtomatis: boolean,            // isi awal dari guru tanpa NIP & pangkat
//     jabatanAwal: string,             // jabatan bawaan tiap baris
//     placeholderNomor,
//     menimbang, mengingat, diktum, tugas   // string, satu butir per baris
//   }
// Penanda di teks: {sekolah}, {tp}, {objek}, {sumber}, {masa}.
// ─────────────────────────────────────────────────────────────────────────────

const URUTAN_DIKTUM = [
  'KESATU',
  'KEDUA',
  'KETIGA',
  'KEEMPAT',
  'KELIMA',
  'KEENAM',
  'KETUJUH',
  'KEDELAPAN',
  'KESEMBILAN',
  'KESEPULUH',
]

const idBaru = () => Math.random().toString(36).slice(2, 9)
const barisBaru = (jabatan = '', guruId = '') => ({ id: idBaru(), guruId, nama: '', nip: '', jabatan, honor: '' })

const rupiah = (n) => (n ? `Rp ${Number(n).toLocaleString('id-ID')}` : '…………')

// Guru honorer di sini dikenali dari: bukan Kepala Sekolah, tidak punya NIP,
// dan tidak punya pangkat/golongan. Hanya tebakan awal — bisa diubah manual.
const adalahHonorer = (g) => !isKepalaSekolah(g) && !g.nip && !g.pangkat_golongan

// CSS pemadatan khusus lembar cetak SKPenugasan (Keputusan + Lampiran).
// Di-scope lewat ".sk-print-compact" (dibungkus hanya di sekitar <AreaLembar>
// bagian cetak) supaya panel isian (no-print) dan halaman SK lain yang
// memakai CetakSK.jsx langsung tidak ikut berubah. Tujuannya: kurangi jarak
// antar-baris/paragraf dan padding tabel personel secukupnya agar tabel +
// BlokTTD di halaman Lampiran tidak terdorong ke halaman ke-3.
function GayaPadatCetak() {
  return (
    <style>{`
      .sk-print-compact .lembar-sk {
        font-size: 11pt;
        line-height: 1.25;
      }

      /* Kop sekolah */
      .sk-print-compact .sk-kop {
        padding-bottom: 4px;
        margin-bottom: 8px;
      }
      .sk-print-compact .sk-kop-logo {
        width: 16mm;
        height: 16mm;
      }
      .sk-print-compact .sk-kop-atas { font-size: 10.5pt; }
      .sk-print-compact .sk-kop-nama { font-size: 13pt; line-height: 1.15; }
      .sk-print-compact .sk-kop-alamat { font-size: 9.5pt; }

      /* Judul SK dan blok LAMPIRAN/NOMOR/TANGGAL */
      .sk-print-compact .sk-judul { margin-bottom: 6px; }
      .sk-print-compact .sk-judul p { margin: 1px 0; }
      .sk-print-compact .sk-judul .tentang { margin: 2px 0; }
      .sk-print-compact .sk-meta { margin-bottom: 6px; font-size: 10pt; }

      /* "Kepala …," dan "MEMUTUSKAN" */
      .sk-print-compact .sk-tengah { margin: 4px 0; }

      /* Tabel Menimbang/Mengingat dan Menetapkan/KESATU…dst */
      .sk-print-compact table.sk-def {
        margin-top: 3px;
        margin-bottom: 3px;
      }
      .sk-print-compact table.sk-def > tbody > tr > td {
        padding: 0 0 2px;
      }
      .sk-print-compact .sk-item { margin: 0; }
      .sk-print-compact .sk-justify { margin: 0; }

      /* Tabel personel di halaman Lampiran */
      .sk-print-compact .sk-tabel { font-size: 10pt; }
      .sk-print-compact .sk-tabel th,
      .sk-print-compact .sk-tabel td {
        padding: 3px 5px;
      }

      /* Blok tanda tangan — ruang kosong dipangkas secukupnya, masih cukup
         untuk tanda tangan fisik tapi tidak mendorong ke halaman baru */
      .sk-print-compact .sk-ttd { margin-top: 8px; }
      .sk-print-compact .sk-ttd table { margin-bottom: 2px; }
      .sk-print-compact .sk-ttd .ruang { height: 14mm; }
    `}</style>
  )
}

export default function SKPenugasan({ konfig }) {
  const navigate = useNavigate()
  const { sekolahId } = useAuth()
  const sudahIsiOtomatis = useRef(false)

  const [sekolah, setSekolah] = useState(SEKOLAH_KOSONG)
  const [sk, setSk] = useState({
    nomor: '',
    tempat: '',
    tanggal: isoHariIni(),
    tahun: tahunPelajaranSekarang(),
    sumber: konfig.sumberAwal || '',
    masaMulai: '',
    masaAkhir: '',
    honorSeragam: '',
  })
  const [menimbang, setMenimbang] = useState(konfig.menimbang)
  const [mengingat, setMengingat] = useState(konfig.mengingat)
  const [diktum, setDiktum] = useState(konfig.diktum)
  const [tugas, setTugas] = useState(konfig.tugas || '')

  const [guru, setGuru] = useState([])
  const [baris, setBaris] = useState(() => [barisBaru(konfig.jabatanAwal || '')])

  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [ringkas, setRingkas] = useState('')

  async function muatDariData() {
    if (!sekolahId) {
      setMemuat(false)
      return
    }
    setMemuat(true)
    setGalat('')
    try {
      const [ps, gk] = await Promise.all([ambilProfilSekolah(sekolahId), ambilGuruDanKelas(sekolahId)])
      const urut = urutkanGuru(gk.guru)
      const kepsek = urut.find(isKepalaSekolah)

      setSekolah({
        ...ps.sekolah,
        kepala: ps.sekolah.kepala || kepsek?.nama_lengkap || '',
        nipKepala: ps.sekolah.nipKepala || kepsek?.nip || '',
      })
      if (ps.tempat) setSk((s) => ({ ...s, tempat: s.tempat || ps.tempat }))
      setGuru(urut)

      // Isi awal sekali saja, supaya "Muat ulang" tidak menimpa isian Anda.
      if (konfig.isiOtomatis && !sudahIsiOtomatis.current) {
        sudahIsiOtomatis.current = true
        const honorer = urut.filter(adalahHonorer)
        if (honorer.length) {
          setBaris(honorer.map((g) => barisBaru(g.jenis_ptk || konfig.jabatanAwal || '', g.id)))
        }
      }
      setRingkas(`${gk.guru.length} guru/pegawai aktif terbaca.`)
    } catch (e) {
      console.error(`Gagal memuat data ${konfig.judulBar}:`, e)
      setGalat(e?.message || 'Data tidak dapat dibaca.')
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    muatDariData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahId])

  const ubahSekolah = (k) => (e) => setSekolah((s) => ({ ...s, [k]: e.target.value }))
  const ubahSk = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value }))
  const ubahAngka = (k) => (e) => setSk((s) => ({ ...s, [k]: e.target.value.replace(/\D/g, '') }))
  const ubahBaris = (id, k, nilaiBaru) =>
    setBaris((daftar) => daftar.map((b) => (b.id === id ? { ...b, [k]: nilaiBaru } : b)))
  const hapusBaris = (id) => setBaris((daftar) => daftar.filter((b) => b.id !== id))

  function tambahHonorerDariData() {
    setBaris((daftar) => [
      ...daftar,
      ...guru
        .filter(adalahHonorer)
        .filter((g) => !daftar.some((b) => b.guruId === g.id))
        .map((g) => barisBaru(g.jenis_ptk || konfig.jabatanAwal || '', g.id)),
    ])
  }

  const guruPerId = {}
  guru.forEach((g) => {
    guruPerId[g.id] = g
  })

  // ── Susun isi dokumen ──
  const namaSekolah = isi(sekolah.nama, 'NAMA SEKOLAH')
  const tp = isi(sk.tahun)

  let masa = `selama Tahun Pelajaran ${tp}`
  if (sk.masaMulai && sk.masaAkhir) {
    masa = `mulai tanggal ${formatTanggalSK(sk.masaMulai)} sampai dengan ${formatTanggalSK(sk.masaAkhir)}`
  } else if (sk.masaMulai) {
    masa = `mulai tanggal ${formatTanggalSK(sk.masaMulai)}`
  }

  const nilai = {
    sekolah: namaSekolah,
    tp,
    objek: konfig.objek,
    sumber: isi(sk.sumber),
    masa,
  }

  const tentang = `Penetapan ${konfig.objek} ${namaSekolah} Tahun Pelajaran ${tp}`
  const daftarMenimbang = pecahBaris(menimbang).map((t) => isiTemplate(t, nilai))
  const daftarMengingat = pecahBaris(mengingat).map((t) => isiTemplate(t, nilai))
  const daftarDiktum = pecahBaris(diktum)
    .slice(0, URUTAN_DIKTUM.length)
    .map((t, i) => [URUTAN_DIKTUM[i], isiTemplate(t, nilai)])
  const daftarTugas = pecahBaris(tugas).map((t) => isiTemplate(t, nilai))

  const skCetak = { nomor: sk.nomor, tempat: sk.tempat, tanggal: sk.tanggal }

  const barisTabel = baris.map((b) => {
    const g = guruPerId[b.guruId]
    return {
      key: b.id,
      nama: g?.nama_lengkap || b.nama,
      nip: g?.nip || b.nip,
      jabatan: b.jabatan || g?.jenis_ptk || '',
      honor: b.honor !== '' ? b.honor : sk.honorSeragam,
    }
  })
  const adaNip = barisTabel.some((b) => String(b.nip || '').trim())
  const totalHonor = barisTabel.reduce((jumlah, b) => jumlah + (Number(b.honor) || 0), 0)
  const kolomSebelumHonor = 3 + (adaNip ? 1 : 0)

  return (
    <div className="min-h-screen bg-slate-100">
      <GayaCetakSK />
      <GayaPadatCetak />
      <BarAtasCetak onKembali={() => navigate('/gudang-sk')} judul={konfig.judulBar} />

      {/* ── Panel isian (tidak ikut tercetak) ── */}
      <div className="no-print max-w-3xl mx-auto px-3 pt-4">
        {memuat && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-4">
            <Loader2 size={16} className="animate-spin" /> Mengambil data sekolah dan guru…
          </div>
        )}
        {!memuat && galat && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            Data guru belum bisa dibaca ({galat}). Anda tetap bisa mengetik nama secara manual.
          </div>
        )}
        {!memuat && !galat && ringkas && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {ringkas} {baris.length} orang akan masuk lampiran.
          </div>
        )}

        <Bagian judul="Data SK" keterangan="Nomor, tempat, tanggal penetapan, tahun pelajaran, dan masa berlaku.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nomor SK">
              <input className={inputCls} value={sk.nomor} onChange={ubahSk('nomor')} placeholder={konfig.placeholderNomor || 'mis. 421.2/020/SD/2026'} />
            </Field>
            <Field label="Tahun pelajaran">
              <input className={inputCls} value={sk.tahun} onChange={ubahSk('tahun')} placeholder="mis. 2026/2027" />
            </Field>
            <Field label="Ditetapkan di">
              <input className={inputCls} value={sk.tempat} onChange={ubahSk('tempat')} placeholder="Nama kota/kabupaten" />
            </Field>
            <Field label="Pada tanggal">
              <input type="date" className={inputCls} value={sk.tanggal} onChange={ubahSk('tanggal')} />
            </Field>
            <Field label="Berlaku mulai (opsional)">
              <input type="date" className={inputCls} value={sk.masaMulai} onChange={ubahSk('masaMulai')} />
            </Field>
            <Field label="Berlaku sampai (opsional)">
              <input type="date" className={inputCls} value={sk.masaAkhir} onChange={ubahSk('masaAkhir')} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Kalau tanggal berlaku dikosongkan, SK ditulis "selama Tahun Pelajaran {tp}".
          </p>
        </Bagian>

        {konfig.tampilHonor && (
          <Bagian judul="Honorarium" keterangan="Sumber dana dan besaran honor per bulan.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sumber dana">
                <input className={inputCls} value={sk.sumber} onChange={ubahSk('sumber')} placeholder="mis. Dana BOS" />
              </Field>
              <Field label="Honor per bulan untuk semua (Rp)">
                <input
                  className={inputCls}
                  value={sk.honorSeragam}
                  onChange={ubahAngka('honorSeragam')}
                  inputMode="numeric"
                  placeholder="mis. 500000"
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Honor tiap orang bisa diubah sendiri di bagian di bawah. Kosong berarti memakai honor untuk semua.
            </p>
          </Bagian>
        )}

        <Bagian
          judul="Personel"
          keterangan="Pilih dari Data Guru, atau pilih 'isi manual' untuk orang yang tidak ada di Data Guru."
          aksi={
            <div className="flex flex-wrap gap-2">
              {konfig.isiOtomatis && (
                <button
                  type="button"
                  onClick={tambahHonorerDariData}
                  disabled={guru.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                >
                  <Users size={13} /> Ambil guru honorer
                </button>
              )}
              <button
                type="button"
                onClick={() => setBaris((d) => [...d, barisBaru(konfig.jabatanAwal || '')])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
              >
                <Plus size={13} /> Tambah orang
              </button>
              <button
                type="button"
                onClick={muatDariData}
                disabled={memuat || !sekolahId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Muat ulang guru
              </button>
            </div>
          }
        >
          {konfig.isiOtomatis && (
            <p className="mb-3 text-xs text-slate-500">
              "Ambil guru honorer" memilih guru aktif yang di Data Guru tidak punya NIP dan pangkat/golongan. Ini hanya perkiraan, jadi cek daftarnya sebelum dicetak.
            </p>
          )}
          {baris.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada personel. Klik "Tambah orang".</p>
          ) : (
            <div className="space-y-3">
              {baris.map((b, i) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Nomor {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => hapusBaris(b.id)}
                      aria-label={`Hapus nomor ${i + 1}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Guru/pegawai">
                      <select className={inputCls} value={b.guruId} onChange={(e) => ubahBaris(b.id, 'guruId', e.target.value)}>
                        <option value="">— isi manual —</option>
                        {guru.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama_lengkap || '(tanpa nama)'}
                            {g.nip ? ` — NIP. ${g.nip}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Jabatan/tugas">
                      <input
                        className={inputCls}
                        value={b.jabatan}
                        onChange={(e) => ubahBaris(b.id, 'jabatan', e.target.value)}
                        placeholder={konfig.jabatanAwal || 'mis. Guru Honorer'}
                      />
                    </Field>
                    {!b.guruId && (
                      <>
                        <Field label="Nama">
                          <input className={inputCls} value={b.nama} onChange={(e) => ubahBaris(b.id, 'nama', e.target.value)} />
                        </Field>
                        <Field label="NIP (kosongkan kalau tidak ada)">
                          <input className={inputCls} value={b.nip} onChange={(e) => ubahBaris(b.id, 'nip', e.target.value)} inputMode="numeric" />
                        </Field>
                      </>
                    )}
                    {konfig.tampilHonor && (
                      <Field label="Honor per bulan (Rp)">
                        <input
                          className={inputCls}
                          value={b.honor}
                          onChange={(e) => ubahBaris(b.id, 'honor', e.target.value.replace(/\D/g, ''))}
                          inputMode="numeric"
                          placeholder={sk.honorSeragam ? `Sama dengan semua: ${sk.honorSeragam}` : 'mis. 500000'}
                        />
                      </Field>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Bagian>

        <Bagian judul="Uraian tugas" keterangan="Satu baris = satu butir, tampil bernomor di halaman Lampiran. Kosongkan kalau tidak diperlukan.">
          <Field label="Uraian tugas">
            <textarea className={inputCls} rows={6} value={tugas} onChange={(e) => setTugas(e.target.value)} />
          </Field>
        </Bagian>

        <Bagian
          judul="Isi keputusan"
          keterangan="Satu baris = satu butir. Penanda yang otomatis diganti: {sekolah}, {tp} (tahun pelajaran), {objek}, {sumber}, dan {masa}. Label a., b., 1., 2., dan KESATU, KEDUA dibuat otomatis."
        >
          <div className="grid grid-cols-1 gap-3">
            <Field label="Menimbang">
              <textarea className={inputCls} rows={6} value={menimbang} onChange={(e) => setMenimbang(e.target.value)} />
            </Field>
            <Field label="Mengingat">
              <textarea className={inputCls} rows={7} value={mengingat} onChange={(e) => setMengingat(e.target.value)} />
            </Field>
            <Field label="Memutuskan (diktum KESATU dan seterusnya)">
              <textarea className={inputCls} rows={8} value={diktum} onChange={(e) => setDiktum(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dasar hukum di "Mengingat" adalah isian awal. Cek apakah masih berlaku dan sesuaikan nomor serta tahunnya dengan aturan di daerah Anda sebelum dicetak.
          </p>
        </Bagian>

        <Bagian judul="Kop dan penandatangan" keterangan="Kop dan Kepala Sekolah diambil dari Profil Sekolah.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Baris atas kop (satu baris per garis)" className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={sekolah.kopAtas} onChange={ubahSekolah('kopAtas')} />
            </Field>
            <Field label="Nama sekolah">
              <input className={inputCls} value={sekolah.nama} onChange={ubahSekolah('nama')} />
            </Field>
            <Field label="NPSN">
              <input className={inputCls} value={sekolah.npsn} onChange={ubahSekolah('npsn')} inputMode="numeric" />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <input className={inputCls} value={sekolah.alamat} onChange={ubahSekolah('alamat')} />
            </Field>
            <Field label="Nama kepala sekolah">
              <input className={inputCls} value={sekolah.kepala} onChange={ubahSekolah('kepala')} />
            </Field>
            <Field label="NIP kepala sekolah">
              <input className={inputCls} value={sekolah.nipKepala} onChange={ubahSekolah('nipKepala')} inputMode="numeric" />
            </Field>
          </div>
        </Bagian>

        <p className="text-xs text-slate-500 mb-2">
          Pratinjau di bawah: halaman 1 Keputusan, halaman 2 Lampiran (lanskap). Saat mencetak, matikan opsi "Header dan footer" di dialog cetak agar bersih.
        </p>
      </div>

      {/* ── Lembar cetak: Keputusan + Lampiran ── */}
      <AreaLembar>
        <div className="sk-print-compact">
          <HalamanKeputusan
            sk={skCetak}
            sekolah={sekolah}
            tentang={tentang}
            menimbang={daftarMenimbang}
            mengingat={daftarMengingat}
            diktum={daftarDiktum}
          />

          <HalamanLampiran
            sk={skCetak}
            sekolah={sekolah}
            judul={[`Daftar ${konfig.objek}`, namaSekolah, `Tahun Pelajaran ${tp}`]}
          >
            <table className="sk-tabel">
              <thead>
                <tr>
                  <th style={{ width: '7%' }}>No</th>
                  <th>Nama</th>
                  {adaNip && <th style={{ width: '24%' }}>NIP</th>}
                  <th style={{ width: '24%' }}>Jabatan/Tugas</th>
                  {konfig.tampilHonor && <th style={{ width: '22%' }}>Honorarium per Bulan</th>}
                </tr>
              </thead>
              <tbody>
                {barisTabel.length === 0 ? (
                  <tr>
                    <td className="c">1</td>
                    <td>…………</td>
                    {adaNip && <td className="c">-</td>}
                    <td className="c">…………</td>
                    {konfig.tampilHonor && <td className="c">…………</td>}
                  </tr>
                ) : (
                  barisTabel.map((b, i) => (
                    <tr key={b.key}>
                      <td className="c">{i + 1}</td>
                      <td>{isi(b.nama)}</td>
                      {adaNip && <td className="c nip">{isi(b.nip, '-')}</td>}
                      <td className="c">{isi(b.jabatan)}</td>
                      {konfig.tampilHonor && <td className="c">{rupiah(b.honor)}</td>}
                    </tr>
                  ))
                )}
                {konfig.tampilHonor && barisTabel.length > 1 && (
                  <tr>
                    <td colSpan={kolomSebelumHonor} className="c">
                      <strong>Jumlah</strong>
                    </td>
                    <td className="c">
                      <strong>{rupiah(totalHonor)}</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {daftarTugas.length > 0 && (
              <>
                <p className="sk-tengah" style={{ marginTop: 14 }}>
                  Uraian Tugas
                </p>
                {daftarTugas.map((teks, i) => (
                  <div key={i} className="sk-item">
                    <span className="no">{i + 1}.</span>
                    <span className="isi">{teks}</span>
                  </div>
                ))}
              </>
            )}
          </HalamanLampiran>
        </div>
      </AreaLembar>
    </div>
  )
}
