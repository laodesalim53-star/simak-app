import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Edge Function: ekstrak-sk
// Menerima file SK (base64) dari client, mengirimkannya ke Claude API
// untuk diekstrak field-field kepegawaiannya, lalu mengembalikan JSON.
// Function ini TIDAK menulis ke database apa pun — murni ekstraksi teks.
// Deploy: supabase functions deploy ekstrak-sk
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx

Deno.serve(async (req) => {
  try {
    const { file_base64, media_type } = await req.json()

    if (!file_base64 || !media_type) {
      return new Response(JSON.stringify({ error: "File atau tipe file tidak ditemukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const isPdf = media_type === "application/pdf"

    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type, data: file_base64 } }
      : { type: "image", source: { type: "base64", media_type, data: file_base64 } }

    const prompt = `Ini adalah dokumen SK (Surat Keputusan) kepegawaian pemerintah Indonesia.
Ekstrak informasi berikut dan kembalikan HANYA JSON valid, tanpa teks lain, tanpa markdown, tanpa penjelasan:
{
  "nama_lengkap": "",
  "nip": "",
  "jabatan_definitif": "",
  "jabatan_tambahan": "",
  "unit_kerja_tambahan": "",
  "pangkat_golongan": "",
  "status_kepegawaian": "",
  "no_sk": "",
  "tmt": "YYYY-MM-DD atau string kosong jika tidak ditemukan",
  "masa_tugas_tambahan": ""
}

Panduan pengisian:
- "jabatan_definitif": jabatan fungsional/struktural pokok pegawai (misalnya "Penghulu Ahli Pertama", "Guru Ahli Muda"). Ini adalah jabatan resmi orang tersebut sehari-hari, BUKAN tugas tambahan/plt/pelaksana tugas.
- "jabatan_tambahan": isi HANYA jika SK ini secara spesifik mengangkat/menugaskan orang tersebut ke sebuah tugas tambahan, jabatan sementara, Plt., Plh., atau jabatan kepala unit di luar jabatan definitifnya (misalnya "Kepala Kantor Urusan Agama Aru Selatan"). Jika SK ini adalah SK pengangkatan/kenaikan pangkat biasa tanpa tugas tambahan, biarkan string kosong "".
- "unit_kerja_tambahan": nama unit/kantor tempat tugas tambahan tersebut dijalankan, jika ada (kosongkan jika tidak relevan).
- "masa_tugas_tambahan": durasi masa tugas tambahan jika disebutkan secara eksplisit di SK (misalnya "4 tahun"). Kosongkan jika tidak ada atau jika ini bukan SK tugas tambahan.
- "tmt": tanggal SK "berlaku terhitung mulai tanggal" jika berupa tanggal pasti. Jika SK hanya menyebut "sejak tanggal pelantikan" tanpa tanggal pasti, isi dengan string kosong "" (jangan menebak menggunakan tanggal penetapan SK).
- Jika sebuah field tidak ditemukan atau tidak relevan, isi dengan string kosong "".`

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY belum diset di secrets" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: prompt }],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Gagal memanggil AI: ${errText}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }

    const result = await res.json()
    const text = result?.content?.find((c: any) => c.type === "text")?.text ?? "{}"
    const clean = text.replace(/```json|```/g, "").trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return new Response(JSON.stringify({ error: "Gagal mem-parsing hasil ekstraksi AI" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
