// ✅ Fast Image Proxy + Redis Cache + Background Upload + Retry + LRU Memory Cache
const express = require("express");
const router = express.Router();
const axios = require("axios");
const sharp = require("sharp");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const Redis = require("ioredis");
const { LRUCache } = require("lru-cache");

// 🔧 Setup Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔧 Setup Redis with TLS for Upstash (secure rediss://)
const redis = new Redis(process.env.REDIS_URL, {
  tls: {}, // ✅ This ensures secure connection to Upstash
});

// 🔧 Setup LRU In-Memory Cache (500 items max)
const memoryCache = new LRUCache({ max: 500 });

// 🛠 Compress Image
async function compressImageFromUrl(imageUrl) {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");
  return await sharp(buffer)
    .resize({ width: 600 })
    .webp({ quality: 40 })
    .toBuffer();
}

// ☁ Upload to Cloudinary
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "comicspie",
        format: "webp",
        transformation: [
          { width: 600, crop: "scale" },
          { quality: "auto:low" },
        ],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// 🔁 Background upload & cache
async function backgroundUpload(imageUrl) {
  try {
    const compressed = await compressImageFromUrl(imageUrl);
    const result = await uploadToCloudinary(compressed);
    await redis.set(imageUrl, result.secure_url, "EX", 60 * 60 * 24 * 7); // 7 days
    memoryCache.set(imageUrl, result.secure_url);
    console.log("✅ Uploaded in background:", result.secure_url);
  } catch (err) {
    console.error("❌ BG Upload Failed:", err.message);
  }
}

// 🚀 POST /upload
router.post("/", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });

  try {
    // 1️⃣ Check LRU memory cache
    const memCached = memoryCache.get(imageUrl);
    if (memCached) {
      console.log("✅ Memory cache hit:", imageUrl);
      return res.json({ url: memCached });
    }

    // 2️⃣ Check Redis cache
    const redisCached = await redis.get(imageUrl);
    if (redisCached) {
      console.log("✅ Redis hit:", imageUrl);
      memoryCache.set(imageUrl, redisCached);
      return res.json({ url: redisCached });
    }

    // 3️⃣ Return original image immediately
    res.json({ url: imageUrl });

    // 4️⃣ Start upload in background
    backgroundUpload(imageUrl);
  } catch (err) {
    console.error("❌ Upload route failed:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
