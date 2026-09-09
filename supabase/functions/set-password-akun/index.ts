// supabase/functions/set-password-akun/index.ts
//
// Mengganti password akun lain secara langsung (tanpa lewat email reset).
// Butuh service role key, jadi WAJIB dijalankan sebagai Edge Function —
// tidak boleh dipanggil langsung dari frontend dengan service role key
// tertanam di sana.
//
// Otorisasi: hanya boleh dipanggil oleh
//   - superadmin (bisa ganti password akun manapun), atau
//   - admin / admin_utama / kepala_sekolah, TAPI hanya untuk akun yang
//     sekolah_id-nya sama dengan sekolah_id pemanggil sendiri.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { akun_id, password_baru } = await req.json()

    if (!akun_id || !password_baru) {
      return new Response(
        JSON.stringify({ error: 'Data tidak lengkap: akun_id dan password_baru wajib diisi.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password_baru.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password minimal 6 karakter.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Tidak terautentikasi.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client biasa (pakai anon key + token pemanggil) — dipakai untuk
    // memverifikasi SIAPA yang memanggil, lewat RLS normal.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sesi tidak valid, silakan login ulang.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: pemanggil, error: pemanggilError } = await supabaseUser
      .from('profil')
      .select('role, sekolah_id')
      .eq('id', user.id)
      .maybeSingle()

    if (pemanggilError || !pemanggil) {
      return new Response(
        JSON.stringify({ error: 'Gagal memverifikasi profil pemanggil.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client dengan service role — dipakai untuk baca data lintas-RLS &
    // untuk benar-benar mengganti password lewat Admin API.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profil')
      .select('sekolah_id')
      .eq('id', akun_id)
      .maybeSingle()

    if (targetError || !target) {
      return new Response(
        JSON.stringify({ error: 'Akun target tidak ditemukan.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rolePemanggilBolehAdmin = ['admin', 'admin_utama', 'kepala_sekolah'].includes(pemanggil.role)
    const berwenang =
      pemanggil.role === 'superadmin' ||
      (rolePemanggilBolehAdmin && pemanggil.sekolah_id === target.sekolah_id)

    if (!berwenang) {
      return new Response(
        JSON.stringify({ error: 'Anda tidak berwenang mengganti password akun ini.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(akun_id, {
      password: password_baru,
    })

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
