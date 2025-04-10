const fs = require("fs");
const { transcribeVoice, tanyaGemini } = require("./gemini");

async function handleVoiceNote(msg, sock) {
  const sender = msg.key.remoteJid;
  const audio = msg.message.audioMessage;

  if (!audio || !audio.ptt) {
    console.log("❌ Bukan voice note (ptt false atau undefined)");
    return;
  }

  try {
    console.log("📥 Mulai download VN dari:", sender);
    console.log("📦 Info AudioMessage:", {
      mimetype: audio.mimetype,
      seconds: audio.seconds,
      ptt: audio.ptt,
    });

    // 1. Download VN
    const stream = await sock.downloadMediaMessage(msg);
if (!stream) throw new Error("❌ Gagal download VN: stream kosong");
    const tmpPath = `/tmp/vn_${Date.now()}.ogg`;
    fs.writeFileSync(tmpPath, Buffer.from(stream));
    console.log("✅ VN berhasil disimpan di:", tmpPath);

    // 2. Transkrip VN jadi teks
    const text = await transcribeVoice(tmpPath);
    console.log("📝 Hasil transkripsi:", text);

    // 3. Kirim teks ke Gemini
    const balasan = await tanyaGemini(text, sender);
    console.log("🤖 Jawaban Gemini:", balasan);

    // 4. Kirim balasan ke user
    await sock.sendMessage(sender, { text: balasan }, { quoted: msg });

    // 5. Cleanup file
    fs.unlinkSync(tmpPath);
    console.log("🧹 File VN udah dibuang dari tmp");
  } catch (err) {
    console.error("❌ Error handle VN:", err.message);
    await sock.sendMessage(sender, { text: "Gagal bacain VN lo 😢" }, { quoted: msg });
  }
}

module.exports = { handleVoiceNote };
