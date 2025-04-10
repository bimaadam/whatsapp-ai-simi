const express = require("express");
const fs = require("fs");
const app = express();
const port = 3000;

app.use(express.json());

// Buat endpoint GET buat nampilin list donatur
app.get("/donations", (req, res) => {
  try {
    const raw = fs.readFileSync("donatur.json", "utf-8").trim();

    if (!raw) return res.json([]); // kalau kosong

    const json = "[" + raw.replace(/,\s*$/, "") + "]";
    const entries = JSON.parse(json);

    // urutin dari terbaru ke lama (asumsi ada timestamp, kalau nggak bisa dibalik manual)
    const sorted = entries.reverse(); // klo lo masukin data terakhir terus

    res.json(sorted);
  } catch (err) {
    console.error("Gagal baca donatur.json:", err.message);
    res.status(500).json({ error: "Gagal ambil data donatur" });
  }
});

// Webhook dari Saweria
app.post("/webhook", (req, res) => {
  const { name, message, amount } = req.body;

  if (!name || !amount) {
    res.status(400).send("Bad request");
    return;
  }

  const donasiBaru = {
    name,
    message: message || "-",
    amount,
    time: new Date().toISOString(),
  };

  // Tambahkan ke file donatur.json
  fs.appendFile("donatur.json", JSON.stringify(donasiBaru) + ",\n", (err) => {
    if (err) {
      console.error("Gagal simpan donasi:", err.message);
      res.status(500).send("Gagal simpan");
    } else {
      console.log(`[DONATE] ${name} nyumbang Rp${amount} bilang: ${message}`);
      res.status(200).send("OK");
    }
  });
});

app.listen(port, () => {
  console.log(`Webhook listening on http://localhost:${port}`);
});
