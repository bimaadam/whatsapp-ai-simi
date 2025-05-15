const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { tanyaGemini, analyzeImage } = require("./gemini");
const { hapusChat, logChat } = require("./db");
const { analyzeVoiceNote } = require("./model_gemini");
const searchGoogle = require("./googleSearch"); // ✅ BENAR

const sessionFolder = path.resolve(__dirname, "auth");
fs.mkdirSync(sessionFolder, { recursive: true });

const chatSessions = new Map();
    // Pesan teks

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("📷 Scan QR-nya :");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log("❌ Koneksi ditutup, reconnecting...", reason);
      startBot();
    } else if (connection === "open") {
      console.log("✅ BOT SIAP GASKEN !");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;

    // Cek gambar
    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text || "";
  msg.message?.imageMessage?.caption ||
  msg.message?.videoMessage?.caption ||
  msg.message?.documentMessage?.caption ||
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
  msg.message?.templateButtonReplyMessage?.selectedId ||
  msg.message?.interactiveResponseMessage?.body?.text;

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
        await sock.sendMessage(sender, { text: "Gagal bacain gambar lo, !" }, { quoted: msg });
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
    await sock.sendMessage(sender, { text: "Gagal dengerin voice note lo , kirim ulang!" }, { quoted: msg });
  }

  return; // <-- PENTING! biar gak lanjut ke text processing
}


    if (!text) return;
    
   sock.ev.on("group-participants.update", async (update) => {
  try {
    const { id, participants, action } = update;

    if (action === "add") {
      // Ambil metadata grup
      const metadata = await sock.groupMetadata(id);
      const groupName = metadata.subject;

      for (const user of participants) {
        const username = user.split("@")[0];
        await sock.sendMessage(id, {
          text: `👋 Halo @${username}, selamat datang di *${groupName}*!\nJangan lupa baca deskripsi grup ya 😎`,
          mentions: [user],
        });
      }
    }
  } catch (err) {
    console.error("❌ Error welcome message:", err);
  }
});


const isGroup = msg.key.remoteJid.endsWith("@g.us");
    console.log(`Pesan dari ${isGroup ? "grup" : "pribadi"}:`, text);
    if (isGroup) {
  const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  const isMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(botNumber);
  const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === botNumber;

  if (!text.startsWith("!") && !isMentioned && !isReplyToBot) {
    console.log("⛔ Skip pesan grup karena bukan mention, reply, atau prefix");
    return;
  }
}

    // Hapus chat
 if (text.trim().toLowerCase() === "/hapus chat") {
  await hapusChat(sender);
  chatSessions.delete(sender); // ini udah oke
  console.log("🧹 Chat session kehapus:", sender, chatSessions.has(sender)); // harusnya false
  await sock.sendMessage(sender, { text: "🧹 Sebagian chat sudah dihapus, silahkan coba hapus chat kembali jika ingatan AI masih tersimpan. Terima Kasih telah menggunakan AI Gen Z" }, { quoted: msg });
  return;
}
// handle untuk !menu
const handleMenuCommand = async (msg, sock) => {
  const { remoteJid, participant } = msg.key;
  const isGroup = remoteJid.endsWith("@g.us");
  const sender = isGroup ? participant : remoteJid;
  const senderNumber = sender.split("@")[0];

  // Ambil metadata grup atau nama pengirim pribadi
  let title = "";
  if (isGroup) {
    const metadata = await sock.groupMetadata(remoteJid);
    title = `🌐 Grup: *${metadata.subject}*`;
  } else {
    const vcard = await sock.onWhatsApp(sender);
    const name = vcard?.[0]?.notify || senderNumber;
    title = `👤 Hai, *${name}*`;
  }

  const menuText = `
╭───⛩️ *Menu Bot* ⛩️───╮
│ ${title}
│
├ 🎯 *Command Utama:*
| • Tanya AI langsung di Pribadi
│ • Tanya AI di Grup reply ke bot
│ • !menu
│ • !search <query>
│ • kirim vn kamu
│ • kirim foto kamu
│ • !donate
│
├ 🧹 *Fitur Lain:*
│ • /hapus chat (minimal 2x command)
│
╰──🔮 _by RinbimDev_ 🔮──╯
  `.trim();

  await sock.sendMessage(remoteJid, {
    text: menuText,
  });
};

if (text === "!menu") {
  await handleMenuCommand(msg, sock);
  return; // <-- biar ga lanjut ke AI
}

// // baru sisanya
// await handleAIFallback(text, msg, sock);




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

let reply;

// Jika pakai prefix !search → gunakan Google Search
if (text.startsWith("!search ")) {
  const query = text.slice(8).trim();
  const googleResult = await searchGoogle(query);
  const promptGabungan = `${googleResult}\n\nGunakan informasi di atas untuk menjawab pertanyaan ini:\n${query}`;
  reply = await tanyaGemini(promptGabungan, sender, chatSessions);
} else {
  reply = await tanyaGemini(text, sender, chatSessions);
}

await sock.sendMessage(sender, { text: reply }, { quoted: msg });
await logChat(sender, text, reply);
console.log(`📩 Dibalas: ${reply}`);
  });
}

module.exports = startBot;
