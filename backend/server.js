const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_TOKEN;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// 📁 CACHE
const CACHE_FILE = 'cache.json';
let cache = {};

if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE));
    console.log("✅ Cache loaded");
  } catch {
    cache = {};
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 🔥 USERNAME EXTRACTOR (FINAL FIX)
function extractUsername(input) {
  try {
    input = decodeURIComponent(input).trim();

    // remove @
    if (input.startsWith('@')) {
      return input.slice(1);
    }

    // extract from URL
    const match = input.match(/instagram\.com\/([^\/\?\#]+)/i);
    if (match && match[1]) {
      return match[1];
    }

    return input;

  } catch {
    return input;
  }
}

// 🔍 CACHE
function getCached(username) {
  for (const id in cache) {
    if (cache[id].username === username) {
      console.log("⚡ Cache hit:", username);
      return cache[id].data;
    }
  }
  return null;
}

// 🚀 APIFY SCRAPER
async function runActor(username) {

  const cached = getCached(username);
  if (cached) return cached;

  try {
    console.log("🔥 Fetching:", username);

    const run = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}`,
      { usernames: [username] }
    );

    const runId = run.data.data.id;

    let status = "RUNNING";
    let attempts = 0;

    while (status === "RUNNING" && attempts < 20) {
      await delay(3000);

      const check = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );

      status = check.data.data.status;
      attempts++;
    }

    if (status !== "SUCCEEDED") return [];

    const datasetId = run.data.data.defaultDatasetId;

    const data = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    const result = data.data || [];
    const userId = result?.[0]?.id;

    if (userId) {
      cache[userId] = {
        username,
        data: result
      };
      saveCache();
    }

    return result;

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    return [];
  }
}

// 🎯 FINAL ROUTE (IMPORTANT)
app.get('/api/suggest', async (req, res) => {
  try {
    const input = req.query.input || "";

    const usernames = input
      .split(',')
      .map(i => extractUsername(i))
      .filter(Boolean);

    const seen = new Set();
    const merged = [];

    // 🔥 LEVEL 1 (initial users)
    let level1 = [];

    for (const username of usernames) {
      const users = await runActor(username);
      if (!users.length) continue;

      const related = users[0].relatedProfiles || [];
      level1.push(...related);
    }

    // 🔥 LEVEL 2 (expand suggestions)
    let level2 = [];

    for (const p of level1.slice(0, 10)) { // limit to avoid crash
      const users = await runActor(p.username);
      if (!users.length) continue;

      const related = users[0].relatedProfiles || [];
      level2.push(...related);
    }

    // 🔥 MERGE ALL LEVELS
    const all = [...level1, ...level2];

    for (const p of all) {

      if (!p.username || seen.has(p.username)) continue;
      seen.add(p.username);

      merged.push({
        handle: p.username,
        name: p.fullName || p.username,
        followers: p.followersCount || 0,
        profileUrl: `https://instagram.com/${p.username}`,
        profilePic:
          p.profilePicUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}`
      });
    }

    // 🔥 SORT (best first)
    merged.sort((a, b) => b.followers - a.followers);

    res.json({ accounts: merged });

  } catch (err) {
    console.log("❌ ERROR:", err.message);
    res.json({ accounts: [] });
  }
});

app.get("/", (req, res) => {
  res.send("Instagram Scraper Backend Running");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});