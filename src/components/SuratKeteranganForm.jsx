import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BebanMengajarForm from "./BebanMengajarForm";

// Form Surat Keterangan sudah disederhanakan: sekarang hanya menangani
// "Generate Beban Mengajar" (tidak ada lagi Pindah Sekolah/Izin/Keterangan
// Aktif/Keterangan Lulus/Template Bebas). BebanMengajarForm sudah punya
// format/template sendiri, jadi komponen ini cukup memuat data sekolah
// lalu meneruskannya ke BebanMengajarForm.
export default function SuratKeteranganForm({ onSaved }) {
  const [sekolah, setSekolah] = useState(null);

  useEffect(() => {
    async function loadSekolah() {
      const { data, error } = await supabase
        .from("profil_sekolah")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Gagal memuat profil sekolah:", error);
        return;
      }
      setSekolah(data || null);
    }

    loadSekolah();
  }, []);

  return (
    <div className="space-y-4">
      <BebanMengajarForm sekolah={sekolah} onSaved={onSaved} />
    </div>
  );
}
