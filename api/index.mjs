/**
 * Vercel serverless entry — all routes rewrite here (see vercel.json).
 * Reuses the same handler as local `web/server.mjs`.
 */
import { handler } from "../web/server.mjs";

export default handler;
