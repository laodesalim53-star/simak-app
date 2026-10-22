// Vercel Serverless Function: /api/generate-perangkat
// Membuat draf ATP/KKTP atau Prota lewat Gemini (REST), membalas JSON terstruktur.
//
// Environment variable yang dipakai (samakan dengan yang dipakai /api/generate-rpp):
//   GEMINI_API_KEY   (alternatif: GOOGLE_API_KEY)
//   GEMINI_MODEL     (opsional, default di bawah)
//   SUPABASE_URL / SUPABASE_ANON_KEY  (alternatif: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
//                    dipakai untuk memastikan pemanggil sudah login.

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

const potong = (v, n) => String(v ?? '').slice(0, n)
const angka = (v, min, max, def) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}

async function sudahLogin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return false
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY belum diatur di server.')
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  })
  return r.ok
}

function buatPrompt(jenis, d) {
  const identitas = `- Mata pelajaran: ${d.mapel}
- Kelas: ${d.kelas}${d.fase ? ` (Fase ${d.fase})` : ''}
- Tahun ajaran: ${d.tahun_ajaran}
- Alokasi waktu tersedia: semester Ganjil ${d.kapasitas.Ganjil} JP, semester Genap ${d.kapasitas.Genap} JP`

  if (jenis === 'atp') {
    return `Anda ahli Kurikulum Merdeka di Indonesia. Susun Alur Tujuan Pembelajaran (ATP) beserta Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) untuk:
${identitas}

Aturan:
1. "cp": ringkasan Capaian Pembelajaran fase tersebut (maksimal 600 karakter).
2. "rows": 8 sampai 16 baris, berurutan secara logis dari awal sampai akhir tahun ajaran.
3. Setiap baris berisi: "elemen", "tujuan" (diawali kata kerja operasional), "materi", "kktp" (kriteria/indikator ketercapaian, 1-2 kalimat), "jp" (bilangan bulat), "semester" ("Ganjil" atau "Genap").
4. Total jp semester Ganjil tidak boleh melebihi ${d.kapasitas.Ganjil} dan semester Genap tidak boleh melebihi ${d.kapasitas.Genap}. Manfaatkan kira-kira 85-95% dari alokasi tersebut.
5. Gunakan bahasa Indonesia baku.

Balas HANYA dengan JSON: {"cp":"...","rows":[{"elemen":"...","tujuan":"...","materi":"...","kktp":"...","jp":4,"semester":"Ganjil"}]}`
  }

  return `Anda ahli Kurikulum Merdeka di Indonesia. Susun Program Tahunan (Prota) untuk:
${identitas}

Aturan:
1. "rows": 8 sampai 20 baris materi/tema berurutan logis.
2. Setiap baris berisi: "semester" ("Ganjil" atau "Genap"), "materi", "jp" (bilangan bulat).
3. Total jp semester Ganjil tidak boleh melebihi ${d.kapasitas.Ganjil} dan semester Genap tidak boleh melebihi ${d.kapasitas.Genap}. Manfaatkan kira-kira 85-95% dari alokasi tersebut.
4. Gunakan bahasa Indonesia baku.

Balas HANYA dengan JSON: {"rows":[{"semester":"Ganjil","materi":"...","jp":6}]}`
}

function ambilJson(teks) {
  const bersih = String(teks || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
  return JSON.parse(bersih)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method tidak diizinkan.' })
  }

  try {
    if (!(await sudahLogin(req))) return res.status(401).json({ error: 'Silakan login dulu.' })

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY belum diatur di server.' })

    const b = req.body || {}
    const jenis = b.jenis === 'prota' ? 'prota' : b.jenis === 'atp' ? 'atp' : null
    if (!jenis) return res.status(400).json({ error: 'Jenis harus atp atau prota.' })

    const data = {
      mapel: potong(b.mapel, 100),
      kelas: potong(b.kelas, 30),
      fase: potong(b.fase, 3),
      tahun_ajaran: potong(b.tahun_ajaran, 20),
      kapasitas: {
        Ganjil: angka(b.kapasitas?.Ganjil, 1, 400, 60),
        Genap: angka(b.kapasitas?.Genap, 1, 400, 60),
      },
    }
    if (!data.mapel || !data.kelas) {
      return res.status(400).json({ error: 'Mata pelajaran dan kelas wajib diisi.' })
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buatPrompt(jenis, data) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      }
    )
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      return res.status(502).json({ error: `Layanan AI menolak permintaan (${r.status}). ${t.slice(0, 200)}` })
    }

    const out = await r.json()
    const teks = out?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    let hasil
    try {
      hasil = ambilJson(teks)
    } catch {
      return res.status(502).json({ error: 'Respons AI tidak bisa dibaca. Coba lagi.' })
    }

    if (!Array.isArray(hasil?.rows) || hasil.rows.length === 0) {
      return res.status(502).json({ error: 'AI tidak menghasilkan baris. Coba lagi.' })
    }

    return res.status(200).json({
      cp: jenis === 'atp' ? potong(hasil.cp, 1500) : undefined,
      rows: hasil.rows.slice(0, 60),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan di server.' })
  }
}
