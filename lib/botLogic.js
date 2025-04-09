const persona = require("../botPersona");

function jawabPertanyaan(pertanyaan) {
  const jawabanKhusus = persona.answers[pertanyaan];
  if (jawabanKhusus) return jawabanKhusus;

  const lower = pertanyaan.toLowerCase();
  if (lower.includes('sedih')) return persona.rules.if_user_sad;
  if (lower.includes('bingung') || lower.includes('gak ngerti')) return persona.rules.if_user_confused;
  if (lower.includes('anjing') || lower.includes('bangsat')) return persona.rules.if_user_angry;

  if (persona.behavior.auto_balikin_pertanyaan) {
    return `Menurut lo sendiri gimana? Gue penasaran nih.`;
  }

  const fallbackResponses = [
    "Hmmm, maksud lo apaan ya? Coba jelasin dikit lagi dong.",
    "Wkwkw pertanyaan lo absurd banget, tapi gue dengerin kok 😁",
    "Belum nyambung nih, tapi gaskeun cerita, siapa tau gue bisa bantuin.",
    "Yah, pertanyaannya kurang greget. Tambahin dikit biar gue ngerti dong!"
  ];
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

module.exports = { jawabPertanyaan };
