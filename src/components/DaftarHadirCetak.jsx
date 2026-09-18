import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Komponen daftar hadir yang dipakai di semua halaman materi majelis
// (Keluarga Sakinah, Pengelolaan Zakat, Wakaf, dst). Bagian form isian
// (nama majelis/tanggal/tempat/pemateri) disembunyikan saat print lewat
// class `print:hidden` — yang tercetak hanya ringkasan teks + tabel.
//
// Nama majelis/tanggal/tempat/pemateri bisa diisi otomatis dari halaman
// induk lewat prop *Awal (namaMajelisAwal, tanggalAwal, tempatAwal,
// pemateriAwal). Kalau halaman induk tidak mengirim prop ini, field tetap
// kosong seperti sebelumnya dan bisa diisi manual di layar. Field tetap
// bisa dikoreksi manual meski sudah terisi otomatis — perubahan pada prop
// *Awal (misal user mengedit form di halaman induk) akan menimpa isian
// manual di komponen ini, karena field ini memang ditujukan sebagai
// cerminan data induk.
//
// PENTING soal Kelompok Binaan: "Majelis Taklim" dan "Masyarakat" BUKAN
// kelompok tunggal — masing-masing terbagi jadi banyak kelompok kecil per
// Desa + Nama Kelompok (mis. "Desa Sukamaju — Majelis Al-Ikhlas", "Desa
// Makmur — Majelis An-Nur"). Daftar sub-kelompok ini ditarik langsung dari
// data yang sudah tersimpan di kelompok_binaan_anggota (kolom `desa` +
// `nama_kelompok`), bukan dari tabel master terpisah — jadi begitu ada
// nama baru ditambahkan lewat Pusat Kelompok Binaan dengan desa/nama
// kelompok baru, sub-kelompok itu otomatis muncul di sini juga.
// "Lapas" dan "RSU" tetap flat, tanpa sub-kelompok.
//
// Checkbox "Pilih Semua" mencentang/melepas SEMUA pilihan sekaligus
// (Lapas, RSU, dan seluruh sub-kelompok Majelis Taklim + Masyarakat).
// Tiap kategori (Majelis Taklim / Masyarakat) juga punya checkbox header
// sendiri untuk memilih semua sub-kelompok di kategori itu saja.
//
// Cara pakai:
//   <DaftarHadirCetak jumlahBaris={15} />
//   <DaftarHadirCetak jumlahBaris={15} kelompokAwal="lapas" />
//   <DaftarHadirCetak jumlahBaris={15} kelompokAwal={['lapas', 'rsu']} />
//   // Slug kategori penuh ('majelis-taklim'/'masyarakat') berarti "pilih
//   // semua sub-kelompok di kategori itu" — tetap didukung untuk halaman
//   // induk lama yang belum tahu soal sub-kelompok:
//   <DaftarHadirCetak jumlahBaris={15} kelompokAwal="masyarakat" />
//   // Atau pilih sub-kelompok spesifik pakai id "kelompok::desa::namaKelompok":
//   <DaftarHadirCetak
//     jumlahBaris={15}
//     kelompokAwal="majelis-taklim::Desa Sukamaju::Majelis Al-Ikhlas"
//     namaMajelisAwal={lokasiPenyuluhan}
//     tanggalAwal={waktuKegiatan}
//     tempatAwal={tempatKegiatan}
//     pemateriAwal={namaPenyuluh}
//   />
const OPSI_KELOMPOK_FLAT = [
  { slug: 'lapas', label: 'Lapas' },
  { slug: 'rsu', label: 'RSU' },
]

// Kategori yang punya sub-kelompok per Desa + Nama Kelompok.
// Slug di sini HARUS sama dengan kolom `kelompok` di Supabase.
const KELOMPOK_BERSUB = [
  { slug: 'majelis-taklim', label: 'Majelis Taklim' },
  { slug: 'masyarakat', label: 'Masyarakat' },
]

function buatIdSub(kelompok, desa, namaKelompok) {
  return `${kelompok}::${desa || ''}::${namaKelompok || ''}`
}

// kelompokAwal bisa dikirim sebagai string tunggal atau array of string.
function normalisasiKelompokAwal(kelompokAwal) {
  if (Array.isArray(kelompokAwal)) return kelompokAwal.filter(Boolean)
  if (typeof kelompokAwal === 'string' && kelompokAwal) return [kelompokAwal]
  return []
}

export default function DaftarHadirCetak({
  jumlahBaris = 15,
  kelompokAwal = '',
  namaMajelisAwal = '',
  tanggalAwal = '',
  tempatAwal = '',
  pemateriAwal = '',
}) {
  const [namaMajelis, setNamaMajelis] = useState(namaMajelisAwal)
  const [tanggal, setTanggal] = useState(tanggalAwal)
  const [tempat, setTempat] = useState(tempatAwal)
  const [pemateri, setPemateri] = useState(pemateriAwal)

  // Sinkron otomatis kalau data di halaman induk berubah (misalnya admin
  // mengedit Lokasi/Waktu/Tempat/Nama Penyuluh di form kegiatan).
  useEffect(() => {
    setNamaMajelis(namaMajelisAwal)
  }, [namaMajelisAwal])

  useEffect(() => {
    setTanggal(tanggalAwal)
  }, [tanggalAwal])

  useEffect(() => {
    setTempat(tempatAwal)
  }, [tempatAwal])

  useEffect(() => {
    setPemateri(pemateriAwal)
  }, [pemateriAwal])

  // `terpilih` menyimpan id yang dicentang: bisa id flat ('lapas', 'rsu')
  // atau id sub-kelompok ('majelis-taklim::Desa X::Nama Y').
  const [terpilih, setTerpilih] = useState(() => normalisasiKelompokAwal(kelompokAwal))

  // Kalau kelompokAwal berisi slug kategori PENUH ('majelis-taklim' atau
  // 'masyarakat' tanpa sub-kelompok spesifik), itu perlu di-expand jadi
  // seluruh id sub-kelompok begitu daftar sub-kelompok selesai dimuat dari
  // database (karena saat mount, daftar sub-kelompoknya belum tentu ada).
  const [kategoriAwalPending, setKategoriAwalPending] = useState(() =>
    normalisasiKelompokAwal(kelompokAwal).filter((id) =>
      KELOMPOK_BERSUB.some((k) => k.slug === id)
    )
  )

  useEffect(() => {
    const baru = normalisasiKelompokAwal(kelompokAwal)
    setTerpilih(baru)
    setKategoriAwalPending(baru.filter((id) => KELOMPOK_BERSUB.some((k) => k.slug === id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(kelompokAwal) ? kelompokAwal.join(',') : kelompokAwal])

  // Daftar sub-kelompok (Desa + Nama Kelompok) untuk Majelis Taklim &
  // Masyarakat, ditarik langsung dari data anggota tersimpan supaya selalu
  // sinkron dengan Pusat Kelompok Binaan tanpa perlu tabel master terpisah.
  const [subKelompokDaftar, setSubKelompokDaftar] = useState([])
  const [memuatKategori, setMemuatKategori] = useState(true)

  useEffect(() => {
    let dibatalkan = false
    setMemuatKategori(true)
    supabase
      .from('kelompok_binaan_anggota')
      .select('kelompok, desa, nama_kelompok')
      .in(
        'kelompok',
        KELOMPOK_BERSUB.map((k) => k.slug)
      )
      .then(({ data }) => {
        if (dibatalkan) return
        const unik = new Map()
        ;(data || []).forEach((row) => {
          const id = buatIdSub(row.kelompok, row.desa, row.nama_kelompok)
          if (!unik.has(id)) {
            unik.set(id, {
              id,
              kelompok: row.kelompok,
              desa: row.desa || '(Tanpa Desa)',
              namaKelompok: row.nama_kelompok || '(Tanpa Nama Kelompok)',
            })
          }
        })
        const daftar = Array.from(unik.values()).sort((a, b) => {
          if (a.kelompok !== b.kelompok) return a.kelompok.localeCompare(b.kelompok)
          if (a.desa !== b.desa) return a.desa.localeCompare(b.desa)
          return a.namaKelompok.localeCompare(b.namaKelompok)
        })
        setSubKelompokDaftar(daftar)
        setMemuatKategori(false)
      })
    return () => {
      dibatalkan = true
    }
  }, [])

  // Begitu daftar sub-kelompok termuat, expand slug kategori penuh
  // ('majelis-taklim'/'masyarakat') dari prop *Awal jadi id sub-kelompok
  // satu-satu, supaya perilaku lama (pilih 1 kategori = semua anggotanya)
  // tetap jalan untuk halaman induk yang belum diubah.
  useEffect(() => {
    if (kategoriAwalPending.length === 0 || subKelompokDaftar.length === 0) return
    setTerpilih((prev) => {
      let hasil = prev.filter((id) => !kategoriAwalPending.includes(id))
      kategoriAwalPending.forEach((slug) => {
        const idSub = subKelompokDaftar.filter((s) => s.kelompok === slug).map((s) => s.id)
        hasil = Array.from(new Set([...hasil, ...idSub]))
      })
      return hasil
    })
    setKategoriAwalPending([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subKelompokDaftar])

  // Semua id yang bisa dipilih: flat (Lapas, RSU) + seluruh sub-kelompok.
  const semuaId = useMemo(
    () => [...OPSI_KELOMPOK_FLAT.map((o) => o.slug), ...subKelompokDaftar.map((s) => s.id)],
    [subKelompokDaftar]
  )
  const semuaTerpilih = semuaId.length > 0 && semuaId.every((id) => terpilih.includes(id))

  function toggleId(id) {
    setTerpilih((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // Centang/lepas semua sub-kelompok dalam satu kategori (Majelis Taklim
  // ATAU Masyarakat) lewat checkbox header kategori.
  function toggleKategoriPenuh(slug) {
    const idKategori = subKelompokDaftar.filter((s) => s.kelompok === slug).map((s) => s.id)
    const kategoriTerpilihSemua =
      idKategori.length > 0 && idKategori.every((id) => terpilih.includes(id))
    setTerpilih((prev) => {
      if (kategoriTerpilihSemua) return prev.filter((id) => !idKategori.includes(id))
      return Array.from(new Set([...prev, ...idKategori]))
    })
  }

  function togglePilihSemua() {
    setTerpilih(semuaTerpilih ? [] : semuaId)
  }

  const [daftarAnggota, setDaftarAnggota] = useState([])
  const [memuatAnggota, setMemuatAnggota] = useState(false)

  // Anggota ditarik dari kelompok_binaan_anggota lalu difilter di sisi
  // klien sesuai id yang dicentang (flat ATAU sub-kelompok desa+nama_kelompok).
  useEffect(() => {
    if (terpilih.length === 0) {
      setDaftarAnggota([])
      return
    }
    const kelompokFlatTerpilih = OPSI_KELOMPOK_FLAT.map((o) => o.slug).filter((slug) =>
      terpilih.includes(slug)
    )
    const kategoriBerSubTerpilih = KELOMPOK_BERSUB.map((k) => k.slug).filter((slug) =>
      terpilih.some((id) => id.startsWith(`${slug}::`))
    )
    const kelompokUntukQuery = [...kelompokFlatTerpilih, ...kategoriBerSubTerpilih]
    if (kelompokUntukQuery.length === 0) {
      setDaftarAnggota([])
      return
    }
    let dibatalkan = false
    setMemuatAnggota(true)
    supabase
      .from('kelompok_binaan_anggota')
      .select('nama, alamat, desa, kelompok, nama_kelompok')
      .in('kelompok', kelompokUntukQuery)
      .order('kelompok', { ascending: true })
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (dibatalkan) return
        const hasil = (data || []).filter((row) => {
          if (kelompokFlatTerpilih.includes(row.kelompok)) return true
          const idSub = buatIdSub(row.kelompok, row.desa, row.nama_kelompok)
          return terpilih.includes(idSub)
        })
        setDaftarAnggota(hasil)
        setMemuatAnggota(false)
      })
    return () => {
      dibatalkan = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terpilih.join(',')])

  // Kalau anggota kelompok lebih banyak dari jumlahBaris, tabel diperpanjang
  // otomatis supaya semua nama tetap tercetak.
  const totalBaris = Math.max(jumlahBaris, daftarAnggota.length)
  const baris = Array.from({ length: totalBaris })

  const tanggalTampil = tanggal
    ? new Date(tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '.....................................'

  return (
    <div className="mt-8">
      {/* Form isian — hanya tampil di layar, hilang otomatis saat dicetak */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Nama Majelis / Kelompok
          </label>
          <input
            value={namaMajelis}
            onChange={(e) => setNamaMajelis(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Contoh: Majelis Taklim Al-Ikhlas"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tanggal Kegiatan</label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tempat</label>
          <input
            value={tempat}
            onChange={(e) => setTempat(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Contoh: Masjid Al-Ikhlas"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Pemateri / Narasumber</label>
          <input
            value={pemateri}
            onChange={(e) => setPemateri(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            placeholder="Nama pemateri"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Kelompok Binaan (bisa pilih lebih dari satu, sampai level Desa + Nama Kelompok
            untuk Majelis Taklim & Masyarakat — nama peserta terisi otomatis)
          </label>
          <div className="bg-white border border-slate-300 rounded-lg px-3 py-2.5 space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={semuaTerpilih}
                onChange={togglePilihSemua}
                className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              Pilih Semua
            </label>

            {/* Lapas & RSU tetap flat, tanpa sub-kelompok */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-2.5">
              {OPSI_KELOMPOK_FLAT.map((opsi) => (
                <label
                  key={opsi.slug}
                  className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={terpilih.includes(opsi.slug)}
                    onChange={() => toggleId(opsi.slug)}
                    className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  />
                  {opsi.label}
                </label>
              ))}
            </div>

            {/* Majelis Taklim & Masyarakat: sub-kelompok per Desa + Nama Kelompok */}
            {memuatKategori ? (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 border-t border-slate-200 pt-2.5">
                <Loader2 size={12} className="animate-spin" /> Memuat daftar kelompok...
              </p>
            ) : (
              KELOMPOK_BERSUB.map((kategori) => {
                const subKategoriIni = subKelompokDaftar.filter((s) => s.kelompok === kategori.slug)
                if (subKategoriIni.length === 0) return null
                const idKategori = subKategoriIni.map((s) => s.id)
                const kategoriTerpilihSemua = idKategori.every((id) => terpilih.includes(id))
                return (
                  <div key={kategori.slug} className="border-t border-slate-200 pt-2.5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 cursor-pointer mb-1.5">
                      <input
                        type="checkbox"
                        checked={kategoriTerpilihSemua}
                        onChange={() => toggleKategoriPenuh(kategori.slug)}
                        className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                      />
                      {kategori.label} ({subKategoriIni.length} kelompok)
                    </label>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-5">
                      {subKategoriIni.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={terpilih.includes(s.id)}
                            onChange={() => toggleId(s.id)}
                            className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                          />
                          {s.desa} — {s.namaKelompok}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {terpilih.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              {memuatAnggota
                ? 'Memuat daftar nama...'
                : daftarAnggota.length > 0
                ? `${daftarAnggota.length} nama dimuat otomatis dari ${terpilih.length} pilihan. Kelola di Pusat Kelompok Binaan.`
                : 'Belum ada nama tersimpan untuk pilihan ini. Tambahkan lewat Pusat Kelompok Binaan.'}
            </p>
          )}
        </div>
      </div>

      <h2 className="font-display text-[15px] font-semibold text-slate-900 mb-2">
        Daftar Hadir Peserta
      </h2>

      <div className="text-sm text-slate-700 mb-3 space-y-0.5">
        <p>
          <span className="inline-block w-28">Nama Majelis</span>: {namaMajelis || '.....................................'}
        </p>
        <p>
          <span className="inline-block w-28">Tanggal</span>: {tanggalTampil}
        </p>
        <p>
          <span className="inline-block w-28">Tempat</span>: {tempat || '.....................................'}
        </p>
        <p>
          <span className="inline-block w-28">Pemateri</span>: {pemateri || '.....................................'}
        </p>
      </div>

      {memuatAnggota ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6 print:hidden">
          <Loader2 size={16} className="animate-spin" /> Memuat daftar nama...
        </div>
      ) : (
        // Padding & tinggi baris dipersempit (dibanding versi sebelumnya)
        // supaya tabel tidak terlalu tinggi saat dicetak — tujuannya agar
        // blok tanda tangan Kepala KUA/Penyuluh di bawahnya tetap muat di
        // lembar yang sama, tidak terdorong ke halaman/baris sendiri.
        <table className="w-full border-collapse text-sm print:text-xs print:leading-tight">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-1.5 py-1.5 w-8 text-black">No</th>
              <th className="border border-black px-2 py-1.5 text-left text-black">Nama</th>
              <th className="border border-black px-2 py-1.5 text-left text-black">Alamat</th>
              <th className="border border-black px-1.5 py-1.5 w-24 text-black">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((_, i) => {
              const anggota = daftarAnggota[i]
              // Kelompok Majelis Taklim/Masyarakat tidak mengisi alamat per-orang
              // (hanya desa per-kelompok), jadi alamat fallback ke desa kalau kosong.
              const alamatTampil = anggota?.alamat || anggota?.desa || ''
              return (
                <tr key={i}>
                  <td className="border border-black px-1.5 py-1 text-center text-black">{i + 1}</td>
                  <td className="border border-black px-2 py-1 text-black">{anggota?.nama || '\u00A0'}</td>
                  <td className="border border-black px-2 py-1 text-black">{alamatTampil || '\u00A0'}</td>
                  <td className="border border-black px-1.5 py-1 text-black">&nbsp;</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
