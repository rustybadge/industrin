// Requires: npm install @netlify/functions
// Pings the Render backend every 14 minutes to prevent the free-tier cold-start
// (Render spins down services after 15 minutes of inactivity).

import type { Config } from "@netlify/functions";

const RENDER_BASE_URL =
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  "https://industrin-api.onrender.com";

export default async function handler(): Promise<void> {
  const url = `${RENDER_BASE_URL}/api/ping`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`[keep-alive] ping ok — ${url} responded ${res.status}`);
    } else {
      console.warn(`[keep-alive] ping returned non-ok status ${res.status} from ${url}`);
    }
  } catch (err) {
    console.warn(`[keep-alive] ping failed for ${url}:`, err);
  }
}

export const config: Config = {
  schedule: "*/14 * * * *",
};
