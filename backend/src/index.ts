/**
 * Servidor de Monitos en Fuga.
 *
 * Express cumple dos papeles:
 *  1. Expone la API JSON del juego en /api (crear partida, consultar estado,
 *     validar y aplicar acciones).
 *  2. Sirve el frontend de React ya compilado, para que toda la aplicacion
 *     quede disponible en un unico dominio y puerto.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { rutas } from './rutas';

const app = express();
const puerto = Number(process.env.PORT) || 3001;

app.use(express.json());
app.use('/api', rutas);

// Cualquier ruta /api que no exista responde en JSON, no con el HTML del juego.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'Endpoint inexistente.' } });
});

// Frontend compilado (se genera con "npm run build" en la carpeta frontend).
const carpetaFrontend = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(carpetaFrontend)) {
  app.use(express.static(carpetaFrontend));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(carpetaFrontend, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(200).send('Frontend no compilado. Ejecuta "npm run build" o usa el servidor de desarrollo de Vite.');
  });
}

app.listen(puerto, () => {
  console.log(`Monitos en Fuga escuchando en http://localhost:${puerto}`);
});
