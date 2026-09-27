import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path dengan project kamu
import Layout from "./Layout";
import PendaftaranPasien from "./PendaftaranPasien";
import DaftarPasien from "./DaftarPasien";
import FormKunjungan from "./FormKunjungan";
import TugasHarian from "./TugasHarian";
import { UserPlus, Users, Stethoscope, ListChecks } from "lucide-react";

const TABS = [
  { key: "pendaftaran", label: "Pendaftaran", icon: UserPlus, aksen: "emerald" },
  { key: "daftar", label: "Daftar Pasien", icon: Users, aksen: "sky" },
  { key: "kunjungan", label: "Pemeriksaan", icon: Stethoscope, aksen: "amber" },
  { key: "tugas", label: "Tugas Harian", icon: ListChecks, aksen: "violet" },
];

// Kelas Tailwind per warna aksen ditulis eksplisit (bukan diracik dari
// string) supaya tetap ikut ter-generate oleh Tailwind JIT.
const AKSEN = {
  emerald: {
    aktif: "border-emerald-600 text-emerald-700 bg-emerald-50",
    dot: "bg-emerald-500",
  },
  sky: {
    aktif: "border-sky-600 text-sky-700 bg-sky-50",
    dot: "bg-sky-500",
  },
  amber: {
    aktif: "border-amber-600 text-amber-700 bg-amber-50",
    dot: "bg-amber-500",
  },
  violet: {
    aktif: "border-violet-600 text-violet-700 bg-violet-50",
    dot: "bg-violet-500",
  },
};

export default function HalamanBidan({ profil }) {
  // profil: { nama, role, sekolah_id, jenis_organisasi } — tenant puskesmas memakai
  // kolom sekolah_id yang sama dengan sekolah/kantor, dibedakan lewat jenis_organisasi.
  // CATATAN: profil.id TIDAK bisa dipakai (loadProfil() di AuthContext.jsx tidak
  // men-select kolom id, jadi selalu undefined). Kalau butuh id user, ambil dari
  // session.user.id / supabase.auth.getUser(), bukan dari profil.id.
  const [tabAktif, setTabAktif] = useState("pendaftaran");
  const [pasienDipilih, setPasienDipilih] = useState(null);
  const [daftarPasien, setDaftarPasien] = useState([]);
  const [loading, setLoading] = useState(false);

  const muatDaftarPasien = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pasien")
      .select("*")
      .eq("sekolah_id", profil.sekolah_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat pasien:", error.message);
    } else {
      setDaftarPasien(data ?? []);
    }
    setLoading(false);
  }, [profil.sekolah_id]);

  useEffect(() => {
    muatDaftarPasien();
  }, [muatDaftarPasien]);

  const handlePasienBaruTersimpan = () => {
    muatDaftarPasien();
    setTabAktif("daftar");
  };

  const bukaKunjunganUntuk = (pasien) => {
    setPasienDipilih(pasien);
    setTabAktif("kunjungan");
  };

  return (
    <Layout
      title="Laman Bidan / Mantri"
      subtitle={profil?.nama ? `Masuk sebagai ${profil.nama}` : undefined}
    >
      {/* Tab navigasi: scroll horizontal di layar sempit (Android), dengan
          scroll-snap supaya berhenti pas di tiap tab, tap-target diperbesar
          (py-2.5 + gap) supaya nyaman disentuh jari. */}
      <nav
        className="-mx-4 sm:mx-0 mb-5 flex gap-1.5 overflow-x-auto px-4 sm:px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x proximity" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const aktif = tabAktif === tab.key;
          const warna = AKSEN[tab.aksen];
          return (
            <button
              key={tab.key}
              onClick={() => setTabAktif(tab.key)}
              style={{ scrollSnapAlign: "start" }}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                aktif
                  ? warna.aktif
                  : "border-transparent bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon size={16} strokeWidth={2.25} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        {tabAktif === "pendaftaran" && (
          <PendaftaranPasien
            profil={profil}
            onTersimpan={handlePasienBaruTersimpan}
          />
        )}

         {tabAktif === "daftar" && (
           <DaftarPasien
            profil={profil}
            data={daftarPasien}
            loading={loading}
            onRefresh={muatDaftarPasien}
            onPilihKunjungan={bukaKunjunganUntuk}
        />
      )}

        {tabAktif === "kunjungan" && (
          <FormKunjungan
            profil={profil}
            pasien={pasienDipilih}
            daftarPasien={daftarPasien}
            onGantiPasien={setPasienDipilih}
            onSelesai={() => setTabAktif("daftar")}
          />
        )}

        {tabAktif === "tugas" && <TugasHarian profil={profil} />}
      </div>
    </Layout>
  );
}
