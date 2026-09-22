// Edge Function pendaftaran akun (mode 'baru' & 'gabung', sekolah & kantor).
// Publik (dipanggil orang yang belum punya akun), jadi SEMUA validasi di sini.
// Role & status ditentukan server, tidak pernah dipercaya dari request.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Jabatan yang BOLEH dipilih lewat pendaftaran mandiri.
// Ini hanya LABEL jabatan, bukan role. Role sebenarnya ditentukan server
// di bagian 3 di bawah, dan admin yang menaikkannya saat persetujuan.
// Sengaja TIDAK memuat admin_utama dan superadmin.
const JABATAN_SEKOLAH = ['guru', 'orang_tua', 'admin', 'kepala_sekolah']
const JABATAN_KANTOR = ['pegawai', 'kepala_kantor', 'admin']
const HUBUNGAN_VALID = ['ayah', 'ibu', 'wali'] // sesuaikan dengan pilihan di form

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// ---------- Notifikasi email ke superadmin ----------
// Best-effort: kalau gagal (API key belum diset, Resend error, dll),
// pendaftaran TETAP dianggap sukses — cuma dicatat di log function.
async function kirimNotifikasiSuperadmin(
  adminClient: ReturnType<typeof createClient>,
  info: { namaLengkap: string; email: string; jenisOrganisasi: string; namaOrganisasi: string; mode: string }
) {
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    if (!resendKey || !fromEmail) {
      console.warn('RESEND_API_KEY / RESEND_FROM_EMAIL belum diset, notifikasi email dilewati.')
      return
    }

    const { data: superadmins, error } = await adminClient
      .from('profil')
      .select('email_pendaftar')
      .eq('role', 'superadmin')
      .eq('status_akun', 'aktif')

    if (error) {
      console.error('Gagal mengambil daftar superadmin:', error.message)
      return
    }

    const tujuan = (superadmins || [])
      .map((s) => s.email_pendaftar)
      .filter((e): e is string => Boolean(e))

    if (tujuan.length === 0) {
      console.warn('Tidak ada email superadmin ditemukan, notifikasi dilewati.')
      return
    }

    const labelJenis = info.jenisOrganisasi === 'kantor' ? 'Kantor (KUA)' : 'Sekolah'
    const judul =
      info.mode === 'baru'
        ? `Pendaftar baru: ${labelJenis} "${info.namaOrganisasi}" (organisasi baru)`
        : `Pendaftar baru bergabung ke "${info.namaOrganisasi}"`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: tujuan,
        subject: judul,
        html: `
          <p>Ada pendaftaran akun baru yang menunggu persetujuan Anda.</p>
          <ul>
            <li><b>Nama:</b> ${info.namaLengkap}</li>
            <li><b>Email:</b> ${info.email}</li>
            <li><b>Jenis:</b> ${labelJenis}</li>
            <li><b>${info.mode === 'baru' ? 'Organisasi baru yang didaftarkan' : 'Bergabung ke'}:</b> ${info.namaOrganisasi}</li>
          </ul>
          <p>Silakan buka halaman Persetujuan Akun untuk meninjau.</p>
        `,
      }),
    })

    if (!res.ok) {
      console.error('Resend gagal kirim email:', res.status, await res.text())
    }
  } catch (e) {
    console.error('Gagal mengirim notifikasi superadmin:', e instanceof Error ? e.message : e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method tidak diizinkan' }, 405)

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Dicatat untuk rollback bila ada langkah yang gagal
  let userId: string | null = null
  let sekolahBaruId: string | null = null
  let pegawaiId: string | null = null
  let profilDibuat = false

  try {
    const body = await req.json()
    const mode = body.mode
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const namaLengkap = String(body.namaLengkap ?? '').trim()
    const namaSekolah = String(body.namaSekolah ?? '').trim()
    const sekolahId = body.sekolahId ?? null
    const siswaId = body.siswaId ?? null
    const hubungan = body.hubungan ?? null
    const nip = String(body.nip ?? '').trim()
    const jenisOrganisasi = body.jenisOrganisasi === 'kantor' ? 'kantor' : 'sekolah'

    // ---------- Validasi dasar ----------
    if (!['baru', 'gabung'].includes(mode)) throw new HttpError(400, 'Mode pendaftaran tidak valid.')
    if (!email || !email.includes('@')) throw new HttpError(400, 'Email tidak valid.')
    if (password.length < 6) throw new HttpError(400, 'Password minimal 6 karakter.')
    if (!namaLengkap) throw new HttpError(400, 'Nama lengkap wajib diisi.')

    const jabatanBoleh = jenisOrganisasi === 'kantor' ? JABATAN_KANTOR : JABATAN_SEKOLAH
    const jabatan = body.jabatan || (jenisOrganisasi === 'kantor' ? 'pegawai' : 'guru')
    if (!jabatanBoleh.includes(jabatan)) throw new HttpError(400, 'Jabatan tidak valid.')

    if (jenisOrganisasi === 'kantor' && !nip) throw new HttpError(400, 'NIP wajib diisi untuk akun Kantor.')

    const isOrangTua = jabatan === 'orang_tua'
    if (isOrangTua && mode !== 'gabung') {
      throw new HttpError(400, 'Akun orang tua/wali hanya dapat bergabung ke sekolah yang sudah terdaftar.')
    }
    if (mode === 'baru' && !namaSekolah) throw new HttpError(400, 'Nama organisasi wajib diisi.')
    if (mode === 'gabung' && !sekolahId) throw new HttpError(400, 'Silakan pilih sekolah/kantor terlebih dahulu.')
    if (isOrangTua) {
      if (!siswaId) throw new HttpError(400, 'Silakan pilih siswa yang merupakan anak/wali Anda.')
      if (!hubungan || !HUBUNGAN_VALID.includes(hubungan)) {
        throw new HttpError(400, 'Silakan pilih hubungan dengan siswa.')
      }
    }

    // ---------- Validasi target (SEBELUM membuat apa pun) ----------
    let targetSekolahId: string | null = null

    if (mode === 'gabung') {
      const { data: sekolah, error } = await adminClient
        .from('sekolah')
        .select('id, jenis_organisasi')
        .eq('id', sekolahId)
        .maybeSingle()
      if (error) throw new HttpError(500, 'Gagal memeriksa sekolah: ' + error.message)
      if (!sekolah) throw new HttpError(404, 'Sekolah/kantor tidak ditemukan.')
      if ((sekolah.jenis_organisasi ?? 'sekolah') !== jenisOrganisasi) {
        throw new HttpError(400, 'Jenis organisasi tidak sesuai.')
      }
      targetSekolahId = sekolah.id
    }

    if (isOrangTua) {
      const { data: siswa, error } = await adminClient
        .from('siswa')
        .select('id, sekolah_id')
        .eq('id', siswaId)
        .maybeSingle()
      if (error) throw new HttpError(500, 'Gagal memeriksa siswa: ' + error.message)
      if (!siswa) throw new HttpError(404, 'Siswa tidak ditemukan.')
      if (siswa.sekolah_id !== targetSekolahId) {
        throw new HttpError(400, 'Siswa tersebut bukan bagian dari sekolah yang dipilih.')
      }
    }

    // ---------- 1. Buat akun auth ----------
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // tidak bergantung setting "Confirm email"
    })
    if (createErr || !created.user) {
      const msg = createErr?.message ?? 'tidak diketahui'
      const sudahAda = /already|registered|exists/i.test(msg)
      throw new HttpError(sudahAda ? 409 : 400, sudahAda ? 'Email sudah terdaftar.' : 'Gagal membuat akun: ' + msg)
    }
    userId = created.user.id

    // ---------- 2. Organisasi baru (mode 'baru') ----------
    if (mode === 'baru') {
      const { data: baru, error } = await adminClient
        .from('sekolah')
        .insert({ nama_sekolah: namaSekolah, jenis_organisasi: jenisOrganisasi })
        .select('id')
        .single()
      if (error) throw new HttpError(500, 'Gagal membuat organisasi: ' + error.message)
      sekolahBaruId = baru.id
      targetSekolahId = baru.id
    }

    // ---------- 3. Role & status: ditentukan SERVER ----------
    // mode 'baru' → admin_utama. mode 'gabung' → role biasa; jabatan hanya label,
    // admin yang menaikkan role saat persetujuan.
    const role =
      mode === 'baru'
        ? 'admin_utama'
        : isOrangTua
          ? 'orang_tua'
          : jenisOrganisasi === 'kantor'
            ? 'pegawai'
            : 'guru'

    // PERBAIKAN: semua pendaftaran (baru maupun gabung) menunggu persetujuan
    // superadmin. Sebelumnya mode 'baru' langsung 'aktif', sehingga pendaftar
    // organisasi baru (mis. kantor palsu) tidak pernah muncul di halaman
    // Persetujuan Akun dan langsung bisa login tanpa disaring.
    const statusAkun = 'menunggu'

    // ---------- 4. pegawai_kantor (khusus kantor) ----------
    if (jenisOrganisasi === 'kantor') {
      const { data: pegawai, error } = await adminClient
        .from('pegawai_kantor')
        .insert({
          sekolah_id: targetSekolahId,
          nama_lengkap: namaLengkap,
          jabatan,
          nip,
          email,
          status: statusAkun,
        })
        .select('id')
        .single()
      if (error) throw new HttpError(500, 'Gagal menyimpan data pegawai: ' + error.message)
      pegawaiId = pegawai.id
    }

    // ---------- 5. Profil ----------
    const { error: profilErr } = await adminClient.from('profil').insert({
      id: userId,
      role,
      jabatan,
      sekolah_id: targetSekolahId,
      status_akun: statusAkun,
      nama_lengkap_pendaftar: namaLengkap,
      email_pendaftar: email,
      pegawai_id: pegawaiId,
    })
    if (profilErr) throw new HttpError(500, 'Gagal menyimpan profil: ' + profilErr.message)
    profilDibuat = true

    // ---------- 6. Relasi orang tua - siswa ----------
    if (isOrangTua) {
      const { error } = await adminClient.from('orang_tua_siswa').insert({
        orang_tua_id: userId,
        siswa_id: siswaId,
        hubungan,
        status: 'menunggu',
      })
      if (error) throw new HttpError(500, 'Gagal menyimpan relasi siswa: ' + error.message)
    }

    // Nama organisasi yang ditampilkan di email notifikasi: untuk mode 'baru'
    // pakai nama yang baru didaftarkan, untuk mode 'gabung' ambil nama
    // organisasi tujuan dari tabel sekolah (bukan nama pendaftar).
    let namaOrganisasiTampil = namaSekolah
    if (mode === 'gabung' && targetSekolahId) {
      const { data: org } = await adminClient
        .from('sekolah')
        .select('nama_sekolah')
        .eq('id', targetSekolahId)
        .maybeSingle()
      namaOrganisasiTampil = org?.nama_sekolah || '(tidak diketahui)'
    }

    // ---------- 7. Notifikasi email ke superadmin (best-effort) ----------
    await kirimNotifikasiSuperadmin(adminClient, {
      namaLengkap,
      email,
      jenisOrganisasi,
      namaOrganisasi: namaOrganisasiTampil,
      mode,
    })

    return json({ success: true }, 200)
  } catch (e) {
    // Rollback urutan terbalik, supaya tidak ada data yatim.
    // Setiap langkah dibungkus try agar satu kegagalan tidak menghentikan yang lain.
    const coba = async (fn: () => PromiseLike<unknown>) => { try { await fn() } catch (_) { /* abaikan */ } }
    if (userId) {
      await coba(() => adminClient.from('orang_tua_siswa').delete().eq('orang_tua_id', userId))
      if (profilDibuat) await coba(() => adminClient.from('profil').delete().eq('id', userId))
      if (pegawaiId) await coba(() => adminClient.from('pegawai_kantor').delete().eq('id', pegawaiId))
      if (sekolahBaruId) await coba(() => adminClient.from('sekolah').delete().eq('id', sekolahBaruId))
      await coba(() => adminClient.auth.admin.deleteUser(userId))
    }

    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    return json({ error: e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga.' }, 500)
  }
})
