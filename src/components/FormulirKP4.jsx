import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  )
}

function formatTanggal(iso) {
  if (!iso) return ''
  const s = String(iso).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(iso)
  return new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Ambil nilai pertama yang terisi dari beberapa kemungkinan nama kolom
function ambil(raw, ...keys) {
  for (const k of keys) {
    if (raw && raw[k] != null && raw[k] !== '') return String(raw[k])
  }
  return ''
}

function normalJk(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'l' || s.startsWith('laki')) return 'Laki-laki'
  if (s === 'p' || s.startsWith('perempuan') || s.startsWith('wanita')) return 'Perempuan'
  return v || ''
}

// Gabungkan kolom alamat dari tabel guru (alamat_jalan, RT, RW, dusun, desa, kecamatan)
function gabungAlamat(r) {
  return [
    ambil(r, 'alamat_jalan', 'alamat', 'alamat_rumah'),
    r?.rt ? `RT ${r.rt}` : '',
    r?.rw ? `RW ${r.rw}` : '',
    ambil(r, 'nama_dusun'),
    ambil(r, 'desa_kelurahan'),
    ambil(r, 'kecamatan'),
  ]
    .filter(Boolean)
    .join(', ')
}

let urut = 0
const idBaru = () => ++urut
const pasanganBaru = () => ({ id: idBaru(), nama: '', nip: '', tglLahir: '', tglNikah: '', pekerjaan: '', ket: '' })
const anakBaru = () => ({ id: idBaru(), nama: '', tglLahir: '', status: 'Kandung', sekolah: '', ket: '' })

const pegawaiKosong = {
  guruId: '',
  nama: '',
  nip: '',
  tempatLahir: '',
  tglLahir: '',
  jk: '',
  agama: '',
  pendidikan: '',
  pangkat: '',
  jabatan: '',
  unitKerja: null, // null = otomatis dari nama sekolah
  alamat: '',
  statusKawin: 'Kawin',
  jumlahAnak: '', // info dari data guru (jumlah anak tanggungan)
}

const SEL = { border: '1px solid #000', padding: '1.5mm 2mm', fontSize: '10.5pt' }
const MIN_BARIS_PASANGAN = 2
const MIN_BARIS_ANAK = 5

// ============================================================
// Lembar KP4 (pratinjau layar + salinan cetak)
// ============================================================
function LembarKP4({ layar, p, unit, pasangan, anak, tempat, tanggal, kepala, nipKepala }) {
  const dataPegawai = [
    ['Nama Lengkap', p.nama],
    ['NIP', p.nip],
    ['Tempat / Tanggal Lahir', [p.tempatLahir, formatTanggal(p.tglLahir)].filter(Boolean).join(', ')],
    ['Jenis Kelamin', p.jk],
    ['Agama', p.agama],
    ['Pendidikan Terakhir', p.pendidikan],
    ['Pangkat / Golongan Ruang', p.pangkat],
    ['Jabatan', p.jabatan],
    ['Unit Kerja / Instansi', unit],
    ['Alamat', p.alamat],
    ['Status Perkawinan', p.statusKawin],
  ]

  const barisPasangan = [...pasangan]
  while (barisPasangan.length < MIN_BARIS_PASANGAN) barisPasangan.push({ id: `kp-${barisPasangan.length}` })
  const barisAnak = [...anak]
  while (barisAnak.length < MIN_BARIS_ANAK) barisAnak.push({ id: `ka-${barisAnak.length}` })

  const th = { ...SEL, textAlign: 'center', fontWeight: 700 }
  const td = { ...SEL, height: '8mm', verticalAlign: 'middle' }

  return (
    <div
      style={{
        width: '210mm',
        minHeight: layar ? '297mm' : undefined,
        boxSizing: 'border-box',
        padding: '15mm 20mm 18mm',
        background: '#fff',
        color: '#000',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '11pt',
        lineHeight: 1.3,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 700 }}>
        <p style={{ fontSize: '13pt' }}>FORMULIR KP4</p>
        <p>UNTUK MENDAPATKAN PEMBAYARAN TUNJANGAN KELUARGA</p>
      </div>

      <p style={{ marginTop: '7mm', marginBottom: '2mm' }}>Saya yang bertanda tangan di bawah ini:</p>

      <div style={{ display: 'grid', gridTemplateColumns: '8mm 52mm 4mm 1fr', rowGap: '1mm' }}>
        {dataPegawai.map(([label, nilai], i) => (
          <div key={label} style={{ display: 'contents' }}>
            <span>{i + 1}.</span>
            <span>{label}</span>
            <span>:</span>
            <span style={{ whiteSpace: 'pre-line' }}>{nilai}</span>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '5mm', marginBottom: '2mm' }}>Dengan ini menerangkan susunan keluarga saya sebagai berikut:</p>

      <p style={{ fontWeight: 700, marginBottom: '1mm' }}>A. Suami / Isteri</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '29%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th}>No</th>
            <th style={th}>Nama</th>
            <th style={th}>Tgl. Lahir</th>
            <th style={th}>Tgl. Nikah</th>
            <th style={th}>Pekerjaan</th>
            <th style={th}>Ket.</th>
          </tr>
        </thead>
        <tbody>
          {barisPasangan.map((r, i) => (
            <tr key={r.id}>
              <td style={{ ...td, textAlign: 'center' }}>{r.nama ? i + 1 : ''}</td>
              <td style={td}>
                {r.nama}
                {r.nip && <div style={{ fontSize: '9pt' }}>NIP. {r.nip}</div>}
              </td>
              <td style={td}>{formatTanggal(r.tglLahir)}</td>
              <td style={td}>{formatTanggal(r.tglNikah)}</td>
              <td style={td}>{r.pekerjaan}</td>
              <td style={td}>{r.ket}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontWeight: 700, margin: '4mm 0 1mm' }}>B. Anak</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '29%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={th}>No</th>
            <th style={th}>Nama</th>
            <th style={th}>Tgl. Lahir</th>
            <th style={th}>Status Anak</th>
            <th style={th}>Sekolah / Pekerjaan</th>
            <th style={th}>Ket.</th>
          </tr>
        </thead>
        <tbody>
          {barisAnak.map((r, i) => (
            <tr key={r.id}>
              <td style={{ ...td, textAlign: 'center' }}>{r.nama ? i + 1 : ''}</td>
              <td style={td}>{r.nama}</td>
              <td style={td}>{formatTanggal(r.tglLahir)}</td>
              <td style={td}>{r.nama ? r.status : ''}</td>
              <td style={td}>{r.sekolah}</td>
              <td style={td}>{r.ket}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: '5mm', textAlign: 'justify' }}>
        Demikian daftar keluarga ini saya buat dengan sebenarnya. Apabila di kemudian hari keterangan ini tidak benar, saya bersedia
        menerima sanksi sesuai ketentuan yang berlaku dan mengembalikan kelebihan pembayaran tunjangan.
      </p>

      <div
        style={{
          marginTop: '8mm',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10mm',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        <div>
          <p>&nbsp;</p>
          <p>Mengetahui,</p>
          <p>Kepala Sekolah,</p>
          <div style={{ height: '22mm' }} />
          <p style={{ fontWeight: 700, textDecoration: 'underline' }}>{kepala || '.............................'}</p>
          <p>NIP. {nipKepala || '.............................'}</p>
        </div>
        <div>
          <p>
            {tempat ? `${tempat}, ` : ''}
            {formatTanggal(tanggal)}
          </p>
          <p>Yang membuat daftar,</p>
          <p>&nbsp;</p>
          <div style={{ height: '22mm' }} />
          <p style={{ fontWeight: 700, textDecoration: 'underline' }}>{p.nama || '.............................'}</p>
          <p>NIP. {p.nip || '.............................'}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab: form isian + pratinjau + salinan cetak
//
// Props:
//  - aktif            : true bila tab KP4 sedang dibuka (portal cetak hanya dipasang saat aktif)
//  - guruSurat        : guru pada Surat Pengantar { id, nama, nip, raw } -> mengisi data pegawai otomatis
//  - tempatDefault, tanggalDefault, kepalaDefault, nipKepalaDefault : dari Surat Pengantar
// ============================================================
export default function FormulirKP4({
  aktif,
  daftarGuru,
  guruSurat,
  namaSekolah,
  tempatDefault,
  tanggalDefault,
  kepalaDefault,
  nipKepalaDefault,
  cssCetak,
}) {
  const [p, setP] = useState(pegawaiKosong)
  const [pasangan, setPasangan] = useState(() => [pasanganBaru()])
  const [anak, setAnak] = useState(() => [anakBaru()])
  const [tanggalK, setTanggalK] = useState(null)
  const [tempatK, setTempatK] = useState(null)
  const [kepalaK, setKepalaK] = useState(null)
  const [nipKepalaK, setNipKepalaK] = useState(null)

  const [siapCetak, setSiapCetak] = useState(false)
  useEffect(() => setSiapCetak(true), [])

  const set = (patch) => setP((l) => ({ ...l, ...patch }))

  function pilihGuru(id) {
    if (!id || id === '__manual') {
      set({ guruId: id })
      return
    }
    const g = daftarGuru.find((x) => x.id === id)
    if (!g) return
    const r = g.raw || {}
    set({
      guruId: id,
      nama: g.nama,
      nip: g.nip,
      tempatLahir: ambil(r, 'tempat_lahir', 'tmp_lahir'),
      tglLahir: ambil(r, 'tanggal_lahir', 'tgl_lahir').slice(0, 10),
      jk: normalJk(ambil(r, 'jenis_kelamin', 'jk', 'gender')),
      agama: ambil(r, 'agama'),
      pendidikan: ambil(r, 'pendidikan_terakhir', 'pendidikan'),
      pangkat: ambil(r, 'pangkat_golongan', 'golongan', 'pangkat', 'pangkat_gol'),
      jabatan: g.jabatan,
      alamat: gabungAlamat(r),
      statusKawin: ambil(r, 'status_perkawinan') || 'Kawin',
      jumlahAnak: ambil(r, 'jumlah_anak_tanggungan'),
    })
    // Suami/isteri otomatis dari data guru (nama, NIP, pekerjaan)
    const namaPasangan = ambil(r, 'nama_pasangan')
    setPasangan([
      namaPasangan
        ? { ...pasanganBaru(), nama: namaPasangan, nip: ambil(r, 'nip_pasangan'), pekerjaan: ambil(r, 'pekerjaan_pasangan') }
        : pasanganBaru(),
    ])
  }

  // Isi data pegawai dari guru yang dipilih pada Surat Pengantar
  function isiDariSurat() {
    if (!guruSurat) return
    if (guruSurat.id === '__manual') {
      setP({ ...pegawaiKosong, guruId: '__manual', nama: guruSurat.nama || '', nip: guruSurat.nip || '' })
      setPasangan([pasanganBaru()])
    } else {
      pilihGuru(guruSurat.id)
    }
  }

  // Otomatis terisi setiap kali guru di Surat Pengantar berubah (atau daftar guru selesai dimuat)
  const kunciGuru = guruSurat ? `${guruSurat.id}|${guruSurat.nama}|${guruSurat.nip}` : ''
  useEffect(() => {
    isiDariSurat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciGuru, daftarGuru])

  const ubahPasangan = (id, patch) => setPasangan((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const ubahAnak = (id, patch) => setAnak((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const unit = p.unitKerja ?? namaSekolah
  const tempat = tempatK ?? tempatDefault
  const tanggal = tanggalK ?? tanggalDefault
  const kepala = kepalaK ?? kepalaDefault
  const nipKepala = nipKepalaK ?? nipKepalaDefault

  const propsLembar = { p, unit, pasangan, anak, tempat, tanggal, kepala, nipKepala }

  return (
    <div className={aktif ? undefined : 'hidden'}>
      <div className="mt-4 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Form */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data pegawai</p>

          {guruSurat ? (
            <div className="flex items-start justify-between gap-2 rounded bg-blue-50 p-2 text-xs text-blue-800">
              <span>
                Terisi otomatis dari Surat Pengantar (guru: <b>{guruSurat.nama}</b>).
              </span>
              <button type="button" onClick={isiDariSurat} className="shrink-0 font-medium underline">
                Isi ulang
              </button>
            </div>
          ) : (
            <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">
              Pilih guru di tab surat pengantar mana pun (bagian “Guru”) agar data terisi otomatis, atau pilih di bawah ini.
            </p>
          )}

          <Field label="Pilih guru">
            <select className={inputCls} value={p.guruId} onChange={(e) => pilihGuru(e.target.value)}>
              <option value="">— Pilih guru —</option>
              {daftarGuru.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                  {g.nip ? ` (${g.nip})` : ''}
                </option>
              ))}
              <option value="__manual">Ketik manual…</option>
            </select>
          </Field>

          <Field label="Nama lengkap">
            <input className={inputCls} value={p.nama} onChange={(e) => set({ nama: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NIP">
              <input className={inputCls} value={p.nip} onChange={(e) => set({ nip: e.target.value })} />
            </Field>
            <Field label="Jenis kelamin">
              <select className={inputCls} value={p.jk} onChange={(e) => set({ jk: e.target.value })}>
                <option value="">—</option>
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </Field>
            <Field label="Tempat lahir">
              <input className={inputCls} value={p.tempatLahir} onChange={(e) => set({ tempatLahir: e.target.value })} />
            </Field>
            <Field label="Tanggal lahir">
              <input type="date" className={inputCls} value={p.tglLahir} onChange={(e) => set({ tglLahir: e.target.value })} />
            </Field>
            <Field label="Agama">
              <input className={inputCls} value={p.agama} onChange={(e) => set({ agama: e.target.value })} />
            </Field>
            <Field label="Pendidikan terakhir">
              <input className={inputCls} value={p.pendidikan} onChange={(e) => set({ pendidikan: e.target.value })} />
            </Field>
            <Field label="Pangkat / Gol. ruang">
              <input className={inputCls} value={p.pangkat} onChange={(e) => set({ pangkat: e.target.value })} />
            </Field>
            <Field label="Jabatan">
              <input className={inputCls} value={p.jabatan} onChange={(e) => set({ jabatan: e.target.value })} />
            </Field>
          </div>
          <Field label="Unit kerja / instansi">
            <input className={inputCls} value={unit} onChange={(e) => set({ unitKerja: e.target.value })} />
          </Field>
          <Field label="Alamat">
            <textarea rows={2} className={inputCls} value={p.alamat} onChange={(e) => set({ alamat: e.target.value })} />
          </Field>
          <Field label="Status perkawinan">
            <select className={inputCls} value={p.statusKawin} onChange={(e) => set({ statusKawin: e.target.value })}>
              <option>Belum Kawin</option>
              <option>Kawin</option>
              <option>Cerai Hidup</option>
              <option>Cerai Mati</option>
            </select>
          </Field>

          {/* Suami / Isteri */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suami / Isteri</p>
            {pasangan.map((x, i) => (
              <div key={x.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Baris {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setPasangan((l) => l.filter((y) => y.id !== x.id))}
                    className="text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
                <input className={inputCls} placeholder="Nama" value={x.nama} onChange={(e) => ubahPasangan(x.id, { nama: e.target.value })} />
                <input className={inputCls} placeholder="NIP (bila PNS)" value={x.nip} onChange={(e) => ubahPasangan(x.id, { nip: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tgl. lahir">
                    <input type="date" className={inputCls} value={x.tglLahir} onChange={(e) => ubahPasangan(x.id, { tglLahir: e.target.value })} />
                  </Field>
                  <Field label="Tgl. nikah">
                    <input type="date" className={inputCls} value={x.tglNikah} onChange={(e) => ubahPasangan(x.id, { tglNikah: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Pekerjaan" value={x.pekerjaan} onChange={(e) => ubahPasangan(x.id, { pekerjaan: e.target.value })} />
                  <input className={inputCls} placeholder="Keterangan" value={x.ket} onChange={(e) => ubahPasangan(x.id, { ket: e.target.value })} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setPasangan((l) => [...l, pasanganBaru()])} className="text-sm font-medium text-blue-700 hover:underline">
              + Tambah suami / isteri
            </button>
          </div>

          {/* Anak */}
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anak</p>
            {p.jumlahAnak && (
              <p className="rounded bg-blue-50 p-2 text-xs text-blue-800">
                Data guru mencatat jumlah anak tanggungan: <b>{p.jumlahAnak}</b>. Nama dan tanggal lahir anak diisi manual.
              </p>
            )}
            {anak.map((x, i) => (
              <div key={x.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Anak {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setAnak((l) => l.filter((y) => y.id !== x.id))}
                    className="text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
                <input className={inputCls} placeholder="Nama" value={x.nama} onChange={(e) => ubahAnak(x.id, { nama: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tgl. lahir">
                    <input type="date" className={inputCls} value={x.tglLahir} onChange={(e) => ubahAnak(x.id, { tglLahir: e.target.value })} />
                  </Field>
                  <Field label="Status anak">
                    <select className={inputCls} value={x.status} onChange={(e) => ubahAnak(x.id, { status: e.target.value })}>
                      <option>Kandung</option>
                      <option>Tiri</option>
                      <option>Angkat</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} placeholder="Sekolah / pekerjaan" value={x.sekolah} onChange={(e) => ubahAnak(x.id, { sekolah: e.target.value })} />
                  <input className={inputCls} placeholder="Keterangan" value={x.ket} onChange={(e) => ubahAnak(x.id, { ket: e.target.value })} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setAnak((l) => [...l, anakBaru()])} className="text-sm font-medium text-blue-700 hover:underline">
              + Tambah anak
            </button>
          </div>

          {/* Tanda tangan (default dari Surat Pengantar) */}
          <div className="space-y-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanda tangan</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempat">
                <input className={inputCls} value={tempat} onChange={(e) => setTempatK(e.target.value)} />
              </Field>
              <Field label="Tanggal">
                <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggalK(e.target.value)} />
              </Field>
            </div>
            <Field label="Nama Kepala Sekolah">
              <input className={inputCls} value={kepala} onChange={(e) => setKepalaK(e.target.value)} />
            </Field>
            <Field label="NIP Kepala Sekolah">
              <input className={inputCls} value={nipKepala} onChange={(e) => setNipKepalaK(e.target.value)} />
            </Field>
            {(tempatK !== null || tanggalK !== null || kepalaK !== null || nipKepalaK !== null) && (
              <button
                type="button"
                onClick={() => {
                  setTempatK(null)
                  setTanggalK(null)
                  setKepalaK(null)
                  setNipKepalaK(null)
                }}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                Kembalikan ke data Surat Pengantar
              </button>
            )}
          </div>
        </div>

        {/* Pratinjau */}
        <div className="overflow-auto rounded-lg bg-slate-200 p-4">
          <div className="mx-auto w-fit shadow-lg">
            <LembarKP4 layar {...propsLembar} />
          </div>
        </div>
      </div>

      {aktif &&
        siapCetak &&
        createPortal(
          <div className="sp-print-root">
            <style>{cssCetak}</style>
            <LembarKP4 {...propsLembar} />
          </div>,
          document.body
        )}
    </div>
  )
}
