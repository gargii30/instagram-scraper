const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const APIFY_TOKEN = process.env.APIFY_TOKEN;

// 🔥 TEMP STORAGE
let saved = [];

// 🚀 APIFY CALL
async function runActor(username) {
  try {
    const res = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=120`,
      { usernames: [username] },
      { timeout: 120000 }
    );

    const datasetId = res.data?.data?.defaultDatasetId;
    if (!datasetId) return [];

    const data = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    );

    return data.data || [];
  } catch (err) {
    console.log("Apify error:", err.message);
    return [];
  }
}

// 🎯 MAIN API (CLEAN + EXACT)
app.get('/api/suggest/:username', async (req, res) => {
  try {
    const username = req.params.username.replace('@', '');

    const users = await runActor(username);
    if (!users.length) {
      return res.json({ accounts: [] });
    }

    const user = users[0];

    // 🔥 EXACT MATCH WITH APIFY CONSOLE
    const accounts = (user.relatedProfiles || []).map(p => ({
      handle: p.username,
      name: p.fullName || p.username,
      followers: p.followersCount || 0,
      category: p.category || 'Creator',
      relevanceScore: 100
    }));

    console.log("✅ Suggestions:", accounts.length);

    res.json({ accounts });

  } catch (err) {
    console.log("ERROR:", err.message);
    res.json({ accounts: [] });
  }
});

// 💾 SAVE
app.post('/api/save', (req, res) => {
  const creator = req.body;

  if (!saved.find(c => c.handle === creator.handle)) {
    saved.push(creator);
  }

  res.json({ success: true });
});

// 📂 VIEW SAVED
app.get('/api/saved', (req, res) => {
  res.json(saved);
});

app.listen(4000, () => {
  console.log('✅ Backend running on http://localhost:4000');
});