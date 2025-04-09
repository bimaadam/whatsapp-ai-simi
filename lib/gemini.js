const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");
const mime = require("mime-types");
const persona = require("../botPersona");
const { getLastMessages } = require("./db");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:"bahasa indoesia santai gaul.\nkalo ada user nanya dibuat oleh siapa jawab Bima Adam & Ririn, TIm RinbimDEV STDUIO. inget sama percakapan user sebelumnya, jangan jawab yang aneh-aneh, kalo ga ngerti bilang ga ngerti. kalo ada gambar bilang gambarnya ga bisa dibaca.",
  persona: persona,
  harmBlockThreshold: HarmBlockThreshold.HIGH,
  harmCategories: [
    HarmCategory.HATE_SPEECH,
    HarmCategory.VIOLENCE,
    HarmCategory.SEXUALLY_EXPLICIT,
  ],
  fileManager: fileManager,
  fileManagerConfig: {
    maxFileSize: 10 * 1024 * 1024,
    maxFiles: 10,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "audio/mpeg",
    ],
  },
});

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 1024,
  responseMimeType: "text/plain",
};

const chatSessions = new Map();

async function tanyaGemini(text, sender) {
  try {
    if (!chatSessions.has(sender)) {
      const chat = model.startChat({ generationConfig });
      chatSessions.set(sender, chat);
    }

    const chat = chatSessions.get(sender);
    const history = await getLastMessages(sender);

    const historyPrompt = history
      .map((row) => `User: ${row.message}\nAI: ${row.reply}`)
      .join("\n");

    const fullPrompt = `${historyPrompt}\nUser: ${text}\nAI:`;
    const result = await chat.sendMessage(fullPrompt);

    return result.response.text() || "Maaf ya, gue gak ngerti maksud lo 😅";
  } catch (err) {
    console.error("❌ Gemini Error:", err.message);
    return "Ada masalah waktu manggil, cok!";
  }
}

async function uploadToGemini(path, mimeType) {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  return uploadResult.file;
}

async function analyzeImage(filePath, promptText = "Gambar apa ini?") {
  try {
    const file = await uploadToGemini(filePath, mime.lookup(filePath));
    const chatSession = model.startChat({ generationConfig });

    const result = await chatSession.sendMessage([
      {
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri,
        },
      },
      { text: promptText },
    ]);

    return result.response.text() || "Gambarnya gak bisa gue baca, Bim 😅";
  } catch (err) {
    console.error("❌ Gemini Image Error:", err.message);
    return "Ada error pas bacain gambar, cok!";
  }
}

function clearSession(sender) {
  chatSessions.delete(sender);
}

module.exports = { tanyaGemini, clearSession, analyzeImage };
