import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../lib/CartContext";
import Layout from "../components/Layout";
import { DAFTAR_KURIR, hitungOngkir } from "../lib/ongkir";

// Rute yang disarankan: /toko/:id/pengiriman
// Ditempatkan di antara halaman Keranjang dan Checkout:
//   Keranjang -> PilihPengiriman (halaman ini) -> Checkout
//
// Pembeli memilih kurir di sini, kurirnya disimpan lewat CartContext
// (setKurirToko) supaya persist di localStorage sama seperti isi
// keranjang, lalu halaman Checkout tinggal membacanya (getKurir) tanpa
// perlu dropdown lagi di situ.

export default function PilihPengiriman() {
  const { id: tokoId } = useParams();
  const navigate = useNavigate();
  const { getCartItems, getKurir, setKurirToko } = useCart();

  const items = getCartItems(tokoId);
  const [kurir, setKurir] = useState(getKurir(tokoId));

  const formatRupiah = (angka) => {
    const n = Number(angka) || 0;
    return n.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    });
  };

  const total = items.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const { ongkir, rincian, biayaCod } = hitungOngkir(items, kurir);
  const grandTotal = total + ongkir + biayaCod;
  const isCod = kurir === "cod";

  const handleLanjut = () => {
    if (!kurir) return;
    setKurirToko(tokoId, kurir);
    navigate(`/toko/${tokoId}/checkout`);
  };

  if (items.length === 0) {
    return (
      <Layout title="Pilih Pengiriman" subtitle="Pilih jasa pengiriman untuk pesanan Anda">
        <p className="text-sm text-gray-500">
          Keranjang masih kosong.{" "}
          <button
            onClick={() => navigate("/toko")}
            className="text-blue-600 hover:underline"
          >
            Kembali belanja
          </button>
        </p>
      </Layout>
    );
  }

  return (
    <Layout title="Pilih Pengiriman" subtitle="Pilih jasa pengiriman untuk pesanan Anda">
      <div className="max-w-xl">
        <button
          onClick={() => navigate(`/toko/${tokoId}/keranjang`)}
          className="mb-3 text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali ke Keranjang
        </button>

        <div className="mb-4 border rounded">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
            >
              <div>
                <div className="font-medium">{item.nama_barang}</div>
                <div className="text-xs text-gray-500">
                  {item.qty} {item.satuan} x {formatRupiah(item.harga)}
                </div>
              </div>
              <div className="font-medium">
                {formatRupiah(item.harga * item.qty)}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 font-semibold bg-gray-50">
            <span>Subtotal Barang</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        <div className="mb-4 p-3 border rounded bg-gray-50">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Jasa Pengiriman
          </p>

          <label className="block mb-1 text-xs text-gray-500">
            Pilih Kurir
          </label>
          <select
            value={kurir}
            onChange={(e) => setKurir(e.target.value)}
            className="w-full px-3 py-2 mb-3 border rounded bg-white"
          >
            <option value="">-- Pilih jasa pengiriman --</option>
            {DAFTAR_KURIR.map((k) => (
              <option key={k.kode} value={k.kode}>
                {k.label}
              </option>
            ))}
          </select>

          {kurir && (
            <div className="text-sm">
              {rincian.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 text-gray-600">
                  <span>{r.nama} ({r.keterangan})</span>
                  <span>{formatRupiah(r.biaya)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-0.5 font-medium">
                <span>Ongkos Kirim</span>
                <span>{formatRupiah(ongkir)}</span>
              </div>
              {isCod && (
                <div className="flex items-center justify-between py-0.5 text-gray-600">
                  <span>Biaya COD</span>
                  <span>{formatRupiah(biayaCod)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 mb-4 font-semibold border rounded bg-gray-50">
          <span>Total Sementara</span>
          <span>{formatRupiah(grandTotal)}</span>
        </div>

        <button
          onClick={handleLanjut}
          disabled={!kurir}
          className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Lanjut ke Checkout
        </button>
      </div>
    </Layout>
  );
}
