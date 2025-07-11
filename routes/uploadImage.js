const express = require("express");
const router = express.Router();
const axios = require("axios");
const streamifier = require("streamifier");

const cloudinary = require("cloudinary").v2;
const sharp = require("sharp"); // For compression

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📦 Compress image from URL using sharp
async function compressImageFromUrl(imageUrl) {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "binary");
  return await sharp(buffer)
    .resize({ width: 720 })
    .webp({ quality: 65 }) // You can tweak this if needed
    .toBuffer();
}

// 🚀 Upload buffer to Cloudinary
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "comicspie",
        format: "webp",
        transformation: [
          { width: 720, crop: "scale" },
          { quality: "auto:low" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// 🚨 POST /upload — main route
router.post("/", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }

  try {
    const compressedBuffer = await compressImageFromUrl(imageUrl);
    const result = await uploadToCloudinary(compressedBuffer);
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
