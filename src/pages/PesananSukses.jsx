import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

// URL yang disarankan: /toko/:id/pesanan-sukses
// (tokoId dari :id tidak lagi dipakai di sini karena tombol "Kembali ke
// Toko" sekarang menuju /toko, bukan rute /toko/:id/barang yang tidak ada)
//
// PERBAIKAN (tampilan): halaman ini sebelumnya merender <div> polos tanpa
// <Layout>, sehingga Sidebar & header aplikasi hilang total saat dibuka.
// Sekarang dibungkus <Layout> seperti pola di halaman lain (mis. Toko.jsx,
// Keranjang.jsx, Checkout.jsx), plus tampilan kartu sukses dipercantik.
export default function PesananSukses() {
  const navigate = useNavigate();
  const location = useLocation();
  const pesananId = location.state?.pesananId;

  return (
    <Layout title="Pesanan Berhasil" subtitle="Terima kasih atas pesanan Anda">
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="relative w-full max-w-md overflow-hidden bg-white border border-gray-100 shadow-xl rounded-2xl">
          {/* Aksen gradient di atas kartu */}
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600" />

          <div className="px-6 py-10 text-center sm:px-10">
            {/* Ikon centang dengan efek ping */}
            <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-6">
              <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-30 animate-ping" />
              <span className="relative inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            </div>

            <h1 className="mb-2 text-xl font-bold text-gray-800">
              Pesanan Berhasil Dibuat!
            </h1>
            <p className="mb-6 text-sm text-gray-500">
              Terima kasih, pesananmu sudah kami terima dan akan segera
              diproses oleh penjual.
            </p>

            {pesananId && (
              <div className="px-4 py-3 mb-8 border border-dashed rounded-lg bg-gray-50 border-gray-200">
                <p className="mb-1 text-xs tracking-wide text-gray-400 uppercase">
                  Nomor Pesanan
                </p>
                <p className="text-sm font-semibold text-gray-700 break-all font-mono">
                  {pesananId}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/toko")}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white transition bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:scale-[0.98]"
              >
                Kembali ke Toko
              </button>
              <button
                onClick={() => navigate("/riwayat-pesanan")}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 transition bg-gray-100 rounded-lg hover:bg-gray-200 active:scale-[0.98]"
              >
                Lihat Riwayat Pesanan
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
