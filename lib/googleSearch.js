const axios = require("axios");

async function searchGoogle(query) {
  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: "AIzaSyDGy2oX1D4VcTE30YhEkauzdo-tRo209FY", // langsung taro sini aja kalo mau simple
        cx: "744367e07f14649ba",
        q: query,
      },
    });

    const items = response.data.items;
    if (!items || items.length === 0) return "❌ Ga nemu hasilnya di Google.";

    const result = items
      .slice(0, 3)
      .map((item, i) => `${i + 1}. ${item.title}\n${item.link}`)
      .join("\n\n");

    return `🔍 Hasil pencarian Google:\n\n${result}`;
  } catch (err) {
    console.error("Error searchGoogle:", err.response?.data || err.message);
    return "⚠️ Gagal cari di Google. Coba lagi nanti ya.";
  }
}

module.exports = searchGoogle;
