const axios = require("axios");
const sharp = require("sharp");

const compressImageFromUrl = async (url) => {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(response.data, "binary");

  return await sharp(imageBuffer)
    .resize({ width: 800 }) // adjust width if needed
    .webp({ quality: 70 })  // compress to .webp
    .toBuffer();
};

module.exports = { compressImageFromUrl };
