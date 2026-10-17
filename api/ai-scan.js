/**
 * api/ai-scan.js
 * Versi Gemini — pakai GEMINI_API_KEY yang sudah ada di environment variables,
 * jadi tidak perlu bikin akun/API key baru.
 *
 * Format: Next.js Pages Router (sama seperti generate-rpp.js, livekit-token.js, dll di repo ini)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Pastikan pemanggil adalah user Supabase yang sedang login.
async function userTerautentikasi(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return false
  try {
    const r = await fetch(process.env.VITE_SUPABASE_URL + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: process.env.VITE_SUPABASE_ANON_KEY },
    })
    return r.ok
  } catch {
    return false
  }
}

const BAHASA_LABEL = {
  ind: 'Bahasa Indonesia',
  eng: 'Bahasa Inggris',
  'ind+eng': 'campuran Bahasa Indonesia dan Inggris',
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // gambar base64 bisa cukup besar
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan.' })
  }

  if (!(await userTerautentikasi(req))) {
    return res.status(401).json({ error: 'Silakan login terlebih dahulu.' })
  }

  try {
    const { image, mimeType, bahasa } = req.body

    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan.' })
    }

    const labelBahasa = BAHASA_LABEL[bahasa] || 'bahasa aslinya'

    const prompt = `Baca semua teks yang ada pada gambar dokumen ini dan tuliskan ulang persis apa adanya (dalam ${labelBahasa}), tanpa menerjemahkan, tanpa menambahkan komentar, tanpa markdown. Pertahankan urutan baris dan struktur paragraf semirip mungkin dengan aslinya. Jika ada tabel, susun sebagai teks rata dengan pemisah spasi/tab. Jika sebagian tulisan tidak terbaca, tulis [tidak terbaca] di bagian itu. Balas HANYA dengan teks hasil bacaan, tidak ada kalimat pembuka atau penutup.`

    const text = await scanWithFallback(image, mimeType, prompt)

    if (!text) {
      return res.status(502).json({ error: 'Gemini tidak mengembalikan teks.' })
    }

    return res.status(200).json({ text })
  } catch (err) {
    console.error('AI Scan (Gemini) error:', err)
    const isOverloaded = err?.status === 503 || /high demand|overloaded/i.test(err?.message || '')
    return res.status(isOverloaded ? 503 : 500).json({
      error: isOverloaded
        ? 'Server Gemini sedang sibuk. Coba lagi dalam beberapa saat.'
        : 'Gagal memproses gambar dengan AI.',
    })
  }
}

// Coba beberapa model secara berurutan, dengan sedikit retry di tiap model,
// supaya kalau satu model lagi penuh (503), otomatis pindah ke model lain.
const MODEL_CANDIDATES = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash']

async function scanWithFallback(image, mimeType, prompt) {
  let lastErr
  for (const modelName of MODEL_CANDIDATES) {
    const model = genAI.getGenerativeModel({ model: modelName })
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent([
          { inlineData: { data: image, mimeType } },
          { text: prompt },
        ])
        return result.response.text()
      } catch (err) {
        lastErr = err
        const isOverloaded = err?.status === 503 || /high demand|overloaded/i.test(err?.message || '')
        if (!isOverloaded) throw err // error lain (auth, format, dll) -> jangan retry, langsung lempar
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1))) // tunggu sebentar sebelum retry
      }
    }
    // habis retry untuk model ini masih 503 -> lanjut ke model berikutnya
  }
  throw lastErr
}
