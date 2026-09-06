// src/lib/ongkir.js
//
// ====================================================================
// VERSI KHUSUS WILAYAH TIMUR (tahap awal): Dobo (Kab. Kepulauan Aru) <-> Ambon
// ====================================================================
// PENTING — WAJIB DIKONFIRMASI SEBELUM GO-LIVE:
// Angka di bawah adalah ESTIMASI berdasarkan referensi tarif publik yang
// ditemukan untuk rute SEJENIS (Ambon<->Dobo untuk JNE, dan Jakarta->Ambon
// untuk Pos Indonesia yang lalu diperkirakan turun karena rute Dobo-Ambon
// jauh lebih dekat). BUKAN tarif resmi dari agen di Dobo. Sebelum toko
// live, datangi/telepon kantor JNE dan Pos Indonesia Dobo, minta tarif
// resmi Dobo -> Ambon (dan sebaliknya) per kg, lalu ganti angka di bawah.
//
// Kenapa modelnya per-KG (bukan flat per kategori seperti versi lama)?
// Kurir ke wilayah kepulauan/timur menghitung ongkos berdasarkan berat
// aktual (kadang dibandingkan juga dengan berat volumetrik), bukan jenis
// barang. Jadi setiap barang di `barang` WAJIB punya kolom berat (kg) —
// kalau belum ada, pakai fallback DEFAULT_BERAT_KG di bawah dulu.
// ====================================================================

export const DAFTAR_KURIR = [
  { kode: "jne", label: "JNE" },
  { kode: "pos", label: "Pos Indonesia (Kilat Khusus)" },
  { kode: "cod", label: "COD (Bayar di Tempat)" },
  { kode: "pickup", label: "Ambil Sendiri (Jemput di Tempat)" },
  // SiCepat, Anteraja, GoSend SENGAJA dihapus dari sini — belum ada bukti
  // ketiganya melayani Dobo/Kepulauan Aru. Tambahkan lagi kalau ternyata
  // ada agen resmi di daerah Anda.
];

const KODE_PICKUP = "pickup";

// Berat default (kg) kalau data barang belum punya kolom berat sendiri.
// Baju/kaos ringan umumnya 0.2-0.3 kg, jaket/celana lebih berat.
// SEBAIKNYA setiap barang di tabel `barang` diisi berat aslinya — ini
// cuma jaring pengaman kalau kolomnya kosong.
const DEFAULT_BERAT_KG = 0.3;

// --- Tarif per kg, rute Dobo <-> Ambon --------------------------------
// ESTIMASI, WAJIB DIKONFIRMASI KE AGEN LOKAL (lihat catatan di atas).
const TARIF_PER_KG = {
  jne: 40000, // referensi: JNE REG Ambon-Dobo 1kg ~Rp40.000 (arah sebaliknya)
  pos: 35000, // referensi kasar, Pos Kilat Khusus Jakarta-Ambon ~79rb-90rb/kg,
              // diperkirakan lebih murah untuk rute sesama Maluku (Dobo-Ambon)
  cod: 42000, // JNE/Pos + sedikit tambahan biaya layanan COD-nya
};

// Berat minimum yang ditagih per pengiriman (kg), sesuai kebiasaan kurir:
// JNE membulatkan ke atas ke kelipatan 1 kg (toleransi 0.3kg).
// Pos Indonesia membulatkan ke kelipatan 0.25kg untuk <1kg, lalu per kg.
function bulatkanBerat(kurirKode, totalKg) {
  if (kurirKode === "pos") {
    // bulatkan ke atas ke kelipatan 0.25
    return Math.max(0.25, Math.ceil(totalKg / 0.25) * 0.25);
  }
  // jne & cod: minimum 1kg, toleransi 0.3kg lalu bulat ke atas per 1kg
  if (totalKg <= 1) return 1;
  const lebih = totalKg - 1;
  return 1 + Math.ceil(Math.max(0, lebih - 0.3));
}

// Biaya tambahan khusus COD (selain ongkos kirim itu sendiri).
// Silakan sesuaikan kalau kebijakan tokonya beda.
const BIAYA_COD_PERSEN = 2; // 2% dari (subtotal barang + ongkir)
const BIAYA_COD_FLAT = 0;

/**
 * Menghitung ongkir + biaya COD berdasarkan isi keranjang & kurir yang dipilih.
 * @param {Array} items - item keranjang: { harga, qty, berat? (kg per satuan) }
 * @param {string} kurirKode - salah satu kode di DAFTAR_KURIR
 * @returns {{ ongkir: number, rincian: Array, biayaCod: number }}
 */
export function hitungOngkir(items, kurirKode) {
  if (!kurirKode || !items?.length) {
    return { ongkir: 0, rincian: [], biayaCod: 0 };
  }

  if (kurirKode === KODE_PICKUP) {
    return { ongkir: 0, rincian: [], biayaCod: 0 };
  }

  const totalBeratAktual = items.reduce((sum, item) => {
    const beratSatuan = Number(item.berat) || DEFAULT_BERAT_KG;
    return sum + beratSatuan * item.qty;
  }, 0);

  const beratDitagih = bulatkanBerat(kurirKode, totalBeratAktual);
  const tarifKg = TARIF_PER_KG[kurirKode] || 0;
  const ongkir = Math.round(beratDitagih * tarifKg);

  const rincian = [
    {
      nama: "Berat total",
      keterangan: `${totalBeratAktual.toFixed(2)} kg (ditagih ${beratDitagih.toFixed(2)} kg) x Rp${tarifKg.toLocaleString("id-ID")}/kg`,
      biaya: ongkir,
    },
  ];

  let biayaCod = 0;
  if (kurirKode === "cod") {
    const subtotal = items.reduce((sum, it) => sum + it.harga * it.qty, 0);
    biayaCod =
      Math.round(((subtotal + ongkir) * BIAYA_COD_PERSEN) / 100) + BIAYA_COD_FLAT;
  }

  return { ongkir, rincian, biayaCod };
}
