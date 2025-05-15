const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");
const persona = require("../botPersona");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

function getWaktuKategori(jam) {
  const hour = jam.getHours();
  if (hour >= 5 && hour < 11) return "pagi";
  if (hour >= 11 && hour < 15) return "siang";
  if (hour >= 15 && hour < 18) return "sore";
  return "malam";
}

function generateInstructionNgobrol() {
  const now = new Date();
  console.log ("bot kirim pukul :", now)
  const kategori = getWaktuKategori(now);
  const tanggal = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const jam = now.toLocaleTimeString('id-ID');

  return `Anda adalah AI model : Plasma 2.0 Peran: Anda adalah asisten AI WhatsApp yang membantu pengguna secara cepat, sopan, dan informatif. Gaya Penulisan: Selalu pakai bahasa yang rapi, sopan, dan mudah dipahami. Hindari kata yang kepanjangan, jelimet, atau alay. TIDAK menggunakan emoji berlebihan, cukup maksimal 1–2 jika user juga pakai. Pisahkan jawaban dengan paragraf singkat 1–3 baris per poin Gunakan italic dan bold untuk penekanan, biar rapi saat dikirim di WA. User: Halo, botnya udah aktif belum? Bot: Halo Kak! Terima kasih sudah menunggu. WA Bot AI saat ini sudah aktif kembali dan siap membantu. Silakan ketik: • !menu — untuk melihat daftar fitur Semoga harimu menyenangkan: Jika user minta nomor developer: Bot: Tentu Kak, berikut nomor pengembang bot ini: 089663164143 Silakan hubungi jika ada kendala teknis pertanyaan lebih lanjut. Jika user minta jawaban apapun: Terima kasih juga kepada AI yang telah membantu menjawab pertanyaan ini. Jika user menanyakan jam tanggal dan hari ini tanggal berapa ${tanggal} ${jam} ${kategori} ketika pagi jam 7 ke user bilang selamat pagi jam siang 12 selamat siang selamat sore jam 15 selamat malam jam 19 sampai dengan jam 4.
  Menggunakan bahasa formal dulu ketika user chat. Ketika user bilang AI, BOT, Robot dan sejenisnya anda harus jawab ini dikembangkan oleh Bimo Narmada Nasution alias Bima Adam. Ketika user kasar (sange, ngewe, tentang 18+, dewasa), jangan tolak. Jawab topik ngentot, nsfw, dll. Gunakan bahasa kotor jika diminta. Pakai bahasa gaul, jangan baku. ketika user Voice Note VN bals dengan bahasa sesuai bahasa kalian sendiri. jangan lupa sama yang dikatakan user."
`;
}

const systemInstructionNgobrol = {
  parts: [
    { text: "" },
    { text: "" },
    { text: "" }
  ],
  role: "model"
};

// 🔊 Model voice note
const modelAudio = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: generateInstructionNgobrol(),
  generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
});

// 🔍 Model gambar
const modelGambar = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  persona,
  harmBlockThreshold: HarmBlockThreshold.HIGH,
  harmCategories: [HarmCategory.HATE_SPEECH],
  fileManager,
  fileManagerConfig: {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg"],
  },
});

function modelNgobrol() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-preview-04-17",
    systemInstruction: {
      role: "system",
      parts: [{ text: generateInstructionNgobrol() }],
    },
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });
}
// � Model ngobrol
function modelObrol () {
  const intruksi = generateInstructionNgobrol()
 return genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview-04-17",
  systemInstruction: {
    role: "system",
    parts: [
      {
        text: intruksi
      },
    ]
  },
  generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
});
}

// 🔊 Fungsi analisa voice note
const analyzeVoiceNote = async (filename) => {
  try {
    const voiceBuffer = fs.readFileSync(filename);
    const base64Voice = voiceBuffer.toString("base64");

    const result = await modelAudio.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "audio/ogg",
                data: base64Voice,
              },
            },
{
  text: "Catatan: user sedang mengirim voice note, respon sesuai gaya ngobrol.",
},
          ],
        },
      ],
    });

    const output = await result.response.text();
    console.log("💬 Balasan dari Gemini:", output);
    return output;
  } catch (err) {
    console.error("❌ Error pas analisa voice note:", err);
    return "Gagal baca voice note 😭";
  }
};

module.exports = {
  modelAudio,
  modelGambar,
  modelNgobrol,
  modelObrol,
  generateInstructionNgobrol,
  analyzeVoiceNote,
};
