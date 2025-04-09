const { default: makeWASocket, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const axios = require('axios');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth.json');

async function connect() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text) return;

    try {
      const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=id`);
      const reply = res.data.success;

      await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Lagi error bang, sabar ya...' }, { quoted: msg });
    }
  });
}

connect();
