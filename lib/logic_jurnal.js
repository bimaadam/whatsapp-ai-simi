
import { modelNgobrol } from "./model_gemini";


async function generateJurnalIlmiah(judul) {
  try {
    const intent = detectIntent(judul);
    const outline = [
      "Abstrak",
      "Kata Kunci",
      "Pendahuluan",
      "Tinjauan Pustaka",
      "Metode",
      "Hasil",
      "Pembahasan",
      "Kesimpulan",
      "Daftar Pustaka"
    ];

    const parts = [];

    for (const section of outline) {
      const prompt = `Tulis bagian "${section}" jurnal ilmiah dengan gaya formal dan topik "${intent.topik}". Gunakan kutipan akademik tiruan (contoh: [Nama, Tahun]) untuk memperkuat argumen.`;


      // Buat bagian referensi lebih eksplisit
      if (section === "Daftar Pustaka") {
  prompt += ` Sertakan 3-5 referensi bergaya APA atau IEEE, lengkap dengan nama penulis, tahun, judul, dan sumber. Jika memungkinkan, tambahkan DOI atau tautan online.`;
      } else {
        prompt += ` Sertakan kutipan atau referensi jika perlu.`;
      }

      const result = await modelNgobrol.generateContent(prompt);
      const text = await result.response.text();
      parts.push(`## ${section}\n\n${text}`);
    }

    return parts.join("\n\n");
  } catch (err) {
    console.error("Gagal generate jurnal:", err.message);
    return "Gagal bikin jurnal, coba lagi nanti.";
  }
}

module.exports = {
generateJurnalIlmiah
}