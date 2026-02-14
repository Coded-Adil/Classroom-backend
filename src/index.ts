import express from 'express';
import cors from 'cors';
import subjectsRouter from './routes/subjects';
import securityMiddleware from './middleware/security';
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

app.use(securityMiddleware);

app.use('/api/subjects', subjectsRouter);

// CORS middleware (must precede route handlers)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.all('/api/auth/*splat', toNodeHandler(auth));

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the classroom backend API!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});