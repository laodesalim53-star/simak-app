// supabase/functions/demo-login/index.ts
//
// Tujuan fungsi ini: menyimpan kredensial akun demo (Sekolah, KUA,
// Puskesmas) sebagai SECRET di sisi server, bukan di kode React yang
// dikirim ke browser pengunjung. Sebelumnya Beranda.jsx memuat
// DEMO_EMAIL/DEMO_PASSWORD dkk langsung sebagai konstanta — siapa saja
// bisa buka DevTools dan membacanya. Sekarang alurnya:
//
//   1. Pengunjung klik "Coba Demo" di Beranda.
//   2. Beranda.jsx memanggil fungsi ini lewat supabase.functions.invoke,
//      hanya mengirim { untuk: 'sekolah' | 'kua' | 'puskesmas' }.
//   3. Fungsi ini (berjalan di server, bukan di browser) membaca email &
//      password akun demo dari secret, lalu sign-in ke Supabase Auth.
//   4. Fungsi mengembalikan access_token & refresh_token saja ke
//      browser, yang dipasang lewat supabase.auth.setSession(...).
//
// ---- Langkah instalasi -------------------------------------------------
// 1. Salin file ini ke: supabase/functions/demo-login/index.ts
//    di dalam repo simak-app Anda.
//
// 2. Set kredensial akun demo sebagai secret (JANGAN ditulis di kode):
//      supabase secrets set DEMO_SEKOLAH_EMAIL=sdnusantara@gmail.com
//      supabase secrets set DEMO_SEKOLAH_PASSWORD=Demo123
//      supabase secrets set DEMO_KUA_EMAIL=demokua@sdnusantara.gmail.com
//      supabase secrets set DEMO_KUA_PASSWORD=DemoKua123
//      supabase secrets set DEMO_PUSKESMAS_EMAIL=demopuskesmas@sdnusantara.gmail.com
//      supabase secrets set DEMO_PUSKESMAS_PASSWORD=DemoPuskesmas123
//
//    (Sekalian ini kesempatan bagus untuk GANTI password akun-akun demo
//    ini ke yang baru, karena password lama sempat terlihat di kode lama.)
//
// 3. Deploy fungsinya:
//      supabase functions deploy demo-login
//
// 4. PENTING — tetap pasang Row Level Security (RLS) yang membatasi akun
//    demo ini hanya bisa membaca/menulis data demo miliknya sendiri, dan
//    idealnya read-only atau direset berkala. Edge Function ini membuat
//    password tidak lagi bocor lewat kode frontend, TAPI kalau RLS-nya
//    longgar, akun demo tetap bisa dipakai untuk mengubah/menghapus data
//    lain. Kedua lapisan ini saling melengkapi, bukan pengganti satu
//    sama lain.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

const AKUN_DEMO = {
  sekolah: {
    email: Deno.env.get('DEMO_SEKOLAH_EMAIL'),
    password: Deno.env.get('DEMO_SEKOLAH_PASSWORD'),
  },
  kua: {
    email: Deno.env.get('DEMO_KUA_EMAIL'),
    password: Deno.env.get('DEMO_KUA_PASSWORD'),
  },
  puskesmas: {
    email: Deno.env.get('DEMO_PUSKESMAS_EMAIL'),
    password: Deno.env.get('DEMO_PUSKESMAS_PASSWORD'),
  },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Preflight CORS dari browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { untuk } = await req.json()
    const jenis = untuk === 'kua' || untuk === 'puskesmas' ? untuk : 'sekolah'
    const akun = AKUN_DEMO[jenis]

    if (!akun?.email || !akun?.password) {
      throw new Error(`Kredensial demo untuk "${jenis}" belum diset sebagai secret`)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: akun.email,
      password: akun.password,
    })

    if (error || !data.session) {
      throw error || new Error('Gagal membuat sesi demo')
    }

    return new Response(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
