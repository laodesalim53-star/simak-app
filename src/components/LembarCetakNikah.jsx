import { useState } from 'react'

// ---------------------------------------------------------------------
// LembarCetakNikah
// ---------------------------------------------------------------------
// Komponen lembar cetak formulir N1/N2/N4/N5, dipisah dari halaman
// wizard supaya bisa dipakai ulang (mis. dari halaman admin juga).
//
// PENTING soal mekanisme "hanya tampil saat print":
// Versi sebelumnya mengandalkan class Tailwind `hidden print:block` /
// `print:hidden`. Kalau variant `print:` itu tidak ter-compile (config
// Tailwind lama, dipakai lewat CDN/Play tanpa purge yang benar, atau
// file ini belum masuk `content` glob di tailwind.config), class
// tersebut tidak berefek apa-apa — akibatnya lembar cetak ini tidak
// pernah muncul walau window.print() dipanggil.
//
// Di bawah ini dipakai pola CSS print yang murni (tidak bergantung
// pada Tailwind sama sekali), berbasis `id` + `visibility`, jadi pasti
// jalan di build/config apapun:
//   - Elemen ini SELALU ada di DOM (tidak di-mount/unmount kondisional)
//     jadi foto tetap ter-load normal dari awal.
//   - Saat print, SEMUA elemen di <body> disembunyikan (visibility:
//     hidden), lalu subtree #lembar-cetak-nikah dan semua isinya
//     dikembalikan visible, lalu diposisikan absolute supaya jadi satu
//     halaman penuh.
// ---------------------------------------------------------------------

const LABEL_STATUS_PERKAWINAN = {
  belum_kawin: 'Belum Kawin',
  cerai_hidup: 'Duda/Janda Cerai Hidup',
  cerai_mati: 'Duda/Janda Cerai Mati',
}

function SeksiCetak({ judul, children }) {
  return (
    <div className="mb-4 break-inside-avoid">
      <p className="text-xs font-bold uppercase border-b border-black pb-1 mb-1.5">{judul}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function BarisCetak({ label, value }) {
  return (
    <div className="flex text-xs gap-2">
      <span className="w-40 shrink-0 text-black">{label}</span>
      <span className="shrink-0">:</span>
      <span className="flex-1 text-black">{value || '-'}</span>
    </div>
  )
}

// Kotak pas foto dengan fallback kalau foto belum ada ATAU gagal
// dimuat (mis. bucket Supabase Storage belum di-set public / URL
// kedaluwarsa). Tanpa fallback ini, foto yang gagal load akan tampil
// sebagai ikon gambar rusak di hasil cetak.
function KotakFotoCetak({ url, label }) {
  const [gagalMuat, setGagalMuat] = useState(false)
  const tampilkanFoto = url && !gagalMuat

  return tampilkanFoto ? (
    <img
      src={url}
      alt={label}
      onError={() => setGagalMuat(true)}
      className="w-24 h-32 object-cover border border-black shrink-0"
    />
  ) : (
    <div className="w-24 h-32 border border-dashed border-black flex items-center justify-center text-[9px] text-center shrink-0 px-1">
      {url ? 'Foto gagal dimuat' : 'Foto belum ada'}
    </div>
  )
}

function DataCalonCetak({ judul, nilai }) {
  return (
    <SeksiCetak judul={judul}>
      <div className="flex gap-3">
        <KotakFotoCetak url={nilai.foto_url} label={judul} />
        <div className="flex-1 space-y-0.5">
          <BarisCetak label="Nama Lengkap & Alias" value={nilai.nama_lengkap} />
          <BarisCetak label="NIK" value={nilai.nik} />
          <BarisCetak
            label="Tempat, Tanggal Lahir"
            value={`${nilai.tempat_lahir || '-'}, ${nilai.tanggal_lahir || '-'}`}
          />
          <BarisCetak label="Kewarganegaraan" value={nilai.kewarganegaraan} />
          <BarisCetak label="Agama" value={nilai.agama} />
          <BarisCetak label="Pekerjaan" value={nilai.pekerjaan} />
          <BarisCetak label="Status Perkawinan" value={LABEL_STATUS_PERKAWINAN[nilai.status_perkawinan]} />
          <BarisCetak label="Alamat" value={nilai.alamat} />
        </div>
      </div>
    </SeksiCetak>
  )
}

function OrangTuaCetak({ judul, nilai }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1">{judul}</p>
      <BarisCetak label="Nama Ayah" value={nilai.ayah.nama_lengkap} />
      <BarisCetak label="NIK Ayah" value={nilai.ayah.nik} />
      <BarisCetak label="Nama Ibu" value={nilai.ibu.nama_lengkap} />
      <BarisCetak label="NIK Ibu" value={nilai.ibu.nik} />
      <p className="text-[10px] mt-1">
        {nilai.persetujuan ? '☑' : '☐'} Orang tua/wali menyetujui pernikahan ini.
      </p>
    </div>
  )
}

export default function LembarCetakNikah({ data }) {
  return (
    <div id="lembar-cetak-nikah" className="p-8 text-black bg-white">
      <style>{`
        @media print {
          @page { margin: 1.5cm; }

          /* Sembunyikan seluruh halaman, lalu tampilkan kembali HANYA
             subtree #lembar-cetak-nikah. Pola ini tidak bergantung pada
             utility print: dari Tailwind sama sekali. */
          body * {
            visibility: hidden;
          }
          #lembar-cetak-nikah,
          #lembar-cetak-nikah * {
            visibility: visible;
          }
          #lembar-cetak-nikah {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0;
          }

          img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        /* Di layar (bukan saat print), elemen ini selalu disembunyikan
           lewat inline style di bawah — ini hanya jaga-jaga tambahan
           supaya tidak pernah "bocor" tampil di layar. */
        @media screen {
          #lembar-cetak-nikah {
            display: none;
          }
        }
        @media print {
          #lembar-cetak-nikah {
            display: block !important;
          }
        }
      `}</style>

      <div className="text-center mb-6">
        <p className="font-bold text-sm uppercase">Formulir Pendaftaran Nikah</p>
        <p className="text-xs">
          Kantor Urusan Agama {data.n2.kua_tujuan || '.....................'}
        </p>
      </div>

      <DataCalonCetak judul="Model N1 — Data Calon Suami" nilai={data.calon_suami} />
      <DataCalonCetak judul="Model N1 — Data Calon Istri" nilai={data.calon_istri} />

      <SeksiCetak judul="Model N2 — Rencana Akad">
        <BarisCetak label="Tanggal Akad" value={data.n2.rencana_tanggal_akad} />
        <BarisCetak label="Waktu Akad" value={data.n2.rencana_waktu_akad} />
        <BarisCetak label="Tempat Akad" value={data.n2.tempat_akad} />
        <BarisCetak label="KUA Tujuan" value={data.n2.kua_tujuan} />
        {data.n2.catatan && <BarisCetak label="Catatan" value={data.n2.catatan} />}
      </SeksiCetak>

      <SeksiCetak judul="Model N4 — Persetujuan Mempelai">
        <p className="text-xs">
          {data.n4.persetujuan_calon_suami ? '☑' : '☐'} {data.calon_suami.nama_lengkap || 'Calon suami'}{' '}
          menyatakan setuju menikah tanpa paksaan.
        </p>
        <p className="text-xs">
          {data.n4.persetujuan_calon_istri ? '☑' : '☐'} {data.calon_istri.nama_lengkap || 'Calon istri'}{' '}
          menyatakan setuju menikah tanpa paksaan.
        </p>
      </SeksiCetak>

      <SeksiCetak judul="Model N5 — Izin Orang Tua/Wali">
        <div className="grid grid-cols-2 gap-4">
          <OrangTuaCetak
            judul={`Orang Tua Calon Suami${data.calon_suami.nama_lengkap ? ` (${data.calon_suami.nama_lengkap})` : ''}`}
            nilai={data.n5.suami}
          />
          <OrangTuaCetak
            judul={`Orang Tua Calon Istri${data.calon_istri.nama_lengkap ? ` (${data.calon_istri.nama_lengkap})` : ''}`}
            nilai={data.n5.istri}
          />
        </div>
      </SeksiCetak>

      <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs break-inside-avoid">
        <div>
          <p>Calon Suami,</p>
          <div className="h-16" />
          <p className="border-t border-black pt-1">{data.calon_suami.nama_lengkap || '.....................'}</p>
        </div>
        <div>
          <p>Calon Istri,</p>
          <div className="h-16" />
          <p className="border-t border-black pt-1">{data.calon_istri.nama_lengkap || '.....................'}</p>
        </div>
      </div>
    </div>
  )
}
