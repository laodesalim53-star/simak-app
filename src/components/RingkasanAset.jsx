import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda

// Komponen "tempel jadi": menarik data dari tabel `bangunan` dan `inventaris`
// lalu menampilkannya sebagai tabel ringkasan kondisi yang siap cetak.
// Dipakai di laporan Kepala Sekolah dan Laporan Kepala KUA.
//
// Contoh pemakaian:
//   <RingkasanAset />
//   <RingkasanAset tampil={["bangunan"]} />
//   <RingkasanAset rinci />                 // inventaris dirinci per nama barang, bukan per kategori
//   <RingkasanAset judulBangunan="B. Kondisi Bangunan" judulAset="C. Kondisi Peralatan dan Inventaris" />

// Isi kolom "kondisi" di inventaris ditulis bebas oleh pengguna (mis. "baik",
// "Baik", "rusak ringan", "Rusak_Berat"), jadi dinormalisasi dulu sebelum dihitung.
function normalisasiKondisi(nilai) {
  const t = String(nilai || "").toLowerCase().replace(/[_-]+/g, " ").trim();
  if (t.includes("berat")) return "rusak_berat";
  if (t.includes("ringan") || t.includes("sedang")) return "rusak_ringan";
  if (t.startsWith("tidak")) return "lainnya";
  if (t.includes("baik")) return "baik";
  return "lainnya";
}

function ringkasPerKunci(baris, ambilKunci) {
  const peta = new Map();
  for (const b of baris) {
    const kunci = (ambilKunci(b) || "").toString().trim().toUpperCase() || "TANPA KATEGORI";
    const jumlah = Number(b.jumlah) || 0;
    const kondisi = normalisasiKondisi(b.kondisi);
    const r = peta.get(kunci) || {
      nama: kunci,
      baik: 0,
      rusak_ringan: 0,
      rusak_berat: 0,
      lainnya: 0,
    };
    r[kondisi] += jumlah;
    peta.set(kunci, r);
  }
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

const jumlahBaris = (r) => r.baik + r.rusak_ringan + r.rusak_berat + r.lainnya;

const TH = "border border-black px-2 py-1 text-center font-semibold align-middle";
const TD = "border border-black px-2 py-1";
const TD_ANGKA = `${TD} text-center`;

export default function RingkasanAset({
  sekolahId: sekolahIdProp = null, // opsional; bawaan: sekolahId akun yang login
  tampil = ["bangunan", "aset"],
  rinci = false,
  judulBangunan = "Kondisi Bangunan",
  judulAset = "Kondisi Peralatan dan Barang Inventaris",
  className = "",
}) {
  const { sekolahId } = useAuth();
  const idSekolah = sekolahIdProp || sekolahId;
  const tampilBangunan = tampil.includes("bangunan");
  const tampilAset = tampil.includes("aset");

  const [bangunan, setBangunan] = useState([]);
  const [inventaris, setInventaris] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let aktif = true;

    async function muat() {
      setMemuat(true);
      setGalat("");

      let qB = supabase
        .from("bangunan")
        .select("nama, jenis, jumlah, luas_m2, tahun_dibangun, status_kepemilikan, kondisi")
        .order("nama");
      let qA = supabase.from("inventaris").select("nama_barang, kategori, jumlah, kondisi");
      if (idSekolah) {
        qB = qB.eq("sekolah_id", idSekolah);
        qA = qA.eq("sekolah_id", idSekolah);
      }

      const [hasilB, hasilA] = await Promise.all([
        tampilBangunan ? qB : Promise.resolve({ data: [] }),
        tampilAset ? qA : Promise.resolve({ data: [] }),
      ]);

      if (!aktif) return;
      const pesan = [hasilB.error?.message, hasilA.error?.message].filter(Boolean).join(" | ");
      if (pesan) setGalat(pesan);
      setBangunan(hasilB.data || []);
      setInventaris(hasilA.data || []);
      setMemuat(false);
    }

    muat();
    return () => {
      aktif = false;
    };
  }, [idSekolah, tampilBangunan, tampilAset]);

  const barisAset = useMemo(
    () => ringkasPerKunci(inventaris, (b) => (rinci ? b.nama_barang : b.kategori)),
    [inventaris, rinci]
  );
  const adaLainnya = barisAset.some((r) => r.lainnya > 0);
  const totalAset = barisAset.reduce(
    (t, r) => ({
      baik: t.baik + r.baik,
      rusak_ringan: t.rusak_ringan + r.rusak_ringan,
      rusak_berat: t.rusak_berat + r.rusak_berat,
      lainnya: t.lainnya + r.lainnya,
    }),
    { baik: 0, rusak_ringan: 0, rusak_berat: 0, lainnya: 0 }
  );

  const totalBangunan = bangunan.reduce(
    (t, b) => {
      const jml = Number(b.jumlah) || 0;
      const k = normalisasiKondisi(b.kondisi);
      t[k] += jml;
      return t;
    },
    { baik: 0, rusak_ringan: 0, rusak_berat: 0, lainnya: 0 }
  );

  if (memuat) {
    return <p className="text-sm text-slate-500 print:hidden">Memuat data aset...</p>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Pesan galat hanya tampil di layar, tidak ikut tercetak */}
      {galat && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 print:hidden">
          Sebagian data gagal dimuat: {galat}. Pastikan SQL tabel bangunan sudah dijalankan.
        </p>
      )}

      {tampilBangunan && (
        <section className="break-inside-avoid">
          <h3 className="mb-1 text-[11pt] font-semibold">{judulBangunan}</h3>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th rowSpan={2} className={TH}>No</th>
                <th rowSpan={2} className={TH}>Nama Bangunan / Ruang</th>
                <th rowSpan={2} className={TH}>Luas (m²)</th>
                <th rowSpan={2} className={TH}>Tahun</th>
                <th rowSpan={2} className={TH}>Status</th>
                <th colSpan={3} className={TH}>Kondisi</th>
                <th rowSpan={2} className={TH}>Jumlah</th>
              </tr>
              <tr>
                <th className={TH}>Baik</th>
                <th className={TH}>Rusak Ringan</th>
                <th className={TH}>Rusak Berat</th>
              </tr>
            </thead>
            <tbody>
              {bangunan.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`${TD} text-center italic`}>
                    Belum ada data bangunan
                  </td>
                </tr>
              ) : (
                bangunan.map((b, i) => {
                  const k = normalisasiKondisi(b.kondisi);
                  const jml = Number(b.jumlah) || 0;
                  return (
                    <tr key={`${b.nama}-${i}`}>
                      <td className={TD_ANGKA}>{i + 1}</td>
                      <td className={TD}>{b.nama}</td>
                      <td className={TD_ANGKA}>{b.luas_m2 ?? "-"}</td>
                      <td className={TD_ANGKA}>{b.tahun_dibangun ?? "-"}</td>
                      <td className={TD}>{b.status_kepemilikan || "-"}</td>
                      <td className={TD_ANGKA}>{k === "baik" ? jml : "-"}</td>
                      <td className={TD_ANGKA}>{k === "rusak_ringan" ? jml : "-"}</td>
                      <td className={TD_ANGKA}>{k === "rusak_berat" ? jml : "-"}</td>
                      <td className={TD_ANGKA}>{jml}</td>
                    </tr>
                  );
                })
              )}
              {bangunan.length > 0 && (
                <tr className="font-semibold">
                  <td colSpan={5} className={`${TD} text-center`}>Jumlah</td>
                  <td className={TD_ANGKA}>{totalBangunan.baik}</td>
                  <td className={TD_ANGKA}>{totalBangunan.rusak_ringan}</td>
                  <td className={TD_ANGKA}>{totalBangunan.rusak_berat}</td>
                  <td className={TD_ANGKA}>{jumlahBaris(totalBangunan)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tampilAset && (
        <section className="break-inside-avoid">
          <h3 className="mb-1 text-[11pt] font-semibold">{judulAset}</h3>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr>
                <th rowSpan={2} className={TH}>No</th>
                <th rowSpan={2} className={TH}>{rinci ? "Nama Barang" : "Kategori"}</th>
                <th colSpan={adaLainnya ? 4 : 3} className={TH}>Kondisi</th>
                <th rowSpan={2} className={TH}>Jumlah</th>
              </tr>
              <tr>
                <th className={TH}>Baik</th>
                <th className={TH}>Rusak Ringan</th>
                <th className={TH}>Rusak Berat</th>
                {adaLainnya && <th className={TH}>Lainnya</th>}
              </tr>
            </thead>
            <tbody>
              {barisAset.length === 0 ? (
                <tr>
                  <td colSpan={adaLainnya ? 7 : 6} className={`${TD} text-center italic`}>
                    Belum ada data inventaris
                  </td>
                </tr>
              ) : (
                barisAset.map((r, i) => (
                  <tr key={r.nama}>
                    <td className={TD_ANGKA}>{i + 1}</td>
                    <td className={TD}>{r.nama}</td>
                    <td className={TD_ANGKA}>{r.baik}</td>
                    <td className={TD_ANGKA}>{r.rusak_ringan}</td>
                    <td className={TD_ANGKA}>{r.rusak_berat}</td>
                    {adaLainnya && <td className={TD_ANGKA}>{r.lainnya}</td>}
                    <td className={TD_ANGKA}>{jumlahBaris(r)}</td>
                  </tr>
                ))
              )}
              {barisAset.length > 0 && (
                <tr className="font-semibold">
                  <td colSpan={2} className={`${TD} text-center`}>Jumlah</td>
                  <td className={TD_ANGKA}>{totalAset.baik}</td>
                  <td className={TD_ANGKA}>{totalAset.rusak_ringan}</td>
                  <td className={TD_ANGKA}>{totalAset.rusak_berat}</td>
                  {adaLainnya && <td className={TD_ANGKA}>{totalAset.lainnya}</td>}
                  <td className={TD_ANGKA}>{jumlahBaris(totalAset)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
