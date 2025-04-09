const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require("@whiskeysockets/baileys");

const { tanyaGemini, analyzeImage } = require("./gemini");
const { hapusChat, logChat } = require("./db");

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

    // Cek kalo pesan itu gambar
    if (msg.message?.imageMessage) {
      try {
        const tmpDir = path.resolve(__dirname, "tmp");
        fs.mkdirSync(tmpDir, { recursive: true });

        const buffer = await downloadMediaMessage(msg, "buffer");
        const filename = `${tmpDir}/${Date.now()}.jpg`;
        fs.writeFileSync(filename, buffer);

        const responseText = await analyzeImage(filename, "Tolong jelasin isi gambar ini!");
        await sock.sendMessage(sender, { text: responseText }, { quoted: msg });

        // Simpen ke DB juga cok
        await logChat(sender, "[gambar dikirim]", responseText);

        console.log("🖼️ Gambar dianalisis & dibalas");
      } catch (err) {
        console.error("❌ Error analisis gambar:", err.message);
        await sock.sendMessage(sender, { text: "Gagal bacain gambar lo, cok!" }, { quoted: msg });
      }
      return;
    }

    // Kalo bukan gambar → teks biasa
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    if (text.toLowerCase().startsWith("/hapus chat")) {
      await hapusChat(sender);
      chatSessions.delete(sender);
      await sock.sendMessage(sender, { text: "🧹 Semua chat lo udah gue hapus, lega kan cok?" }, { quoted: msg });
      return;
    }

    console.log(`📨 Dari ${sender}: ${text}`);
    const reply = await tanyaGemini(text, sender, chatSessions);
    await sock.sendMessage(sender, { text: reply }, { quoted: msg });
    await logChat(sender, text, reply);
    console.log(`📩 Dibalas: ${reply}`);
  });
}

module.exports = startBot;
