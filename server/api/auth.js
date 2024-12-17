import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import cookie from 'cookie';

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  try {
    if (mongoose.connections[0].readyState) return;
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
    });
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const validateEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable');
  }
  
  if (!process.env.ALLOWED_ORIGINS) {
    throw new Error('Please define the ALLOWED_ORIGINS environment variable');
  }
};

const setAuthCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };

  res.setHeader('Set-Cookie', cookie.serialize('auth_token', token, cookieOptions));
};

export default async function handler(req, res) {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
  
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', true);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    
    if (req.method === 'POST') {
      const { username, password, action } = req.body;

      if (!username || !password || !action) {
        return res.status(400).json({ error: 'Username, password, and action are required' });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const { User } = await import('../../models/User.js');

      if (action === 'register') {
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

        setAuthCookie(res, token);
        return res.status(201).json({ success: true, username });
      }

      if (action === 'login') {
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        await User.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() }}
        );

        const token = jwt.sign(
          { userId: user._id, username },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        setAuthCookie(res, token);
        return res.json({ success: true, username });
      }

      if (action === 'logout') {
        res.clearCookie('auth_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/'
        });
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}