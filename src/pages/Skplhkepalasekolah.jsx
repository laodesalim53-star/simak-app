import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const KOSONG = {
  nomor_sk: "",
  tanggal_sk: "",
  tempat_sk: "",
  nama_sekolah: "",
  npsn: "",
  alamat_sekolah: "",
  kepsek_nama: "",
  kepsek_nip: "",
  alasan: "sedang menjalankan cuti / berhalangan tetap",
  plh_nama: "",
  plh_nip: "",
  plh_pangkat: "",
  plh_jabatan: "Guru",
  tgl_mulai: "",
  tgl_selesai: "",
  menimbang: "bahwa untuk kelancaran penyelenggaraan tugas dan layanan pendidikan di sekolah, perlu menunjuk Pelaksana Harian (PLH) Kepala Sekolah;",
  mengingat: "Peraturan perundang-undangan yang berlaku di bidang pendidikan dan kepegawaian.",
  ttd_jabatan: "Kepala Dinas Pendidikan",
  ttd_nama: "",
  ttd_nip: "",
};

const tgl = (d) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "............";

export default function SKPLHKepalaSekolah() {
  // isAdmin dari AuthContext: hanya admin yang boleh mengubah. Guru hanya lihat + cetak.
  const { isAdmin, sekolahId } = useAuth();

  const [data, setData] = useState(KOSONG);
  const [rowId, setRowId] = useState(null);
  const [mode, setMode] = useState("lihat"); // lihat | edit
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("sk_plh_kepsek").select("*").order("updated_at", { ascending: false }).limit(1);
      if (sekolahId) q = q.eq("sekolah_id", sekolahId);
      const { data: rows, error } = await q;
      if (error) setPesan("Gagal memuat data: " + error.message);
      else if (rows?.length) {
        setRowId(rows[0].id);
        setData({ ...KOSONG, ...rows[0] });
      }
      setLoading(false);
    })();
  }, [sekolahId]);

  const ubah = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  const simpan = async () => {
    if (!isAdmin) return; // pengaman sisi klien; pengaman utama ada di RLS
    setSaving(true);
    setPesan("");
    const { id, created_at, updated_at, ...isi } = data;
    const payload = { ...isi, ...(sekolahId ? { sekolah_id: sekolahId } : {}), updated_at: new Date().toISOString() };
    const { data: hasil, error } = rowId
      ? await supabase.from("sk_plh_kepsek").update(payload).eq("id", rowId).select().single()
      : await supabase.from("sk_plh_kepsek").insert(payload).select().single();
    setSaving(false);
    if (error) return setPesan("Gagal menyimpan: " + error.message);
    setRowId(hasil.id);
    setData({ ...KOSONG, ...hasil });
    setMode("lihat");
    setPesan("Data tersimpan.");
  };

  const lengkap = useMemo(() => data.plh_nama && data.nomor_sk, [data]);

  if (loading) return <div style={{ padding: 24 }}>Memuat…</div>;

  return (
    <div className="skplh-wrap">
      <style>{css}</style>

      <div className="skplh-bar no-print">
        <div>
          <h2>SK PLH Kepala Sekolah</h2>
          <p>
            {isAdmin
              ? "Anda dapat mengubah isi SK. Guru hanya dapat melihat dan mencetak."
              : "Anda dapat melihat dan mencetak SK ini. Perubahan hanya dapat dilakukan admin."}
          </p>
        </div>
        <div className="skplh-aksi">
          {isAdmin && mode === "lihat" && (
            <button className="btn" onClick={() => setMode("edit")}>Ubah data</button>
          )}
          {isAdmin && mode === "edit" && (
            <>
              <button className="btn" onClick={simpan} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
              <button className="btn btn-lain" onClick={() => setMode("lihat")}>Batal</button>
            </>
          )}
          {mode === "lihat" && (
            <button className="btn btn-lain" onClick={() => window.print()} disabled={!lengkap}>Cetak</button>
          )}
        </div>
      </div>

      {pesan && <div className="skplh-pesan no-print">{pesan}</div>}

      {mode === "edit" && isAdmin ? (
        <div className="skplh-form no-print">
          <fieldset>
            <legend>Nomor dan tempat</legend>
            <Isian label="Nomor SK" v={data.nomor_sk} on={ubah("nomor_sk")} />
            <Isian label="Tanggal SK" type="date" v={data.tanggal_sk} on={ubah("tanggal_sk")} />
            <Isian label="Tempat penetapan" v={data.tempat_sk} on={ubah("tempat_sk")} />
          </fieldset>
          <fieldset>
            <legend>Sekolah</legend>
            <Isian label="Nama sekolah" v={data.nama_sekolah} on={ubah("nama_sekolah")} />
            <Isian label="NPSN" v={data.npsn} on={ubah("npsn")} />
            <Isian label="Alamat sekolah" v={data.alamat_sekolah} on={ubah("alamat_sekolah")} />
          </fieldset>
          <fieldset>
            <legend>Kepala sekolah definitif</legend>
            <Isian label="Nama" v={data.kepsek_nama} on={ubah("kepsek_nama")} />
            <Isian label="NIP" v={data.kepsek_nip} on={ubah("kepsek_nip")} />
            <Isian label="Alasan PLH" v={data.alasan} on={ubah("alasan")} />
          </fieldset>
          <fieldset>
            <legend>Pelaksana harian (PLH)</legend>
            <Isian label="Nama" v={data.plh_nama} on={ubah("plh_nama")} />
            <Isian label="NIP" v={data.plh_nip} on={ubah("plh_nip")} />
            <Isian label="Pangkat/golongan" v={data.plh_pangkat} on={ubah("plh_pangkat")} />
            <Isian label="Jabatan saat ini" v={data.plh_jabatan} on={ubah("plh_jabatan")} />
            <Isian label="Mulai tugas" type="date" v={data.tgl_mulai} on={ubah("tgl_mulai")} />
            <Isian label="Selesai tugas" type="date" v={data.tgl_selesai} on={ubah("tgl_selesai")} />
          </fieldset>
          <fieldset>
            <legend>Dasar SK</legend>
            <Area label="Menimbang" v={data.menimbang} on={ubah("menimbang")} />
            <Area label="Mengingat" v={data.mengingat} on={ubah("mengingat")} />
          </fieldset>
          <fieldset>
            <legend>Penandatangan</legend>
            <Isian label="Jabatan" v={data.ttd_jabatan} on={ubah("ttd_jabatan")} />
            <Isian label="Nama" v={data.ttd_nama} on={ubah("ttd_nama")} />
            <Isian label="NIP" v={data.ttd_nip} on={ubah("ttd_nip")} />
          </fieldset>
        </div>
      ) : lengkap ? (
        <article className="skplh-kertas">
          <header className="kop">
            <strong>{data.ttd_jabatan?.toUpperCase()}</strong>
            <div>{data.nama_sekolah}{data.npsn ? ` (NPSN ${data.npsn})` : ""}</div>
            <div>{data.alamat_sekolah}</div>
          </header>

          <h3 className="judul">
            KEPUTUSAN {data.ttd_jabatan?.toUpperCase()}
            <br />
            NOMOR {data.nomor_sk}
            <br />
            TENTANG
            <br />
            PENUNJUKAN PELAKSANA HARIAN (PLH) KEPALA SEKOLAH
            <br />
            {data.nama_sekolah?.toUpperCase()}
          </h3>

          <table className="dasar">
            <tbody>
              <tr><td>Menimbang</td><td>:</td><td>{data.menimbang}</td></tr>
              <tr><td>Mengingat</td><td>:</td><td>{data.mengingat}</td></tr>
            </tbody>
          </table>

          <p className="tengah"><strong>MEMUTUSKAN</strong></p>

          <table className="dasar">
            <tbody>
              <tr>
                <td>Menetapkan</td><td>:</td>
                <td>KEPUTUSAN {data.ttd_jabatan?.toUpperCase()} TENTANG PENUNJUKAN PELAKSANA HARIAN (PLH) KEPALA SEKOLAH {data.nama_sekolah?.toUpperCase()}.</td>
              </tr>
              <tr>
                <td>KESATU</td><td>:</td>
                <td>
                  Menunjuk saudara/i berikut sebagai Pelaksana Harian (PLH) Kepala {data.nama_sekolah}, karena Kepala Sekolah
                  definitif{data.kepsek_nama ? ` (${data.kepsek_nama}${data.kepsek_nip ? `, NIP ${data.kepsek_nip}` : ""})` : ""} {data.alasan}:
                  <table className="biodata">
                    <tbody>
                      <tr><td>Nama</td><td>:</td><td>{data.plh_nama}</td></tr>
                      <tr><td>NIP</td><td>:</td><td>{data.plh_nip || "-"}</td></tr>
                      <tr><td>Pangkat/Gol.</td><td>:</td><td>{data.plh_pangkat || "-"}</td></tr>
                      <tr><td>Jabatan</td><td>:</td><td>{data.plh_jabatan}</td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td>KEDUA</td><td>:</td>
                <td>
                  Penunjukan berlaku mulai {tgl(data.tgl_mulai)}
                  {data.tgl_selesai ? ` sampai dengan ${tgl(data.tgl_selesai)}` : " sampai Kepala Sekolah definitif kembali bertugas"}.
                </td>
              </tr>
              <tr>
                <td>KETIGA</td><td>:</td>
                <td>Keputusan ini berlaku sejak tanggal ditetapkan, dan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.</td>
              </tr>
            </tbody>
          </table>

          <div className="ttd">
            <div>
              Ditetapkan di {data.tempat_sk || "............"}
              <br />
              pada tanggal {tgl(data.tanggal_sk)}
              <br />
              {data.ttd_jabatan},
              <br /><br /><br /><br />
              <strong><u>{data.ttd_nama || "............"}</u></strong>
              <br />
              {data.ttd_nip ? `NIP ${data.ttd_nip}` : ""}
            </div>
          </div>
        </article>
      ) : (
        <div className="skplh-kosong no-print">
          Belum ada SK PLH yang diisi.
          {isAdmin ? " Klik “Ubah data” untuk mengisinya." : " Hubungi admin untuk mengisinya."}
        </div>
      )}
    </div>
  );
}

function Isian({ label, v, on, type = "text" }) {
  return (
    <label className="fld">
      <span>{label}</span>
      <input type={type} value={v || ""} onChange={on} />
    </label>
  );
}
function Area({ label, v, on }) {
  return (
    <label className="fld lebar">
      <span>{label}</span>
      <textarea rows={3} value={v || ""} onChange={on} />
    </label>
  );
}

const css = `
.skplh-wrap{max-width:900px;margin:0 auto;padding:16px;font-family:system-ui,sans-serif;color:#1c1f26}
.skplh-bar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.skplh-bar h2{margin:0 0 4px;font-size:20px}
.skplh-bar p{margin:0;font-size:13px;color:#566}
.skplh-aksi{display:flex;gap:8px}
.btn{background:#1f4e79;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-size:14px;cursor:pointer}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-lain{background:#e8ecf1;color:#1c1f26}
.skplh-pesan{background:#eef5ee;border:1px solid #bcd7bc;padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px}
.skplh-kosong{padding:32px;text-align:center;border:1px dashed #b8c0cc;border-radius:8px;color:#566}
.skplh-form fieldset{border:1px solid #d5dbe3;border-radius:8px;margin:0 0 12px;padding:10px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.skplh-form legend{font-weight:600;font-size:14px;padding:0 6px}
.fld{display:flex;flex-direction:column;gap:3px;font-size:13px}
.fld.lebar{grid-column:1/-1}
.fld input,.fld textarea{border:1px solid #c3cad5;border-radius:6px;padding:7px 9px;font:inherit}
.skplh-kertas{background:#fff;border:1px solid #d5dbe3;padding:40px 48px;font-family:"Times New Roman",serif;font-size:14px;line-height:1.5}
.kop{text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:16px}
.judul{text-align:center;font-size:15px;margin:0 0 16px;line-height:1.5}
.tengah{text-align:center;margin:14px 0}
.dasar{width:100%;border-collapse:collapse;margin-bottom:8px}
.dasar>tbody>tr>td{vertical-align:top;padding:3px 4px}
.dasar>tbody>tr>td:first-child{width:100px}
.dasar>tbody>tr>td:nth-child(2){width:14px}
.biodata{margin:6px 0 0}
.biodata td{padding:1px 6px 1px 0;vertical-align:top}
.ttd{display:flex;justify-content:flex-end;margin-top:28px}
.ttd>div{width:280px}
@media print{
  body *{visibility:hidden}
  .skplh-kertas,.skplh-kertas *{visibility:visible}
  .skplh-kertas{position:absolute;left:0;top:0;width:100%;border:0;padding:0}
  .no-print{display:none!important}
  @page{size:A4;margin:20mm}
}
`;
