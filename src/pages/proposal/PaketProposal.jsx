import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import { KATEGORI, css, rupiah, nilaiAwal, hitungTotal, bangunHtml, cetakHtml } from "./proposalUtils";

/*
  PaketProposal — formulir + cetak untuk satu jenis proposal, diatur lewat `config`
  (lihat folder ./jenis). Hasil cetak: surat permohonan, proposal, RAB, dan SK panitia (opsional).

  Tabel untuk tombol "Simpan": jalankan proposal_sekolah.sql di Supabase SQL Editor (sekali saja).
*/

export default function PaketProposal({ config: c, onClose }) {
  const ibadah = c.tipe !== "sekolah";
  const { sekolahId } = useAuth();
  const label = { sekolah: "sekolah", masjid: "masjid", gereja: "gereja" }[c.tipe];
  const awal = nilaiAwal(c);
  const [m, setM] = useState(awal);
  const [pesan, setPesan] = useState("");
  const [simpan, setSimpan] = useState(false);

  const u = (k) => (e) => setM((s) => ({ ...s, [k]: e.target.value }));
  const ubahRab = (i, k, v) => setM((s) => ({ ...s, rab: s.rab.map((r, x) => (x === i ? { ...r, [k]: v } : r)) }));
  const tambah = () => setM((s) => ({ ...s, rab: [...s.rab, { nama: "", qty: "", satuan: "", harga: "" }] }));
  const hapus = (i) => setM((s) => ({ ...s, rab: s.rab.length > 1 ? s.rab.filter((_, x) => x !== i) : s.rab }));
  const total = hitungTotal(m.rab);
  const lengkap = m.lembaga.trim() && m.ttd1Nama.trim() && total > 0 && (!ibadah || m.panitia.trim());

  const cetak = () => {
    if (!cetakHtml(bangunHtml(c, m, total))) setPesan("Pop-up diblokir. Izinkan pop-up untuk mencetak.");
  };

  const simpanDb = async () => {
    setSimpan(true);
    const { error } = await supabase.from("proposal_sekolah").insert({
      sekolah_id: sekolahId ? String(sekolahId) : null,
      jenis_id: c.id, kategori: c.kategori, judul: c.judul, data: { ...m, total },
    });
    setSimpan(false);
    setPesan(error ? "Gagal menyimpan: " + error.message : "Proposal tersimpan.");
  };

  const T = (k, lbl, o = {}) => (
    <label className={o.full ? "full" : ""}>{lbl}<input value={m[k]} onChange={u(k)} placeholder={o.ph} /></label>
  );
  const A = (k, lbl, rows = 3, ph = "") => (
    <label className="full">{lbl}<textarea rows={rows} value={m[k]} onChange={u(k)} placeholder={ph} /></label>
  );

  return (
    <div className="kp" style={{ padding: 0 }}>
      <style>{css}</style>
      <div className="overlay" style={{ "--c": KATEGORI[c.kategori].warna }} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={c.judul}>
        <div className="modal">
          <div className="mh">
            <h2>{KATEGORI[c.kategori].label}: {c.judul}</h2>
            <button className="x" onClick={onClose} aria-label="Tutup">×</button>
          </div>
          <p className="info">Hasil cetak berisi surat permohonan, proposal, rencana anggaran biaya{c.sk ? ", dan (opsional) SK panitia" : ""}.</p>
          <div className="form">
            {c.contoh && (
              <div className="full"><button className="btn" onClick={() => { setM({ ...awal, ...c.contoh }); setPesan("Contoh data dimuat. Ganti dengan data Anda."); }}>Isi contoh data</button></div>
            )}

            <div className="sec">Identitas {label}</div>
            {T("lembaga", `Nama ${label}`, { full: !ibadah, ph: ibadah ? "Contoh: Jabal Nur" : "" })}
            {ibadah ? T("panitia", "Nama panitia", { ph: `Panitia Rehabilitasi ${c.prefix}...` }) : T("npsn", "NPSN")}
            {T("dusun", "Dusun / lingkungan / jalan")}
            {T("desa", "Desa / kelurahan")}
            {T("kecamatan", "Kecamatan")}
            {T("kabupaten", "Kabupaten / kota")}

            <div className="sec">Surat permohonan</div>
            {T("nomor", "Nomor surat")}
            {T("lampiran", "Lampiran")}
            {T("hal", "Perihal")}
            {T("tempat", "Tempat penandatanganan")}
            <label>Tanggal surat<input type="date" value={m.tanggal} onChange={u("tanggal")} /></label>
            {A("kepada", "Ditujukan kepada (satu baris per baris surat)", 4, "Kepala Dinas ...\ndi-\nKota")}
            {A("tebusan", "Tebusan (satu per baris, boleh kosong)", 2)}

            <div className="sec">Isi proposal</div>
            {T("pekerjaan", "Jenis pekerjaan (tanpa nama lembaga)", { full: true })}
            {A("dasar", "Dasar (pisahkan paragraf dengan baris kosong)", 5)}
            {A("kondisi", `Kondisi ${label} saat ini`, 3, "Contoh: atap bocor, plafon rusak, lantai retak.")}
            {A("tujuan", "Tujuan (satu per baris)", 4)}
            {T("waktu", "Rencana waktu pelaksanaan", { full: true, ph: "Contoh: Maret 2027" })}

            <div className="sec">Rencana anggaran biaya</div>
            {T("rabJudul", "Judul bagian RAB", { full: true })}
            <div className="rab">
              {m.rab.map((r, i) => (
                <div className="r" key={i}>
                  <input placeholder="Nama barang / pekerjaan" value={r.nama} onChange={(e) => ubahRab(i, "nama", e.target.value)} aria-label="Nama barang" />
                  <input type="number" min="0" placeholder="Jumlah" value={r.qty} onChange={(e) => ubahRab(i, "qty", e.target.value)} aria-label="Jumlah" />
                  <input placeholder="Satuan" value={r.satuan} onChange={(e) => ubahRab(i, "satuan", e.target.value)} aria-label="Satuan" />
                  <input type="number" min="0" placeholder="Harga satuan" value={r.harga} onChange={(e) => ubahRab(i, "harga", e.target.value)} aria-label="Harga satuan" />
                  <button className="btn" onClick={() => hapus(i)} aria-label="Hapus baris">×</button>
                </div>
              ))}
              <div><button className="btn" onClick={tambah}>Tambah baris</button></div>
            </div>
            <div className="tot">Total: {rupiah(total)}</div>

            <div className="sec">Penandatangan</div>
            {T("ttd1Nama", `Nama ${c.ttd1.toLowerCase()}`)}
            {!ibadah ? T("ttd1Id", "NIP (boleh kosong)") : T("ttd2Nama", `Nama ${c.ttd2.toLowerCase()}`)}
            {!ibadah && T("ttd2Nama", `Nama ${c.ttd2.toLowerCase()}`, { full: true })}
            {ibadah && T("bendahara", "Bendahara")}
            {T("mengetahuiJabatan", "Jabatan yang mengetahui", { ph: ibadah ? "Kepala Dusun / Kepala Desa" : "Pengawas / Kepala Desa" })}
            {T("mengetahuiNama", "Nama yang mengetahui")}

            {c.sk && (
              <>
                <div className="sec">Lampiran SK panitia</div>
                <label className="full" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={m.sertakanSK} onChange={(e) => setM((s) => ({ ...s, sertakanSK: e.target.checked }))} />
                  Sertakan SK pembentukan panitia dan susunannya
                </label>
                {m.sertakanSK && (
                  <>
                    {T("skNomor", "Nomor SK")}
                    <label>Tanggal SK<input type="date" value={m.skTanggal} onChange={u("skTanggal")} /></label>
                    {A("mengingat", "Mengingat (satu dasar hukum per baris)", 3)}
                    {A("pelindung", "Pelindung / penasihat (satu per baris)", 2)}
                    {A("seksi", "Seksi-seksi (satu seksi per baris)", 4, "Seksi Usaha Dana, Ketua: ...")}
                  </>
                )}
              </>
            )}
          </div>
          {pesan && <div className="pesan">{pesan}</div>}
          <div className="foot">
            <button className="btn" onClick={onClose}>Batal</button>
            <button className="btn" onClick={simpanDb} disabled={!lengkap || simpan}>{simpan ? "Menyimpan..." : "Simpan"}</button>
            <button className="btn utama" onClick={cetak} disabled={!lengkap}>Cetak / PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
}
