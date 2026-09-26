import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path dengan project kamu
import PendaftaranPasien from "./PendaftaranPasien";
import DaftarPasien from "./DaftarPasien";
import FormKunjungan from "./FormKunjungan";
import TugasHarian from "./TugasHarian";

const TABS = [
  { key: "pendaftaran", label: "Pendaftaran Pasien" },
  { key: "daftar", label: "Daftar Pasien" },
  { key: "kunjungan", label: "Pemeriksaan / Kunjungan" },
  { key: "tugas", label: "Tugas Harian" },
];

export default function HalamanBidan({ profil }) {
  // profil: { id, nama, role, puskesmas_id } — didapat dari sesi login yang sudah ada
  const [tabAktif, setTabAktif] = useState("pendaftaran");
  const [pasienDipilih, setPasienDipilih] = useState(null);
  const [daftarPasien, setDaftarPasien] = useState([]);
  const [loading, setLoading] = useState(false);

  const muatDaftarPasien = useCallback(async () => {
    setLoading(true);
    // pola filter puskesmas_id sama seperti filter sekolah_id di muatData()
    const { data, error } = await supabase
      .from("pasien")
      .select("*")
      .eq("puskesmas_id", profil.puskesmas_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat pasien:", error.message);
    } else {
      setDaftarPasien(data ?? []);
    }
    setLoading(false);
  }, [profil.puskesmas_id]);

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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-3 sm:px-6">
        <h1 className="text-lg font-semibold text-slate-800">
          Laman Bidan / Mantri
        </h1>
        <p className="text-sm text-slate-500">{profil?.nama}</p>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b bg-white px-4 sm:px-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabAktif(tab.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tabAktif === tab.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-4 sm:p-6">
        {tabAktif === "pendaftaran" && (
          <PendaftaranPasien
            profil={profil}
            onTersimpan={handlePasienBaruTersimpan}
          />
        )}

        {tabAktif === "daftar" && (
          <DaftarPasien
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
      </main>
    </div>
  );
}
