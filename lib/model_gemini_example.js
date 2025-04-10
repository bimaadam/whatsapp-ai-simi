const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");
const persona = require("../botPersona");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// 🔊 Model voice note
const modelAudio = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
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

// 🧠 Model ngobrol
const modelNgobrol = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  persona,
  harmBlockThreshold: HarmBlockThreshold.HIGH,
  harmCategories: [HarmCategory.HATE_SPEECH],
});

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
              text: "Ini voice note dari user di WhatsApp, tolong analisa isi pesannya.",
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
  analyzeVoiceNote,
};
