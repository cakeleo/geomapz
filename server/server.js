// server.js
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { User } from './models/User.js';  // Updated import

import { createServer } from 'http';


// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize dotenv
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Serve static files from client/public
const clientPublicPath = path.join(__dirname, '../client/public');
app.use(express.static(clientPublicPath));

// Environment variable checks
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('Required environment variables are missing');
  process.exit(1);
}

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://localhost:5173'] 
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database Connection
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to MongoDB when server starts
connectDB();

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});


// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { userId: user._id, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Auth check endpoint
app.get('/api/auth/check', authMiddleware, async (req, res) => {
  try {
    res.json({ username: req.user.username });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Notes endpoints
app.get('/api/notes/:countryId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notes = user.notes.get(req.params.countryId) || {};
    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes/:countryId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.notes.set(req.params.countryId, req.body.notes);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  const startTime = new Date().toISOString();
  console.log(`Server awakened at ${startTime}`);
  console.log(`Server running at http://localhost:${port}`);
});

const pingInterval = 4 * 60 * 1000; // 4 minutes
const wake = () => {
  try {
    const options = {
      host: 'your-project-name.glitch.me',
      path: '/ping'
    };
    createServer().request(options).end();
  } catch (err) {
    console.log('Ping error:', err);
  }
};
setInterval(wake, pingInterval);