const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.resolve(__dirname, '..', 'data', 'chat.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error("❌ Gagal buka DB:", err.message);
  console.log("📦 DB siap di", dbPath);
});

// Buat tabel dengan sintaks yang benar
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    sender_grup TEXT,
    message TEXT,
    reply TEXT,
    is_group BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

function normalizeJid(jid) {
  if (!jid) return jid;
  return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
}

// Fungsi logChat yang sudah diperbaiki
function logChat(sender, message, reply, isGroup = false, groupId = null) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "INSERT INTO chats (sender, sender_grup, message, reply, is_group) VALUES (?, ?, ?, ?, ?)"
    );
    
    stmt.run(
      [normalizeJid(sender), groupId ? normalizeJid(groupId) : null, message, reply, isGroup ? 1 : 0],
      function(err) {
        if (err) {
          console.error("❌ Gagal simpan chat:", err.message);
          return reject(err);
        }
        console.log("✅ Chat tersimpan");
        resolve();
      }
    );
    
    stmt.finalize();
  });
}

// Fungsi hapusChat yang aman
async function hapusChat(sender) {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM chats WHERE sender = ?",
      [normalizeJid(sender)],
      function(err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

// Fungsi getLastMessages yang diperbaiki
function getLastMessages(sender, limit = 5) {
  return new Promise((resolve) => {
    db.all(
      "SELECT message, reply FROM chats WHERE sender = ? ORDER BY timestamp DESC LIMIT ?",
      [normalizeJid(sender), limit],
      (err, rows) => {
        if (err) {
          console.error("❌ Gagal ambil pesan:", err);
          return resolve([]);
        }
        resolve(rows.reverse());
      }
    );
  });
}

module.exports = { logChat, hapusChat, getLastMessages };