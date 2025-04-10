const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require("@whiskeysockets/baileys");

const { tanyaGemini, analyzeImage } = require("./gemini");
const { hapusChat, logChat } = require("./db");
const { analyzeVoiceNote } = require("./model_gemini");

const sessionFolder = path.resolve(__dirname, "auth");
fs.mkdirSync(sessionFolder, { recursive: true });

const chatSessions = new Map();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("📷 Scan QR-nya cok:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("❌ Koneksi ditutup, reconnecting...", reason);
      startBot();
    } else if (connection === "open") {
      console.log("✅ BOT SIAP GASKEN COK!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;

    // Cek gambar
    if (msg.message?.imageMessage) {
      try {
        const tmpDir = path.resolve(__dirname, "tmp");
        fs.mkdirSync(tmpDir, { recursive: true });

        const buffer = await downloadMediaMessage(msg, "buffer");
        const filename = `${tmpDir}/${Date.now()}.jpg`;
        fs.writeFileSync(filename, buffer);

        const responseText = await analyzeImage(filename, "");
        await sock.sendMessage(sender, { text: responseText }, { quoted: msg });

        await logChat(sender, "[gambar dikirim]", responseText);
        console.log("🖼️ Gambar dianalisis & dibalas");
      } catch (err) {
        console.error("❌ Error analisis gambar:", err.message);
        await sock.sendMessage(sender, { text: "Gagal bacain gambar lo, cok!" }, { quoted: msg });
      }
      return;
    }

 // Cek voice note
if (msg.message?.audioMessage) {
  try {
    const tmpDir = path.resolve(__dirname, "tmp");
    fs.mkdirSync(tmpDir, { recursive: true });

    const buffer = await downloadMediaMessage(msg, "buffer");
    const filename = `${tmpDir}/${Date.now()}.ogg`;
    fs.writeFileSync(filename, buffer);

    console.log("🎤 Voice note berhasil di-save:", filename);

    // ➕ Proses voice note ke Gemini
    const balasan = await analyzeVoiceNote(filename);
    await sock.sendMessage(sender, { text: balasan }, { quoted: msg });

    await logChat(sender, "[voice note dikirim]", balasan);
  } catch (err) {
    console.error("❌ Gagal proses voice note:", err.message);
    await sock.sendMessage(sender, { text: "Gagal dengerin voice note lo cok, kirim ulang!" }, { quoted: msg });
  }

  return; // <-- PENTING! biar gak lanjut ke text processing
}



    // Pesan teks
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    // Hapus chat
    if (text.trim().toLowerCase() === "/hapus chat") {
      await hapusChat(sender);
      chatSessions.delete(sender);
      await sock.sendMessage(sender, { text: "🧹 Semua chat lo udah gue hapus, lega kan cok?" }, { quoted: msg });
      return;
    }

    // Command donate
if (text.trim().toLowerCase() === "!donate") {
  const donateMessage = `
╭───────────────╮
│ 💖  DUKUNG PENGEMBANGAN BOT INI
╰───────────────╯

Jika kamu merasa bot ini bermanfaat,  
kamu bisa memberikan donasi melalui:

🌐 *Saweria*  
🔗 https://saweria.co/bimrin

Dukungan sekecil apapun sangat berarti  
untuk terus mengembangkan fitur-fitur keren ke depannya.

Terima kasih banyak atas kebaikanmu 🙏✨

📋 *Donatur Terbaru:*
`;

  try {
    const axios = require("axios");
    const res = await axios.get("https://donasi.bimaadamrin.my.id/donations"); // ganti IP-VPS-LO pake IP lo
    const list = res.data;

    if (list.length === 0) {
      await sock.sendMessage(sender, { text: donateMessage + "\n(❌ Belum ada donasi)" }, { quoted: msg });
      return;
    }

    let listText = list
      .slice(-5) // ambil 5 terakhir
      .reverse()
      .map((d, i) => `*${i + 1}. ${d.name}* - Rp${d.amount}\n_${d.message}_`)
      .join("\n\n");

    await sock.sendMessage(sender, { text: donateMessage + "\n" + listText }, { quoted: msg });
  } catch (err) {
    console.error("Gagal ambil list donatur:", err.message);
    await sock.sendMessage(sender, { text: donateMessage + "\n(Gagal ambil donatur 😢)" }, { quoted: msg });
  }

  return;
}

    // Tanya Gemini
    console.log(`📨 Dari ${sender}: ${text}`);
    const reply = await tanyaGemini(text, sender, chatSessions);
    await sock.sendMessage(sender, { text: reply }, { quoted: msg });
    await logChat(sender, text, reply);
    console.log(`📩 Dibalas: ${reply}`);
  });
}

module.exports = startBot;
