const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// ======================
// CONFIG
// ======================
const PORT = process.env.PORT || 4000;
const APIFY_TOKEN = process.env.APIFY_TOKEN;

if (!APIFY_TOKEN) {
  console.log("⚠️ WARNING: APIFY_TOKEN is missing in environment variables");
}

// ======================
// SIMPLE CACHE (FILE BASED)
// ======================
const CACHE_FILE = "cache.json";
let cache = {};

if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    console.log("✅ Cache loaded");
  } catch (err) {
    cache = {};
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ======================
// HELPERS
// ======================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// extract username from @handle or URL
function extractUsername(input = "") {
  try {
    input = decodeURIComponent(input).trim();

    if (input.startsWith("@")) return input.slice(1);

    const match = input.match(/instagram\.com\/([^\/\?\#]+)/i);
    if (match && match[1]) return match[1];

    return input;
  } catch {
    return input;
  }
}

// cache lookup
function getCached(username) {
  for (const id in cache) {
    if (cache[id].username === username) {
      console.log("⚡ Cache hit:", username);
      return cache[id].data;
    }
  }
  return null;
}

// ======================
// APIFY SCRAPER
// ======================
async function runActor(username) {
  const cached = getCached(username);
  if (cached) return cached;

  try {
    console.log("🔥 Fetching from Apify:", username);

    const run = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`,
      {
        usernames: [username],
      }
    );

    const runId = run.data.data.id;
    const datasetId = run.data.data.defaultDatasetId;

    let status = "RUNNING";
    let attempts = 0;

    // wait for actor completion
    while (status === "RUNNING" && attempts < 20) {
      await delay(3000);

      const check = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );

      status = check.data.data.status;
      attempts++;
    }

    if (status !== "SUCCEEDED") {
      console.log("❌ Apify run failed:", status);
      return [];
    }

    const result = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    const data = result.data || [];
    const userId = data?.[0]?.id;

    if (userId) {
      cache[userId] = {
        username,
        data,
      };
      saveCache();
    }

    return data;
  } catch (err) {
    console.log("❌ Apify error:", err.message);
    return [];
  }
}

// ======================
// ROUTE: HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.send("🚀 Instagram Scraper Backend Running");
});

// ======================
// MAIN API ROUTE (IMPORTANT)
// ======================
// FINAL ENDPOINT:
// 👉 /api/suggest?input=username
app.get("/api/suggest", async (req, res) => {
  try {
    const input = req.query.input;

    if (!input) {
      return res.status(400).json({
        error: "input query parameter is required",
      });
    }

    const usernames = input
      .split(",")
      .map(extractUsername)
      .filter(Boolean);

    let level1 = [];
    let level2 = [];
    const seen = new Set();

    // ======================
    // LEVEL 1
    // ======================
    for (const username of usernames) {
      const users = await runActor(username);
      if (!users.length) continue;

      const related = users?.[0]?.relatedProfiles || [];
      level1.push(...related);
    }

    // ======================
    // LEVEL 2 (EXPANSION)
    // ======================
    for (const p of level1.slice(0, 10)) {
      const users = await runActor(p.username);
      if (!users.length) continue;

      const related = users?.[0]?.relatedProfiles || [];
      level2.push(...related);
    }

    // ======================
    // MERGE RESULTS
    // ======================
    const all = [...level1, ...level2];

    const merged = [];

    for (const p of all) {
      if (!p?.username) continue;
      if (seen.has(p.username)) continue;

      seen.add(p.username);

      merged.push({
        username: p.username,
        name: p.fullName || p.username,
        followers: p.followersCount || 0,
        profileUrl: `https://instagram.com/${p.username}`,
        profilePic:
          p.profilePicUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`,
      });
    }

    // sort by followers
    merged.sort((a, b) => b.followers - a.followers);

    return res.json({
      accounts: merged,
    });
  } catch (err) {
    console.log("❌ Server error:", err.message);
    return res.status(500).json({
      error: "Internal server error",
      accounts: [],
    });
  }
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});