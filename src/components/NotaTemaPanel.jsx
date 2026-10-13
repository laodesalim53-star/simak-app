import {
  OPSI_POSISI_H,
  OPSI_POSISI_V,
  OPSI_UKURAN,
  OPSI_WARNA,
  bangunPalet,
} from '../lib/notaTema'

function Pilihan({ label, opsi, nilai, onPilih }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {opsi.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onPilih(o.key)}
            className={`px-2 py-1 text-xs rounded border ${
              nilai === o.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {o.nama}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Panel tampilan cetak Nota.
 * Props: tema, ubahTema  (keduanya dari useNotaTema()).
 */
export default function NotaTemaPanel({ tema, ubahTema }) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 print:hidden">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Warna kertas</p>
        <div className="flex flex-wrap items-center gap-2">
          {OPSI_WARNA.map((w) => {
            const aktif = tema.warna === w.key
            return (
              <button
                key={w.key}
                type="button"
                title={w.nama}
                onClick={() => ubahTema({ warna: w.key })}
                className={`h-7 w-7 rounded-full border-2 ${
                  aktif ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300'
                }`}
                style={{ background: bangunPalet({ warna: w.key }).paper }}
              />
            )
          })}
          <label
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer ${
              tema.warna === 'kustom' ? 'border-blue-600' : 'border-gray-300'
            }`}
          >
            Kustom
            <input
              type="color"
              value={tema.warnaKustom}
              onChange={(e) => ubahTema({ warna: 'kustom', warnaKustom: e.target.value })}
              className="h-5 w-6 cursor-pointer border-0 p-0"
            />
          </label>
        </div>
      </div>

      <Pilihan label="Ukuran" opsi={OPSI_UKURAN} nilai={tema.ukuran} onPilih={(v) => ubahTema({ ukuran: v })} />
      <Pilihan label="Posisi vertikal" opsi={OPSI_POSISI_V} nilai={tema.posisiV} onPilih={(v) => ubahTema({ posisiV: v })} />
      <Pilihan label="Posisi horizontal" opsi={OPSI_POSISI_H} nilai={tema.posisiH} onPilih={(v) => ubahTema({ posisiH: v })} />
    </div>
  )
}
