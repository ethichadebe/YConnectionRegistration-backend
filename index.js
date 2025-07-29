require("dotenv").config();
const express = require("express");
const cors = require("cors");
const registerRoutes = require("./routes/register");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", registerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
