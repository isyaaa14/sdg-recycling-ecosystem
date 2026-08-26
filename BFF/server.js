import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import studentAuthRoutes from './routes/studentAuth.js';
import apiRoutes from './routes/api.js';
import { uploadsRoot } from './middleware/upload.js';

const app = express();
const PORT = process.env.PORT || 5050;

// Azure App Service terminates TLS; needed for correct public upload URLs.
app.set('trust proxy', 1);

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

function resolveCorsOrigins() {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Keep local Vite defaults so local progress is unchanged.
  // On Azure, set CORS_ORIGINS to your Static Web App URL(s), comma-separated.
  return [...new Set([...DEFAULT_LOCAL_ORIGINS, ...fromEnv])];
}

const corsOrigins = resolveCorsOrigins();

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Student4-Token'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsRoot));

app.use('/api/v1/auth', studentAuthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);

app.listen(PORT, () => {
  console.log(`SDG BFF Server running on port ${PORT}`);
  console.log(`CORS origins: ${corsOrigins.join(', ')}`);
});
