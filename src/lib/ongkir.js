// src/lib/ongkir.js
//
// Konfigurasi tarif ongkir per kurir & kategori barang.
// ====================================================================
// SEMUA ANGKA DI BAWAH INI CONTOH — WAJIB DIGANTI SESUAI TARIF TOKO ANDA.
// ====================================================================
export const DAFTAR_KURIR = [
  { kode: "jne", label: "JNE" },
  { kode: "jnt", label: "J&T" },
  { kode: "sicepat", label: "SiCepat" },
  { kode: "anteraja", label: "Anteraja" },
  { kode: "gosend", label: "GoSend (Instan)" },
  { kode: "cod", label: "COD (Bayar di Tempat)" },
  // BARU: ambil sendiri di lokasi penjual — tanpa ongkir, tanpa biaya COD.
  // Ditangani secara eksplisit (bukan lewat TARIF_FLAT) di hitungOngkir di bawah.
  { kode: "pickup", label: "Ambil Sendiri (Jemput di Tempat)" },
];

// Kode kurir yang berarti "ambil sendiri" — selalu Rp0, tidak dihitung dari
// TARIF_FLAT / TARIF_PER_KG_HASIL_LAUT (yang memang sengaja tidak diisi
// untuk kode ini).
const KODE_PICKUP = "pickup";

// Tarif FLAT (Rp) untuk kategori "pakaian" & "barang".
// Dikenakan SEKALI per kategori yang muncul di keranjang, bukan per item —
// diasumsikan 1 kategori = 1 paket kemasan. Kalau keranjang berisi pakaian
// DAN barang biasa, kedua tarif flat akan dijumlahkan (2 paket terpisah).
// Catatan: "pickup" sengaja TIDAK didaftarkan di sini — ditangani lewat
// pengecekan KODE_PICKUP di hitungOngkir supaya selalu Rp0 apa pun isi
// keranjangnya, bukan mengandalkan fallback ?? 0.
const TARIF_FLAT = {
  jne: { pakaian: 12000, barang: 15000 },
  jnt: { pakaian: 11000, barang: 14000 },
  sicepat: { pakaian: 11000, barang: 14000 },
  anteraja: { pakaian: 10000, barang: 13000 },
  gosend: { pakaian: 15000, barang: 18000 },
  cod: { pakaian: 13000, barang: 16000 },
};

// Tarif per KG untuk kategori "hasil_laut".
// Ongkir = (berat per satuan x qty) x tarif per kg.
// "pickup" sengaja tidak didaftarkan, sama seperti TARIF_FLAT di atas.
const TARIF_PER_KG_HASIL_LAUT = {
  jne: 8000,
  jnt: 7500,
  sicepat: 7500,
  anteraja: 7000,
  gosend: 10000,
  cod: 8500,
};

// Biaya tambahan khusus COD. Bisa persentase, nominal tetap, atau gabungan.
const BIAYA_COD_PERSEN = 2; // 2% dari (subtotal barang + ongkir)
const BIAYA_COD_FLAT = 0; // atau nominal tetap, mis. 2500

/**
 * Menghitung ongkir + biaya COD berdasarkan isi keranjang & kurir yang dipilih.
 * @param {Array} items - item keranjang, tiap item punya: harga, qty, kategori_ongkir, berat (opsional)
 * @param {string} kurirKode - salah satu kode di DAFTAR_KURIR
 * @returns {{ ongkir: number, rincian: Array, biayaCod: number }}
 */
export function hitungOngkir(items, kurirKode) {
  if (!kurirKode || !items?.length) {
    return { ongkir: 0, rincian: [], biayaCod: 0 };
  }

  // BARU: ambil sendiri di tempat — selalu gratis ongkir, tanpa biaya COD,
  // dan tanpa rincian (tidak ada paket yang benar-benar dikirim).
  if (kurirKode === KODE_PICKUP) {
    return { ongkir: 0, rincian: [], biayaCod: 0 };
  }

  const kategoriFlatSudahDihitung = new Set();
  let ongkir = 0;
  const rincian = [];

  for (const item of items) {
    // Fallback ke "barang" kalau data barang belum punya kategori_ongkir terisi.
    const kategori = item.kategori_ongkir || "barang";

    if (kategori === "hasil_laut") {
      const beratKg = Number(item.berat) || 0; // berat per satuan, dalam kg
      const totalBerat = beratKg * item.qty;
      const tarifKg = TARIF_PER_KG_HASIL_LAUT[kurirKode] || 0;
      const biaya = Math.round(totalBerat * tarifKg);
      ongkir += biaya;
      rincian.push({
        nama: item.nama_barang,
        keterangan: `${totalBerat.toFixed(2)} kg x ${tarifKg.toLocaleString("id-ID")}`,
        biaya,
      });
    } else if (!kategoriFlatSudahDihitung.has(kategori)) {
      const tarifFlat =
        TARIF_FLAT[kurirKode]?.[kategori] ?? TARIF_FLAT[kurirKode]?.barang ?? 0;
      ongkir += tarifFlat;
      kategoriFlatSudahDihitung.add(kategori);
      rincian.push({
        nama: `Kategori: ${kategori}`,
        keterangan: "Tarif flat",
        biaya: tarifFlat,
      });
    }
  }

  let biayaCod = 0;
  if (kurirKode === "cod") {
    const subtotal = items.reduce((sum, it) => sum + it.harga * it.qty, 0);
    biayaCod =
      Math.round(((subtotal + ongkir) * BIAYA_COD_PERSEN) / 100) + BIAYA_COD_FLAT;
  }

  return { ongkir, rincian, biayaCod };
}
