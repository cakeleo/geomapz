import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log('Auth request:', {
    method: req.method,
    path: req.path,
    cookies: req.cookies,
    origin: req.headers.origin
  });
  next();
});

// Auth check endpoint
router.get('/check', async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    console.log('Received token:', token); // Debug log
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ username: user.username });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie with proper options for cross-origin
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Always use secure in production
      sameSite: 'none', // Required for cross-origin
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Update last login
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() }}
    );

    return res.json({ success: true, username });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id, username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // Always use secure in production
      sameSite: 'none', // Required for cross-origin
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(201).json({ success: true, username });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.cookie('auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    expires: new Date(0)
  });
  return res.json({ success: true });
});

export default router;