import express from 'express';
import cors from 'cors';
import subjectsRouter from './routes/subjects';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

app.use('/api/subjects', subjectsRouter);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the classroom backend API!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});