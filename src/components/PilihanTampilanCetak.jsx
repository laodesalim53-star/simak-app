import {
  WARNA_PRESET,
  OPSI_POSISI_V,
  OPSI_POSISI_H,
  OPSI_UKURAN,
} from '../lib/kuitansiJasaTema'

// Pemilih warna & tata letak cetak Kuitansi Jasa.
// Lokasi: src/components/PilihanTampilanCetak.jsx
//
// Props:
//   value: objek tema (lihat DEFAULT_TEMA di lib/kuitansiJasaTema.js atau
//          DEFAULT_TEMA_KUITANSI di lib/kuitansiTema.js)
//   onChange(temaBaru): dipanggil setiap ada perubahan
//   presetWarna (opsional): daftar warna; bawaan WARNA_PRESET (Kuitansi Jasa).
//          Kuitansi barang mengoper PRESET_WARNA_KUITANSI (ada "Hitam").

function Segmen({ opsi, nilai, onPilih }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opsi.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPilih(o.key)}
          className={
            'border rounded-md px-2.5 py-1 text-xs transition-colors ' +
            (nilai === o.key
              ? 'bg-ink-700 text-white border-ink-700'
              : 'bg-white text-ink-700 border-ink-700/25 hover:border-ink-700/60')
          }
        >
          {o.nama}
        </button>
      ))}
    </div>
  )
}

export default function PilihanTampilanCetak({ value, onChange, presetWarna = WARNA_PRESET }) {
  const ubah = (field, nilai) => onChange({ ...value, [field]: nilai })
  const kustomAktif = value.warna === 'kustom'

  return (
    <div className="space-y-3">
      <div>
        <label className="label-field">Warna</label>
        <div className="flex flex-wrap items-center gap-2">
          {presetWarna.map((w) => (
            <button
              key={w.key}
              type="button"
              title={w.nama}
              aria-label={w.nama}
              aria-pressed={value.warna === w.key}
              onClick={() => ubah('warna', w.key)}
              className="w-7 h-7 rounded-full border border-black/10"
              style={{
                background: w.hex,
                boxShadow: value.warna === w.key ? '0 0 0 2px #fff, 0 0 0 4px ' + w.hex : 'none',
              }}
            />
          ))}
          <label
            title="Warna kustom"
            className="flex items-center gap-1.5 text-xs text-ink-700 cursor-pointer ml-1"
          >
            <input
              type="color"
              value={value.warnaKustom}
              onChange={(e) => onChange({ ...value, warna: 'kustom', warnaKustom: e.target.value })}
              className="w-7 h-7 p-0 border-0 bg-transparent cursor-pointer"
              style={{
                borderRadius: '9999px',
                boxShadow: kustomAktif ? '0 0 0 2px #fff, 0 0 0 4px ' + value.warnaKustom : 'none',
              }}
            />
            Kustom
          </label>
        </div>
      </div>

      <div>
        <label className="label-field">Posisi di kertas (atas–bawah)</label>
        <Segmen opsi={OPSI_POSISI_V} nilai={value.posisiV} onPilih={(v) => ubah('posisiV', v)} />
      </div>

      <div>
        <label className="label-field">Ukuran kuitansi</label>
        <Segmen opsi={OPSI_UKURAN} nilai={value.ukuran} onPilih={(v) => ubah('ukuran', v)} />
      </div>

      <div>
        <label className="label-field">Perataan (kiri–kanan)</label>
        <Segmen opsi={OPSI_POSISI_H} nilai={value.posisiH} onPilih={(v) => ubah('posisiH', v)} />
        <p className="text-xs text-ink-700/50 mt-1">
          Kuitansi ukuran Penuh hampir selebar kertas, jadi perataan kiri/kanan baru terlihat pada ukuran Ringkas.
        </p>
      </div>
    </div>
  )
}
