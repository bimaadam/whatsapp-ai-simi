require("dotenv").config();

async function main() {
  const startBot = require("./lib/waBot");
  await startBot(); // kalau dia async
}

main();
