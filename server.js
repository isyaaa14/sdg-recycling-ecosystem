import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import studentAuthRoutes from './routes/studentAuth.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Student4-Token'],
  credentials: true
}));
app.use(express.json());

app.use('/api/v1/auth', studentAuthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);

app.listen(PORT, () => {
  console.log(`SDG BFF Server running on port ${PORT}`);
});
