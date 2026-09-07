import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda

/**
 * Bungkus konten fitur premium dengan komponen ini.
 * Kalau user paketnya "free", konten asli diganti tampilan terkunci
 * yang mengarahkan ke halaman /upgrade-fitur.
 *
 * Contoh pakai:
 *   <FiturPremium nama="AI RPP">
 *     <AiRppModal ... />
 *   </FiturPremium>
 *
 * Untuk kasus tombol/menu (bukan seluruh blok konten), pakai hook
 * `usePaketPremium()` di bawah supaya bisa custom sendiri tampilannya.
 */
export function FiturPremium({ nama, children }) {
  const { isPremium } = useAuth();

  if (isPremium) return children;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <Lock className="h-8 w-8 text-amber-500" />
      <div>
        <p className="font-medium text-slate-800">
          {nama ? `${nama} adalah fitur Premium` : "Fitur ini khusus Premium"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Upgrade paket Anda untuk membuka fitur ini beserta fitur premium lainnya.
        </p>
      </div>
      <Link
        to="/upgrade-fitur"
        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
      >
        Lihat Paket Upgrade
      </Link>
    </div>
  );
}

/**
 * Untuk kasus tombol/menu (bukan seluruh blok konten) yang mau dinonaktifkan
 * sendiri tanpa memakai <FiturPremium>, cukup ambil `isPremium` langsung
 * dari useAuth(), contoh:
 *   const { isPremium } = useAuth();
 *   <button disabled={!isPremium}>Generate Surat Keterangan</button>
 */
