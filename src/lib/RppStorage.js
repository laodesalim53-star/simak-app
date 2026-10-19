import { supabase } from '../../lib/supabaseClient'

export function isDocFile(nameOrType = '') {
  return /\.(docx?|DOCX?)$/.test(nameOrType) || nameOrType.includes('word')
}

export async function getSignedUrl(path, ttl = 300) {
  const { data, error } = await supabase.storage.from('rpp-files').createSignedUrl(path, ttl)
  if (error) throw error
  return data.signedUrl
}

export async function downloadRppFile(path, fileName) {
  try {
    const url = await getSignedUrl(path)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  } catch (err) {
    alert('Gagal buka file: ' + err.message)
  }
}
