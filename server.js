require("dotenv").config();
const express = require("express");
const cors = require("cors");

const uploadRoute = require("./routes/uploadImage");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/upload", uploadRoute);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🔥 ComicsPie back butt-end running on port ${PORT}`);
});
