import express from 'express';
import cors from 'cors';
import { dbConnect } from './db.js';
import Waitlist from './Waitlist.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
dbConnect();

// API Routes
app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const existingUser = await Waitlist.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'You are already on the waitlist!' });
    }

    const waitlistEntry = await Waitlist.create({ name, email });

    return res.status(201).json({ success: true, data: waitlistEntry });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'An error occurred' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
