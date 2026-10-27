// proposalUtils.js — fungsi bersama untuk semua komponen proposal

export const KATEGORI = {
  pembangunan: { label: "Pembangunan", warna: "#1d4f91" },
  rehabilitasi: { label: "Rehabilitasi", warna: "#b4501f" },
  pengadaan: { label: "Pengadaan", warna: "#2f7a4d" },
};

export const rupiah = (n) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const baris = (t) => String(t || "").split("\n").map((s) => s.trim()).filter(Boolean);
const tgl = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "...........");

const SAT = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
export function terbilang(n) {
  n = Math.floor(n);
  if (n === 0) return "nol";
  if (n < 12) return SAT[n];
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + terbilang(n % 10) : "");
  if (n < 200) return "seratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 2000) return "seribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  if (n < 1e6) return terbilang(Math.floor(n / 1e3)) + " ribu" + (n % 1e3 ? " " + terbilang(n % 1e3) : "");
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + " juta" + (n % 1e6 ? " " + terbilang(n % 1e6) : "");
  return terbilang(Math.floor(n / 1e9)) + " miliar" + (n % 1e9 ? " " + terbilang(n % 1e9) : "");
}

const SALAM = {
  islam: {
    buka: "<i>Assalamu’alaikum warahmatullahi wabarakatuh</i>",
    pembuka: "Teriring rasa syukur kita panjatkan kehadirat Allah SWT atas limpahan rahmat dan karunia-Nya. Shalawat serta salam senantiasa tercurah kepada suri teladan kita, Nabi Muhammad SAW.",
    tutup: "<i>Wassalamu’alaikum warahmatullahi wabarakatuh</i>",
  },
  kristen: {
    buka: "Salam sejahtera dalam kasih Tuhan,",
    pembuka: "Puji syukur kita panjatkan kepada Tuhan Yang Maha Esa atas kasih dan penyertaan-Nya bagi kita semua.",
    tutup: "Tuhan memberkati.",
  },
  umum: { buka: "Dengan hormat,", pembuka: "", tutup: "" },
};

export function nilaiAwal(c) {
  return {
    lembaga: "", panitia: "", npsn: "", dusun: "", desa: "", kecamatan: "", kabupaten: "",
    nomor: "", lampiran: "1 (satu) rangkap", hal: "Permohonan Bantuan",
    kepada: "", tempat: "", tanggal: "", tebusan: "",
    pekerjaan: c.pekerjaan, waktu: "", kondisi: "", dasar: c.dasar, tujuan: c.tujuan,
    rabJudul: c.rabJudul, rab: c.rab.map((nama) => ({ nama, qty: "", satuan: "", harga: "" })),
    ttd1Nama: "", ttd1Id: "", ttd2Nama: "", bendahara: "", mengetahuiJabatan: "", mengetahuiNama: "",
    sertakanSK: false, skNomor: "", skTanggal: "", mengingat: "Undang-Undang Nomor 6 Tahun 2014 tentang Desa.", pelindung: "", seksi: "",
  };
}

export const hitungTotal = (rab) => rab.reduce((a, r) => a + (Number(r.qty) || 0) * (Number(r.harga) || 0), 0);

export function bangunHtml(c, m, total) {
  const ibadah = c.tipe !== "sekolah";
  const S = SALAM[c.salam] || SALAM.umum;
  const para = (t) => String(t || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).map((s) => `<p>${esc(s)}</p>`).join("");
  const nama = esc(c.prefix + m.lembaga);
  const keg = `${esc(m.pekerjaan)} ${nama}`;
  const penerima = esc(baris(m.kepada)[0] || "pihak yang terhormat");
  const lokasi = [m.dusun && "Dusun " + m.dusun, m.desa && "Desa " + m.desa, m.kecamatan && "Kecamatan " + m.kecamatan].filter(Boolean).map(esc).join(" ");
  const kab = m.kabupaten ? `<br>Kabupaten ${esc(m.kabupaten)}` : "";
  const kepala = ibadah ? esc(m.panitia) : nama;
  const kop = `<div class="kop up">${kepala}${!ibadah && m.npsn ? "<br>NPSN " + esc(m.npsn) : ""}<br>${lokasi}${kab}</div>`;
  const ttd = `<div style="text-align:right;margin-top:16pt">${esc(m.tempat)}, ${tgl(m.tanggal)}</div>
<div class="up" style="text-align:center;font-weight:bold">${kepala}</div>
<div class="sig"><div>${esc(c.ttd1)}<br><br><br><br><b><u>${esc(m.ttd1Nama)}</u></b>${m.ttd1Id ? "<br>NIP. " + esc(m.ttd1Id) : ""}</div><div>${esc(c.ttd2)}<br><br><br><br><b><u>${esc(m.ttd2Nama)}</u></b></div></div>
${m.mengetahuiNama || m.mengetahuiJabatan ? `<div class="mid">Mengetahui<br>${esc(m.mengetahuiJabatan)}<br><br><br><br><b><u>${esc(m.mengetahuiNama)}</u></b></div>` : ""}`;

  const pengirim = ibadah ? esc(m.panitia) : `pihak ${nama}`;
  const surat = `<div class="pg">${kop}
<table class="nb"><tr><td>Nomor</td><td>: ${esc(m.nomor)}</td></tr><tr><td>Lampiran</td><td>: ${esc(m.lampiran)}</td></tr><tr><td>Hal</td><td>: ${esc(m.hal)}</td></tr></table>
<p style="margin-top:12pt"><b>Kepada Yth.</b><br>${baris(m.kepada).map((s, i) => (i === 0 ? "<b>" + esc(s) + "</b>" : esc(s))).join("<br>")}</p>
<p>${S.buka}</p>
${S.pembuka ? `<p>${S.pembuka}</p>` : ""}
<p>Kami ${pengirim} ${lokasi} dengan ini mengajukan permohonan bantuan dana kepada ${penerima} agar dapat membantu terlaksananya ${keg}.</p>
<p>Demikian surat permohonan bantuan dana ini kami sampaikan. Atas perhatian dan partisipasinya kami ucapkan terima kasih.</p>
${S.tutup ? `<p>${S.tutup}</p>` : ""}
${ttd}
${baris(m.tebusan).length ? `<p style="margin-top:12pt">Tebusan:<br>${baris(m.tebusan).map((s) => "- " + esc(s)).join("<br>")}</p>` : ""}</div>`;

  const penutupDasar = ibadah
    ? `Oleh karena itu, kami sebagai panitia memberanikan diri mengetuk pintu hati ${penerima} agar berkenan berpartisipasi membantu pelaksanaan ${keg}.`
    : `Berdasarkan kondisi tersebut, kami mengajukan permohonan kepada ${penerima} agar berkenan membantu pelaksanaan ${keg}.`;
  const proposal = `<div class="pg">${kop}
<h2>A. Dasar</h2>${para(m.dasar)}
${m.kondisi ? `<p>Kondisi ${nama} saat ini: ${esc(m.kondisi)}</p>` : ""}
<p>${penutupDasar}</p>
<h2>B. Tujuan</h2>
<p>Adapun tujuan kegiatan ${keg} adalah sebagai berikut:</p>
<ol>${baris(m.tujuan).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
<h2>C. Rencana Kegiatan</h2>
<p>Kegiatan ${keg} ${lokasi} direncanakan berjalan pada ${esc(m.waktu) || "..........."}.</p>
<h2>D. Anggaran</h2>
<p>${keg} membutuhkan biaya sebesar <b>${rupiah(total)}</b> (${esc(terbilang(total))} rupiah). Estimasi anggaran sebagaimana terlampir.</p>
<h2>E. Penutup</h2>
<p>Demikian proposal ini kami buat dengan harapan kiranya dapat dipertimbangkan. Atas bantuan dan kerja sama yang baik, kami ucapkan terima kasih.</p>
${ttd}</div>`;

  const rab = `<div class="pg"><div class="kop up">Rencana Anggaran Biaya<br>${keg}<br>${lokasi}${kab}</div>
${m.rabJudul ? `<p><b class="up">${esc(m.rabJudul)}</b></p>` : ""}
<table class="g"><tr><th>No</th><th>Nama Barang / Pekerjaan</th><th>Volume</th><th>Harga Satuan</th><th>Total</th></tr>
${m.rab.filter((r) => r.nama).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.nama)}</td><td>${esc(r.qty)} ${esc(r.satuan)}</td><td style="text-align:right">${rupiah(r.harga)}</td><td style="text-align:right">${rupiah((Number(r.qty) || 0) * (Number(r.harga) || 0))}</td></tr>`).join("")}
<tr><td colspan="4" style="text-align:center"><b>JUMLAH</b></td><td style="text-align:right"><b>${rupiah(total)}</b></td></tr></table>
<p style="margin-top:6pt"><i>Terbilang: ${esc(terbilang(total))} rupiah</i></p>
${ttd}</div>`;

  const sk = !(c.sk && m.sertakanSK) ? "" : `<div class="pg"><div class="kop up">Pemerintah Kabupaten ${esc(m.kabupaten)}<br>${lokasi}</div>
<div class="kop up" style="margin-bottom:4pt">Surat Keputusan ${esc(m.mengetahuiJabatan || "Kepala Dusun")}<br>Nomor: ${esc(m.skNomor)}</div>
<div class="kop up">Tentang Pembentukan ${esc(m.panitia)}</div>
<p><b>Menimbang:</b></p>
<ol type="a"><li>Bahwa untuk kepentingan pelaksanaan ${keg}, perlu dibentuk panitia.</li><li>Bahwa untuk maksud tersebut perlu ditetapkan dengan surat keputusan.</li></ol>
<p><b>Mengingat:</b></p>
<ol type="a">${baris(m.mengingat).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
<p style="text-align:center"><b>MEMUTUSKAN</b></p>
<p>Menetapkan:<br>Pertama: Mengangkat ${esc(m.panitia)}.<br>Kedua: Panitia tersebut berfungsi sebagai pelaksana kegiatan ${keg}.<br>Ketiga: Surat Keputusan ini berlaku sejak tanggal ditetapkan dan akan ditinjau kembali sebagaimana mestinya.</p>
<p style="text-align:right">Ditetapkan di: ${esc(m.tempat)}<br>Pada tanggal: ${tgl(m.skTanggal)}<br>${esc(m.mengetahuiJabatan)}<br><br><br><br><b><u>${esc(m.mengetahuiNama)}</u></b></p>
<h2 style="page-break-before:always">Lampiran: Susunan dan Komposisi Panitia</h2>
<p><b>Pelindung / Penasihat:</b><br>${baris(m.pelindung).map(esc).join("<br>")}</p>
<p><b>Pengurus inti:</b><br>Ketua: ${esc(m.ttd1Nama)}<br>Sekretaris: ${esc(m.ttd2Nama)}<br>Bendahara: ${esc(m.bendahara)}</p>
<p><b>Seksi-seksi:</b><br>${baris(m.seksi).map(esc).join("<br>")}</p></div>`;

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Proposal ${keg}</title><style>
@page{size:A4;margin:20mm}
body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000}
.pg{page-break-after:always}.pg:last-child{page-break-after:auto}
.kop{text-align:center;font-weight:bold;line-height:1.35;margin-bottom:14pt}
.up{text-transform:uppercase}
h2{font-size:12pt;margin:12pt 0 4pt}
p{text-align:justify;margin:0 0 7pt}
table.nb td{padding:0 8pt 0 0;vertical-align:top}
table.g{border-collapse:collapse;width:100%}
table.g td,table.g th{border:1px solid #000;padding:4pt 6pt;font-size:11pt}
.sig{display:flex;justify-content:space-between;text-align:center;margin-top:10pt}
.sig div{width:45%}
.mid{text-align:center;margin-top:14pt}
</style></head><body>${surat}${proposal}${rab}${sk}</body></html>`;
}

// Mengembalikan false bila pop-up diblokir.
export function cetakHtml(html) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

export const css = `
.kp{--ink:#14263b;--muted:#5b6b7c;--line:#d5dde5;--paper:#f3f6f9;font-family:"Segoe UI",system-ui,sans-serif;color:var(--ink)}
.kp input,.kp select,.kp textarea{font:inherit;border:1.5px solid var(--line);border-radius:8px;padding:9px 11px;width:100%;box-sizing:border-box;background:#fff;color:var(--ink)}
.kp .overlay{position:fixed;inset:0;background:rgba(20,38,59,.55);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:24px 12px;z-index:60}
.kp .modal{background:#fff;border-radius:10px;max-width:760px;width:100%;border-top:8px solid var(--c)}
.kp .mh{display:flex;justify-content:space-between;gap:12px;padding:18px 20px 6px}
.kp .mh h2{margin:0;font-size:1.25rem}
.kp .x{border:none;background:none;font-size:1.6rem;line-height:1;cursor:pointer;color:var(--muted)}
.kp .form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:10px 20px 18px}
.kp .form label{display:flex;flex-direction:column;gap:4px;font-size:.88rem;font-weight:600}
.kp .full{grid-column:1/-1}
.kp .sec{grid-column:1/-1;font-weight:700;margin-top:8px;padding-top:10px;border-top:1px solid var(--line)}
.kp .rab{grid-column:1/-1;display:grid;gap:6px}
.kp .rab .r{display:grid;grid-template-columns:2.2fr .8fr .9fr 1.1fr auto;gap:6px;align-items:center}
.kp .tot{grid-column:1/-1;font-weight:700;text-align:right}
.kp .foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--line);background:var(--paper);border-radius:0 0 10px 10px}
.kp .btn{border:1.5px solid var(--ink);background:#fff;color:var(--ink);border-radius:8px;padding:9px 16px;font:inherit;font-weight:600;cursor:pointer}
.kp .btn.utama{background:var(--c);border-color:var(--c);color:#fff}
.kp .btn:disabled{opacity:.5;cursor:not-allowed}
.kp .btn:focus-visible,.kp .x:focus-visible{outline:3px solid #f0a800;outline-offset:2px}
.kp .info{padding:0 20px;color:var(--muted);font-size:.9rem;margin:0 0 4px}
.kp .pesan{padding:10px 20px 0;font-size:.9rem;font-weight:600}
@media(max-width:600px){.kp .form{grid-template-columns:1fr}.kp .rab .r{grid-template-columns:1fr 1fr}}
`;
