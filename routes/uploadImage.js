const express = require("express");
const router = express.Router();
const axios = require("axios");

const { uploadToCloudinary } = require("../utils/cloudinary");
const { compressImageFromUrl } = require("../utils/imageCompressor");

// POST /upload
router.post("/", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }

  try {
    const compressedBuffer = await compressImageFromUrl(imageUrl);
    const cloudinaryResult = await uploadToCloudinary(compressedBuffer);
    res.json({ url: cloudinaryResult.secure_url });
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
