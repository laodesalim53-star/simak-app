// supabase/functions/verifikasi-nik/index.ts
//
// Edge Function untuk verifikasi NIK ke Dukcapil.
//
// KENAPA HARUS LEWAT EDGE FUNCTION (bukan dipanggil langsung dari
// frontend)?
// Kredensial API Dukcapil/vendor pihak ketiga TIDAK BOLEH pernah ada
// di kode frontend (React/browser), karena bisa dilihat siapa saja
// lewat DevTools/Network tab. Edge Function berjalan di server
// Supabase, jadi kredensialnya aman disimpan sebagai secret dan tidak
// pernah terkirim ke browser.
//
// STATUS SAAT INI: BELUM DIKONFIGURASI.
// Karena institusi Anda belum punya akses resmi ke Dukcapil (baik
// lewat PKS langsung ke Kemendagri, atau lewat vendor pihak ketiga
// berizin seperti Verihubs/Privy/VIDA), fungsi ini akan selalu
// membalas status "belum_dikonfigurasi" sampai secret di bawah diisi.
// Ini supaya halaman admin tetap bisa dipakai sekarang, dan begitu
// akses resmi didapat, Anda tinggal:
//   1. Isi secret DUKCAPIL_API_URL dan DUKCAPIL_API_KEY (lihat bawah).
//   2. Sesuaikan fungsi `panggilProviderDukcapil()` di bawah dengan
//      kontrak teknis (format request/response) dari provider Anda —
//      isinya beda-beda tergantung PKS langsung Kemendagri atau vendor.
//
// CARA SET SECRET (dari terminal, setelah Supabase CLI login):
//   supabase secrets set DUKCAPIL_API_URL=https://... 
//   supabase secrets set DUKCAPIL_API_KEY=xxxxxxxx
//   supabase functions deploy verifikasi-nik
//
// Body request yang diharapkan dari frontend:
//   { "nik": "16 digit angka", "nama_lengkap": "opsional, untuk cek kecocokan nama" }
//
// Response (selalu HTTP 200, hasil dibedakan lewat field "status" agar
// gampang ditangani di frontend tanpa parsing error HTTP yang ribet):
//   {
//     "status": "ok" | "tidak_valid" | "belum_dikonfigurasi" | "format_salah" | "error",
//     "pesan": "penjelasan singkat untuk ditampilkan ke admin",
//     "nama_dukcapil": "nama sesuai data Dukcapil, kalau tersedia" | null,
//     "cocok_nama": true | false | null
//   }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function nikValid(nik: unknown): nik is string {
  return typeof nik === 'string' && /^\d{16}$/.test(nik)
}

// -----------------------------------------------------------------
// TODO: sesuaikan fungsi ini dengan kontrak teknis provider Anda
// begitu akses resmi Dukcapil sudah didapat. Bagian ini SENGAJA
// belum dihubungkan ke endpoint sungguhan karena kontraknya beda-beda:
//
// - Kalau lewat PKS langsung Kemendagri (web service Dukcapil):
//   biasanya butuh format request/response dan skema autentikasi
//   khusus yang dijelaskan saat serah-terima akses (uji coba koneksi).
// - Kalau lewat vendor pihak ketiga (Verihubs/Privy/VIDA/dll):
//   ikuti dokumentasi API resmi vendor tersebut — biasanya REST API
//   dengan API key sederhana, tinggal ganti URL & mapping field di
//   bawah.
// -----------------------------------------------------------------
async function panggilProviderDukcapil(
  apiUrl: string,
  apiKey: string,
  nik: string,
  namaLengkap: string | null,
) {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // TODO: sesuaikan skema autentikasi (Bearer token, header
      // khusus, dll) sesuai dokumentasi provider Anda.
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ nik }),
  })

  if (!res.ok) {
    throw new Error(`Provider Dukcapil membalas status ${res.status}`)
  }

  const data = await res.json()

  // TODO: sesuaikan mapping field di bawah dengan bentuk response
  // asli dari provider Anda. Placeholder ini hanya contoh struktur.
  const namaDariProvider: string | null = data?.nama ?? data?.nama_lengkap ?? null
  const ditemukan = Boolean(data?.valid ?? data?.ditemukan ?? namaDariProvider)

  let cocokNama: boolean | null = null
  if (namaLengkap && namaDariProvider) {
    cocokNama = namaLengkap.trim().toLowerCase() === namaDariProvider.trim().toLowerCase()
  }

  return {
    status: ditemukan ? 'ok' : 'tidak_valid',
    pesan: ditemukan
      ? 'NIK ditemukan dan sesuai data Dukcapil.'
      : 'NIK tidak ditemukan / tidak valid menurut data Dukcapil.',
    nama_dukcapil: namaDariProvider,
    cocok_nama: cocokNama,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ status: 'error', pesan: 'Method tidak didukung.' }, 405)
  }

  let body: { nik?: unknown; nama_lengkap?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ status: 'format_salah', pesan: 'Body request bukan JSON yang valid.' })
  }

  if (!nikValid(body.nik)) {
    return json({
      status: 'format_salah',
      pesan: 'NIK harus berupa 16 digit angka.',
      nama_dukcapil: null,
      cocok_nama: null,
    })
  }

  const namaLengkap = typeof body.nama_lengkap === 'string' ? body.nama_lengkap : null

  const apiUrl = Deno.env.get('DUKCAPIL_API_URL')
  const apiKey = Deno.env.get('DUKCAPIL_API_KEY')

  if (!apiUrl || !apiKey) {
    return json({
      status: 'belum_dikonfigurasi',
      pesan: 'Integrasi verifikasi NIK ke Dukcapil belum diaktifkan. Hubungi admin sistem.',
      nama_dukcapil: null,
      cocok_nama: null,
    })
  }

  try {
    const hasil = await panggilProviderDukcapil(apiUrl, apiKey, body.nik, namaLengkap)
    return json(hasil)
  } catch (err) {
    console.error('Gagal memanggil provider Dukcapil:', err)
    return json({
      status: 'error',
      pesan: 'Gagal menghubungi layanan verifikasi Dukcapil. Coba lagi nanti.',
      nama_dukcapil: null,
      cocok_nama: null,
    })
  }
})
