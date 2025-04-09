const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.resolve(__dirname, '..', 'data', 'chat.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error("❌ Gagal buka DB:", err.message);
  console.log("📦 DB siap di", dbPath);
});

db.run(`CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT,
  message TEXT,
  reply TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

function logChat(sender, message, reply) {
  db.run(
    "INSERT INTO chats (sender, message, reply) VALUES (?, ?, ?)",
    [sender, message, reply],
    (err) => {
      if (err) console.error("❌ Gagal nyimpen chat:", err.message);
      else console.log("✅ Chat masuk DB");
    }
  );
}

function hapusChat(sender) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM chats WHERE sender = ?", [sender], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getLastMessages(sender, limit = 5) {
  return new Promise((resolve) => {
    db.all(
      "SELECT message, reply FROM chats WHERE sender = ? ORDER BY timestamp DESC LIMIT ?",
      [sender, limit],
      (err, rows) => {
        if (err) return resolve([]);
        resolve(rows.reverse());
      }
    );
  });
}

module.exports = { logChat, hapusChat, getLastMessages };
