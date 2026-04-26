import "dotenv/config";
import { createApp, ensureDbConnected } from "./app.js";

const app = createApp();
const port = Number(process.env.PORT || 4000);

export default app;

async function startServer() {
  await ensureDbConnected();
  app.listen(port, () => console.log(`Rivo API running on :${port}`));
}

if (process.env.VERCEL !== "1") {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
