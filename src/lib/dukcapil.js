// src/lib/dukcapil.js
//
// Lapisan pemanggil verifikasi NIK dari frontend. Tidak pernah
// menyimpan/menyentuh kredensial Dukcapil — semua itu ada di Edge
// Function (supabase/functions/verifikasi-nik), file ini cuma
// memanggilnya lewat supabase.functions.invoke() yang otomatis
// menyertakan token sesi admin yang sedang login.

import { supabase } from './supabaseClient'

// Mengembalikan objek dengan bentuk:
// { status: 'ok'|'tidak_valid'|'belum_dikonfigurasi'|'format_salah'|'error',
//   pesan, nama_dukcapil, cocok_nama }
//
// Fungsi ini sengaja tidak melempar error untuk kasus bisnis biasa
// (NIK tidak ditemukan, integrasi belum aktif, dll) — itu semua
// datang sebagai `status` supaya gampang ditangani di UI. Ia hanya
// melempar error kalau pemanggilan Edge Function-nya sendiri gagal
// total (mis. tidak ada koneksi internet).
export async function verifikasiNik(nik, namaLengkap) {
  const { data, error } = await supabase.functions.invoke('verifikasi-nik', {
    body: { nik, nama_lengkap: namaLengkap || null },
  })

  if (error) {
    // supabase-js melempar error untuk status HTTP non-2xx. Edge
    // Function kita didesain untuk selalu membalas 200, jadi kalau
    // sampai ke sini biasanya berarti fungsinya belum ter-deploy,
    // atau ada masalah jaringan/auth.
    throw new Error(error.message || 'Gagal menghubungi layanan verifikasi NIK.')
  }

  return data
}
