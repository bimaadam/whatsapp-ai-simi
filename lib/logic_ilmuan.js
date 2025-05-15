import { modelNgobrol } from "./model_gemini";

async function generateArtikelIlmiah(judul) {
  const intent = detectIntent(judul);
  const outline = generateOutline(intent.topik, intent.tujuan);

  const parts = [];

  for (const section of outline) {
    const prompt = `Tulis bagian "${section}" dengan gaya ${intent.gaya} dan topik "${intent.topik}". Gunakan bahasa formal dan sertakan referensi jika perlu.`;
    const result = await modelNgobrol.generateContent(prompt);
    const text = await result.response.text();
    parts.push(`## ${section}\n\n${text}`);
  }

  return parts.join("\n\n");
}

module.exports = {
  generateArtikelIlmiah,
};
