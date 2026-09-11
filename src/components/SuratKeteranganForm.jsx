import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import BebanMengajarForm from "./BebanMengajarForm";

// Form Surat Keterangan sudah disederhanakan: sekarang hanya menangani
// "Generate Beban Mengajar" (tidak ada lagi Pindah Sekolah/Izin/Keterangan
// Aktif/Keterangan Lulus/Template Bebas). BebanMengajarForm sudah punya
// format/template sendiri, jadi komponen ini cukup memuat data sekolah
// lalu meneruskannya ke BebanMengajarForm.
export default function SuratKeteranganForm({ onSaved }) {
  const { profil } = useAuth();
  const [sekolah, setSekolah] = useState(null);

  useEffect(() => {
    // profil_sekolah menampung banyak sekolah sekaligus (aplikasi ini
    // multi-sekolah), jadi WAJIB difilter ke sekolah_id milik akun yang
    // login — kalau tidak, .maybeSingle() gagal (banyak baris cocok) dan
    // data sekolah (nama kepsek, NIP, dll) diam-diam jadi kosong.
    if (!profil?.sekolah_id) return;

    async function loadSekolah() {
      const { data, error } = await supabase
        .from("profil_sekolah")
        .select("*")
        .eq("sekolah_id", profil.sekolah_id)
        .maybeSingle();

      if (error) {
        console.error("Gagal memuat profil sekolah:", error);
        return;
      }
      setSekolah(data || null);
    }

    loadSekolah();
  }, [profil?.sekolah_id]);

  return (
    <div className="space-y-4">
      <BebanMengajarForm sekolah={sekolah} onSaved={onSaved} />
    </div>
  );
}
