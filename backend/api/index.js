import "dotenv/config";
import { createApp, ensureDbConnected } from "../src/app.js";

const app = createApp();

export default async function handler(req, res) {
  await ensureDbConnected();
  return app(req, res);
}
