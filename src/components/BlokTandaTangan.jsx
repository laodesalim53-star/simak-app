// Simpan sebagai: src/components/BlokTandaTangan.jsx
//
// Aturan tanda tangan "Mengetahui" pada dokumen/laporan cetak:
//
//   - Pembuat laporan = PEGAWAI (penyuluh, penghulu, staf, dst.)
//       Mengetahui: Kepala KUA          | Pembuat: pegawai
//   - Pembuat laporan = KEPALA KUA sendiri
//       Mengetahui: Kepala Kemenag      | Pembuat: Kepala KUA
//
// Mode dipilih OTOMATIS: kalau NIP (atau, bila NIP kosong, nama) pembuat sama
// dengan Kepala KUA di Profil Kantor, dianggap Kepala KUA. Bisa dipaksa manual
// lewat <PilihModeTtd /> di form (bagian yang tidak ikut tercetak).

const PLACEHOLDER = '..............................'

const normNip = (s) => String(s || '').replace(/\D/g, '')

// Nama dibandingkan tanpa gelar & tanda baca: "FAHRUR ROZI, S.H." dan
// "Fahrur Rozi" dianggap sama. Gelar belakang (setelah koma) dan gelar depan
// yang umum (Dr., Drs., H., Hj., Ir., Prof.) diabaikan.
const GELAR_DEPAN = new Set(['dr', 'drs', 'dra', 'h', 'hj', 'ir', 'prof'])
function normNama(s) {
  const tanpaGelarBelakang = String(s || '').toLowerCase().split(',')[0]
  return tanpaGelarBelakang
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t && !GELAR_DEPAN.has(t))
    .join('')
}

/**
 * @param mode 'otomatis' | 'pegawai' | 'kepala_kua'
 * @returns 'pegawai' | 'kepala_kua'
 *
 * Mode otomatis: pembuat dianggap Kepala KUA kalau NIP-nya ATAU namanya sama
 * dengan Kepala KUA di Profil Kantor. (Sengaja "atau": kalau NIP di akun
 * pembuat salah ketik/berbeda, nama yang sama tetap dikenali.)
 */
export function tentukanModeTtd({ mode = 'otomatis', profilKantor, namaPembuat, nipPembuat }) {
  if (mode === 'pegawai' || mode === 'kepala_kua') return mode

  const nipKepala = normNip(profilKantor?.nip_kepala_kua)
  const nipPembuatBersih = normNip(nipPembuat)
  const samaNip = !!nipKepala && !!nipPembuatBersih && nipKepala === nipPembuatBersih

  const namaKepala = normNama(profilKantor?.kepala_kua)
  const namaPembuatBersih = normNama(namaPembuat)
  const samaNama = !!namaKepala && !!namaPembuatBersih && namaKepala === namaPembuatBersih

  return samaNip || samaNama ? 'kepala_kua' : 'pegawai'
}

// Pilihan penandatangan untuk form (tidak ikut tercetak — taruh di dalam
// area .no-print).
export function PilihModeTtd({ value, onChange, profilKantor, namaPembuat, nipPembuat }) {
  const efektif = tentukanModeTtd({ mode: value, profilKantor, namaPembuat, nipPembuat })
  const kemenagKosong = efektif === 'kepala_kua' && !profilKantor?.kepala_kemenag

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs font-medium text-slate-600 mb-1">
        Penandatangan &quot;Mengetahui&quot;
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <option value="otomatis">Otomatis (dikenali dari NIP/nama pembuat)</option>
        <option value="pegawai">Pembuat pegawai — diketahui Kepala KUA</option>
        <option value="kepala_kua">Pembuat Kepala KUA — diketahui Kepala Kemenag</option>
      </select>
      <p className="text-xs text-slate-400 mt-1">
        Saat ini:{' '}
        {efektif === 'kepala_kua'
          ? 'laporan dibuat Kepala KUA, jadi diketahui Kepala Kemenag.'
          : 'laporan dibuat pegawai, jadi diketahui Kepala KUA.'}
      </p>
      {kemenagKosong && (
        <p className="text-xs text-amber-600 mt-1">
          Nama Kepala Kemenag belum diisi di Profil Kantor, jadi tercetak sebagai titik-titik.
        </p>
      )}
    </div>
  )
}

/**
 * Blok tanda tangan dua kolom untuk lembar cetak.
 *
 * Props:
 *  - profilKantor        baris profil_kantor (harus memuat kepala_kua, nip_kepala_kua,
 *                        kepala_kemenag, nip_kepala_kemenag, kabupaten, kecamatan)
 *  - ttdKepalaKuaUrl     URL gambar tanda tangan Kepala KUA (opsional)
 *  - mode                'otomatis' | 'pegawai' | 'kepala_kua'
 *  - namaPembuat / nipPembuat / jabatanPembuat / labelNipPembuat
 *  - tempatTanggal       mis. "Fakfak, 19 September 2026" (boleh kosong)
 */
export default function BlokTandaTangan({
  profilKantor,
  ttdKepalaKuaUrl,
  mode = 'otomatis',
  namaPembuat,
  nipPembuat,
  jabatanPembuat = 'Pembuat Laporan',
  labelNipPembuat = 'NIP.',
  tempatTanggal = '',
}) {
  const modeEfektif = tentukanModeTtd({ mode, profilKantor, namaPembuat, nipPembuat })
  const adalahKepalaKua = modeEfektif === 'kepala_kua'

  const labelKuaKecamatan = `Kepala KUA Kecamatan ${profilKantor?.kecamatan || '................'}`

  // Kolom kiri — pihak yang "Mengetahui"
  const kiri = adalahKepalaKua
    ? {
        baris1: 'Kepala Kantor Kementerian Agama',
        baris2: profilKantor?.kabupaten || 'Kabupaten/Kota ................',
        ttdUrl: null, // belum ada kolom tanda tangan Kepala Kemenag — dibiarkan kosong untuk tanda tangan basah
        nama: profilKantor?.kepala_kemenag || PLACEHOLDER,
        nip: profilKantor?.nip_kepala_kemenag || PLACEHOLDER,
        labelNip: 'NIP.',
      }
    : {
        baris1: labelKuaKecamatan,
        baris2: null,
        ttdUrl: ttdKepalaKuaUrl,
        nama: profilKantor?.kepala_kua || PLACEHOLDER,
        nip: profilKantor?.nip_kepala_kua || PLACEHOLDER,
        labelNip: 'NIP.',
      }

  // Kolom kanan — pembuat laporan
  const kanan = adalahKepalaKua
    ? {
        jabatan: labelKuaKecamatan,
        ttdUrl: ttdKepalaKuaUrl,
        nama: profilKantor?.kepala_kua || namaPembuat || PLACEHOLDER,
        nip: profilKantor?.nip_kepala_kua || nipPembuat || PLACEHOLDER,
        labelNip: 'NIP.',
      }
    : {
        jabatan: jabatanPembuat,
        ttdUrl: null,
        nama: namaPembuat || PLACEHOLDER,
        nip: nipPembuat || PLACEHOLDER,
        labelNip: labelNipPembuat,
      }

  return (
    <div className="ttd-block flex justify-between mt-10 text-sm text-slate-700">
      <div className="text-center w-64">
        <div className="min-h-[5rem]">
          <p>Mengetahui,</p>
          <p>{kiri.baris1}</p>
          {kiri.baris2 ? <p>{kiri.baris2}</p> : null}
        </div>
        <div className="h-20 flex items-end justify-center">
          {kiri.ttdUrl && (
            <img src={kiri.ttdUrl} alt="Tanda tangan" className="max-h-20 object-contain" />
          )}
        </div>
        <p className="font-semibold border-t border-slate-400 pt-1">({kiri.nama})</p>
        <p className="text-xs text-slate-500">
          {kiri.labelNip} {kiri.nip}
        </p>
      </div>

      <div className="text-center w-64">
        <div className="min-h-[5rem]">
          <p>{tempatTanggal || '\u00A0'}</p>
          <p>{kanan.jabatan}</p>
        </div>
        <div className="h-20 flex items-end justify-center">
          {kanan.ttdUrl && (
            <img src={kanan.ttdUrl} alt="Tanda tangan" className="max-h-20 object-contain" />
          )}
        </div>
        <p className="font-semibold border-t border-slate-400 pt-1">({kanan.nama})</p>
        <p className="text-xs text-slate-500">
          {kanan.labelNip} {kanan.nip}
        </p>
      </div>
    </div>
  )
}
