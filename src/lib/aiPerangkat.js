import { supabase } from './supabaseClient'

// Satu-satunya tempat yang memanggil endpoint AI untuk ATP/Prota.
// Kalau endpoint AI kamu berbeda (mis. nama atau format respons), ubah di sini saja.
export async function panggilAiPerangkat(payload) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch('/api/generate-perangkat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Permintaan AI gagal (${res.status})`)
  return json // { cp?: string, rows: [...] }
}
