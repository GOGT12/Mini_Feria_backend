
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Test route
app.get("/", (_req, res) => {
  res.send("API funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
