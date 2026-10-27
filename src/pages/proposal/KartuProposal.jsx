import { useMemo, useState } from "react";
import { DAFTAR } from "./jenis";
import { KATEGORI } from "./proposalUtils";

// Halaman utama: daftar kartu jenis proposal. Klik kartu -> membuka komponen proposal jenis itu.

const css = `
.kp{--ink:#14263b;--muted:#5b6b7c;--line:#d5dde5;font-family:"Segoe UI",system-ui,sans-serif;color:var(--ink);padding:20px;max-width:1180px;margin:0 auto}
.kp h1{font-size:1.6rem;margin:0 0 4px}
.kp .lead{color:var(--muted);margin:0 0 18px;max-width:60ch}
.kp .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:18px}
.kp .chip{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:.9rem;cursor:pointer;color:var(--ink)}
.kp .chip[aria-pressed="true"]{background:var(--ink);color:#fff;border-color:var(--ink)}
.kp .cari{font:inherit;border:1.5px solid var(--line);border-radius:8px;padding:9px 11px;max-width:240px;margin-left:auto;box-sizing:border-box;width:100%}
.kp .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.kp .kartu{text-align:left;background:#fff;border:1.5px solid var(--line);border-left:6px solid var(--c);border-radius:6px;padding:16px 16px 14px;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:8px;min-height:150px}
.kp .kartu:hover{border-color:var(--c)}
.kp .kartu:focus-visible,.kp .chip:focus-visible{outline:3px solid #f0a800;outline-offset:2px}
.kp .tag{font-size:.8rem;font-weight:600;color:var(--c)}
.kp .kartu b{font-size:1.05rem;line-height:1.25}
.kp .kartu .d{color:var(--muted);font-size:.9rem;line-height:1.4}
.kp .kartu .aksi{margin-top:auto;font-size:.88rem;font-weight:600;color:var(--c)}
.kp .kosong{padding:30px;text-align:center;color:var(--muted);border:1.5px dashed var(--line);border-radius:8px}
@media(max-width:600px){.kp .cari{max-width:none;margin-left:0}}
`;

export default function KartuProposal() {
  const [kat, setKat] = useState("semua");
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState(null);

  const daftar = useMemo(
    () => DAFTAR.filter(({ config: c }) => (kat === "semua" || c.kategori === kat) && (c.judul + " " + c.ringkas).toLowerCase().includes(cari.toLowerCase())),
    [kat, cari]
  );

  return (
    <div className="kp">
      <style>{css}</style>
      <h1>Proposal Sarana dan Prasarana</h1>
      <p className="lead">Pilih jenis proposal, isi data, lalu cetak atau simpan. Surat, proposal, dan anggaran disusun otomatis.</p>

      <div className="bar">
        {[["semua", "Semua"], ...Object.entries(KATEGORI).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={kat === k} onClick={() => setKat(k)}>{l}</button>
        ))}
        <input className="cari" placeholder="Cari jenis proposal" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari jenis proposal" />
      </div>

      {daftar.length === 0 ? (
        <div className="kosong">Tidak ada jenis proposal yang cocok. Ubah kata kunci atau pilih kategori lain.</div>
      ) : (
        <div className="grid">
          {daftar.map((d) => (
            <button key={d.config.id} className="kartu" style={{ "--c": KATEGORI[d.config.kategori].warna }} onClick={() => setPilih(d)}>
              <span className="tag">{KATEGORI[d.config.kategori].label}</span>
              <b>{d.config.judul}</b>
              <span className="d">{d.config.ringkas}</span>
              <span className="aksi">Buat proposal</span>
            </button>
          ))}
        </div>
      )}

      {pilih && <pilih.Komponen onClose={() => setPilih(null)} />}
    </div>
  );
}
