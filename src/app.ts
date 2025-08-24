import express from "express";
import cors from "cors"; // Importa la librería cors
import dotenv from "dotenv";
import morgan from "morgan"; // Importa la librería morgan

// ROUTERS //
import usersRouter from "./routers/usersRouter";
import categoriesRouter from "./routers/categoriesRouter";
import productsRouter from "./routers/productsRouter";

// Cargar variables de entorno (desde .env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
// 1. CORS: Configúralo una sola vez y correctamente.
//    Para desarrollo, puedes usar cors() sin opciones.
//    Para producción, es mejor especificar el origen.
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://mini-feria-fronted.vercel.app',
      'http://localhost:5173',
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true, // Necesario si manejas cookies, sesiones o tokens con credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Especifica los métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Especifica los encabezados permitidos

}));

app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
}));



// 2. Morgan: Para registro de solicitudes HTTP.
app.use(morgan("dev")); // El formato 'dev' es genial para desarrollo.

// 3. express.json(): Para parsear cuerpos de solicitud JSON. ¡Crucial para tu login!
app.use(express.json());

// Ruta de prueba
app.get("/", (_req, res) => {
  res.send("API funcionando");
});

// Rutas de la API para usuarios
app.use("/api/users", usersRouter);
// Ruta para API categories
app.use("/api/categories", categoriesRouter)
// Rta de la APi para products
app.use("/api/products", productsRouter)

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${PORT}`);
});
