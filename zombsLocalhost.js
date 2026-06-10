const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.static("public"));

const leaderboardCache = new Map();
const leaderboardCategories = new Set(["wave", "score"]);
const leaderboardTimes = new Set(["24h", "7d", "all"]);

const imagesRoot = path.join(__dirname, "public", "images");
const getPictureAssets = (directory = imagesRoot) => {
    const assets = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            assets.push(...getPictureAssets(fullPath));
        } else if (/\.(svg|png|ico)$/i.test(entry.name)) {
            const relativePath = path.relative(path.join(__dirname, "public"), fullPath).replace(/\\/g, "/");
            assets.push(`./${relativePath}`);
        }
    }
    return assets;
}

app.get("/manifest.json", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getPictureAssets());
});

app.get("/zombs-leaderboard", async (req, res) => {
    const category = leaderboardCategories.has(req.query.category) ? req.query.category : "wave";
    const time = leaderboardTimes.has(req.query.time) ? req.query.time : "24h";
    const cacheKey = `${category}:${time}`;
    const cached = leaderboardCache.get(cacheKey);
    res.set("Cache-Control", "no-store");
    if (cached && Date.now() - cached.createdAt < 60000) {
        res.json(cached.data);
        return;
    }
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://zombs.io/leaderboard/data?category=${category}&time=${time}`, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "nigger"
            },
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!response.ok) {
            res.status(response.status).json({ status: "error", parties: [] });
            return;
        }
        const data = await response.json();
        leaderboardCache.set(cacheKey, { createdAt: Date.now(), data });
        res.json(data);
    } catch (error) {
        res.status(502).json({ status: "error", parties: [] });
    }
});

app.get("/zombs_wasm.wasm", (req, res) => {
    const options = { root: path.join(__dirname) };
    res.sendFile("zombs_wasm.wasm", options);
});

app.get("/", (req, res) => {
    const options = { root: path.join(__dirname) };
    res.sendFile("client.html", options);
});

app.listen(80);