// src/components/AdministrasiKepsekKomponen.jsx
//
// Potongan tampilan bersama untuk BukuKerjaKepsek, SupervisiAkademik, KinerjaTendik:
// kop surat, kotak Simpan, tanda tangan Kepala Sekolah, bilah tab, dan CSS cetak.

import { Check, Loader2, Save } from 'lucide-react'
import { isi } from './CetakSK'
import { labelWaktu, tanggalPanjang } from '../lib/administrasiKepsek'

// Area cetak = elemen dengan id "area-cetak-adm". Elemen berkelas "no-print" tidak ikut dicetak
// (tetap tampil di layar). orientasi: 'portrait' | 'landscape'.
export function cssCetak(orientasi = 'portrait') {
  return `
    @page { size: A4 ${orientasi}; margin: 12mm 14mm; }
    #area-cetak-adm .sel-input {
      width: 100%; background: transparent; border: 0; outline: 0;
      text-align: center; padding: 2px 2px; font: inherit; min-width: 0;
    }
    #area-cetak-adm .sel-input:hover { background: #f8fafc; }
    #area-cetak-adm .sel-input:focus { background: #eff6ff; }
    #area-cetak-adm .sel-kiri { text-align: left; }
    #area-cetak-adm textarea.sel-input { resize: none; display: block; }
    #area-cetak-adm select.sel-input {
      appearance: none; -webkit-appearance: none; text-align-last: center; cursor: pointer;
    }
    #area-cetak-adm .kop-logo img {
      position: static !important; float: none !important;
      display: block; max-width: 100%; max-height: 100%; object-fit: contain;
    }
    #area-cetak-adm .halaman + .halaman {
      margin-top: 2rem; padding-top: 1.5rem; border-top: 1px dashed #cbd5e1;
    }
    @media print {
      body * { visibility: hidden; }
      #area-cetak-adm, #area-cetak-adm * { visibility: visible; }
      #area-cetak-adm {
        position: absolute; left: 0; top: 0; width: 100%;
        border: 0 !important; border-radius: 0 !important; padding: 0 !important;
        max-width: none !important; margin: 0 !important;
        font-family: 'Times New Roman', Times, serif; color: #000 !important;
        font-size: 10.5pt !important; line-height: 1.3 !important;
      }
      #area-cetak-adm * { color: #000 !important; }
      #area-cetak-adm .no-print { display: none !important; }
      #area-cetak-adm .kop-surat { border-bottom-color: #000 !important; padding-bottom: 6px !important; margin-bottom: 8px !important; }
      #area-cetak-adm .kop-logo { width: 60px !important; height: 60px !important; }
      #area-cetak-adm .ttd-blok { page-break-inside: avoid; }
      #area-cetak-adm table { border-color: #000 !important; }
      #area-cetak-adm th, #area-cetak-adm td { border-color: #000 !important; padding: 1px 3px !important; }
      #area-cetak-adm tr { page-break-inside: avoid; }
      #area-cetak-adm thead { display: table-header-group; }
      #area-cetak-adm .sel-input::placeholder { color: transparent !important; }
      #area-cetak-adm .sel-input:hover, #area-cetak-adm .sel-input:focus { background: transparent; }
      #area-cetak-adm .halaman + .halaman {
        margin-top: 0 !important; padding-top: 0 !important; border-top: 0 !important;
        break-before: page; page-break-before: always;
      }
    }
  `
}

export function KopSurat({ info, namaSekolah }) {
  const kecamatan = String(info.kecamatan || '').replace(/^(kecamatan\s+)+/i, '')
  return (
    <div className="kop-surat flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-4">
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {info.logoKabupatenUrl && (
          <img
            src={info.logoKabupatenUrl}
            alt="Logo kabupaten"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>
      <div className="flex-1 text-center">
        {info.kabupaten && <p className="font-bold uppercase tracking-wide">{info.kabupaten}</p>}
        {info.dinas && <p className="font-bold uppercase tracking-wide">{info.dinas}</p>}
        <p className="font-bold uppercase tracking-wide text-base">{namaSekolah}</p>
        {kecamatan && <p className="font-bold uppercase tracking-wide">Kecamatan {kecamatan}</p>}
        {info.alamat && <p className="italic text-[12px]">{info.alamat}</p>}
      </div>
      <div className="kop-logo w-[76px] h-[76px] shrink-0 flex items-center justify-center">
        {info.logoSekolahUrl && (
          <img
            src={info.logoSekolahUrl}
            alt="Logo sekolah"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>
    </div>
  )
}

// Blok tanda tangan di kanan bawah: "Tempat, tanggal / Kepala Sekolah / nama / NIP".
export function TandaTanganKepsek({ tempat, tanggal, nama, nip }) {
  return (
    <div className="ttd-blok mt-6 flex justify-end">
      <div className="w-64 text-center">
        <p>
          {isi(tempat, '…………')}, {isi(tanggalPanjang(tanggal), '…………')}
        </p>
        <p className="mb-14">Kepala Sekolah</p>
        <p className="font-semibold underline decoration-slate-400 underline-offset-4">{isi(nama, '…………')}</p>
        <p>NIP. {isi(nip, '…………')}</p>
      </div>
    </div>
  )
}

export function BilahTab({ tab, aktif, onPilih }) {
  return (
    <div role="tablist" className="mt-2 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {tab.map((t) => {
        const a = aktif === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={a}
            onClick={() => onPilih(t.id)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              a ? 'border-blue-900 bg-blue-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="block text-sm font-semibold">{t.label}</span>
            <span className={`block text-xs ${a ? 'text-blue-200' : 'text-slate-500'}`}>{t.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

// Kotak Simpan: status 'belum' | 'berubah' | 'tersimpan' dari useDokumenTersimpan.
export function KotakSimpan({ judul, status, waktu, memuat, menyimpan, pesan, onSimpan, disabled }) {
  const w = labelWaktu(waktu)
  const teks = memuat
    ? 'Memuat data tersimpan…'
    : status === 'belum'
    ? 'Belum pernah disimpan.'
    : status === 'berubah'
    ? `Ada perubahan yang belum disimpan${w ? ` (terakhir disimpan ${w})` : ''}.`
    : `Tersimpan${w ? ` ${w}` : ''}.`
  const warna = status === 'berubah' ? 'text-amber-700' : status === 'tersimpan' ? 'text-emerald-700' : 'text-slate-500'

  return (
    <div className="no-print mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          <p className="font-medium text-slate-800">{judul}</p>
          <p className={`text-xs ${warna}`}>{teks}</p>
        </div>
        <button
          type="button"
          onClick={onSimpan}
          disabled={menyimpan || memuat || disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {menyimpan ? (
            <Loader2 size={16} className="animate-spin" />
          ) : status === 'tersimpan' ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {menyimpan ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
      {pesan && (
        <p
          role="status"
          className={`mt-2 text-xs ${
            pesan.tipe === 'galat' ? 'text-red-700' : pesan.tipe === 'ok' ? 'text-emerald-700' : 'text-slate-600'
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </div>
  )
}

export function Th({ children, className = '', ...rest }) {
  return (
    <th className={`border border-slate-300 px-1 py-1 text-center font-semibold ${className}`} {...rest}>
      {children}
    </th>
  )
}

export function Td({ children, className = '', ...rest }) {
  return (
    <td className={`border border-slate-300 px-1.5 py-1 ${className}`} {...rest}>
      {children}
    </td>
  )
}

export function Baris({ label, nilai, lebar = 'w-44' }) {
  return (
    <p className="flex">
      <span className={`${lebar} shrink-0`}>{label}</span>
      <span>: {nilai}</span>
    </p>
  )
}

export const tombolKecil =
  'rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50'
