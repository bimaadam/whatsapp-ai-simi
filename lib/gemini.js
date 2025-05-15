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
const {
  modelGambar, // gemini-1.5-flash
  modelNgobrol, // gemini-2.0-pro
  fileManager,
  generateArtikelIlmiah,
  generateJurnalIlmiah,
  generationConfig,
} = require("./model_gemini");
const { searchGoogle } = require("./googleSearch");

const speech = require("@google-cloud/speech").v1p1beta1;
const client = new speech.SpeechClient();

const chatSessions = new Map();

async function tanyaGeminiJurnal(judul, sender) {
  try {
    const jurnal = await generateJurnalIlmiah(judul);
    return jurnal;
  } catch (err) {
    console.error("❌ Generate Artikel Error:", err.message);
    return "Gagal bikin artikel, coba lagi ya";
  }
}

async function tanyaGeminiArtikel(judul, sender) {
  try {
    const artikel = await generateArtikelIlmiah(judul);
    return artikel;
  } catch (err) {
    console.error("❌ Generate Artikel Error:", err.message);
    return "Gagal bikin artikel, coba lagi ya";
  }
}

function getChatModel(sender, useImage = false) {
  const model = useImage ? modelGambar : modelNgobrol;

  if (!chatSessions.has(sender)) {
    const chat = model.startChat({ generationConfig });
    chatSessions.set(sender, chat);
  }

  return chatSessions.get(sender);
}

async function tanyaGeminiPakeGoogle(text, sender) {
  try {
    const chat = getChatModel(sender, false);
    const history = await getLastMessages(sender);

    // 🔍 Search dari Google dulu
    const searchResult = await searchGoogle(text);

    const historyPrompt = history
      .map((row) => `User: ${row.message}\nAI: ${row.reply}`)
      .join("\n");

    // 🧠 Combine semua info buat prompt
    const fullPrompt = `${historyPrompt}\nUser: ${text}\nHasil Google:\n${searchResult}\n\nAI:`;

    const result = await chat.sendMessage(fullPrompt);
    return result.response.text() || "Maaf ya, gue gak ngerti maksud lo 😅";
  } catch (err) {
    console.error("❌ Gemini (Search) Error:", err.message);
    return "Ada masalah waktu manggil pake Google, cok!";
  }
}

async function tanyaGemini(text, sender) {
  try {
    const chat = getChatModel(sender, false); // default ngobrol (2.0)
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

async function analyzeImage(filePath, sender, promptText = "") {
  try {
    const file = await uploadToGemini(filePath, mime.lookup(filePath));
    const chat = getChatModel(sender, true); // pakai 1.5 buat analisis gambar

    const result = await chat.sendMessage([
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
    return "Ada error pas bacain gambar!";
  }

}

function clearSession(sender) {
  chatSessions.delete(sender);
}

async function transcribeVoice(filePath) {
  const file = fs.readFileSync(filePath);
  const audioBytes = file.toString("base64");

  const audio = {
    content: audioBytes,
  };

  const config = {
    encoding: "OGG_OPUS",
    sampleRateHertz: 48000,
    languageCode: "id-ID",
  };

  const request = {
    audio: audio,
    config: config,
  };

  try {
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    return transcription || "Gak kedengeran suara lo, cok 😅";
  } catch (err) {
    console.error("❌ Transkripsi VN Error:", err.message);
    return "Gagal dengerin VN lo, bro.";
  }
}

module.exports = { tanyaGemini, clearSession, analyzeImage, transcribeVoice, tanyaGeminiPakeGoogle, tanyaGeminiArtikel, tanyaGeminiJurnal };
