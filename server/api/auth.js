import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import cookie from 'cookie';

// User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: true
  },
  notes: {
    type: Map,
    of: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  }
});

// Create or get the User model
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// MongoDB connection with validation and retry logic
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

// Validate environment variables
const validateEnv = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable');
  }
  
  if (!process.env.ALLOWED_ORIGINS) {
    throw new Error('Please define the ALLOWED_ORIGINS environment variable');
  }
};

// Set secure cookie
const setAuthCookie = (res, token) => {
  // Cookie settings
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };

  res.setHeader('Set-Cookie', cookie.serialize('token', token, cookieOptions));
};

// Main handler function
export default async function handler(req, res) {
  // Validate environment variables first
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Handle CORS
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
  
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', true);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();
    
    if (req.method === 'POST') {
      const { username, password, action } = req.body;

      // Validate input
      if (!username || !password || !action) {
        return res.status(400).json({ 
          error: 'Username, password, and action are required' 
        });
      }

      // Username validation
      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({
          error: 'Username must be between 3 and 50 characters'
        });
      }

      // Password validation
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long'
        });
      }

      // Handle registration
      if (action === 'register') {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
          username,
          password: hashedPassword
        });

        // Generate token
        const token = jwt.sign(
          { userId: user._id, username },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Set auth cookie
        setAuthCookie(res, token);

        return res.status(201).json({ success: true });
      }

      // Handle login
      if (action === 'login') {
        // Find user
        const user = await User.findOne({ username });
        if (!user) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await User.updateOne(
          { _id: user._id },
          { $set: { lastLogin: new Date() }}
        );

        // Generate token
        const token = jwt.sign(
          { userId: user._id, username },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Set auth cookie
        setAuthCookie(res, token);

        return res.json({ success: true });
      }

      // Handle logout
      if (action === 'logout') {
        res.setHeader('Set-Cookie', [
          'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
        ]);
        return res.json({ success: true });
      }

      // Handle unknown action
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Handle invalid HTTP method
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error'
    });
  }
}

// Middleware for protected routes
export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user still exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Attach user info to request
      req.user = decoded;
      
      // If using Express-style middleware
      if (next) {
        return next();
      }
      
      return true;
    } catch (err) {
      throw new Error('Invalid token');
    }
  } catch (error) {
    // Clear invalid cookie
    res.setHeader('Set-Cookie', [
      'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
    ]);
    
    return res.status(401).json({ 
      error: 'Authentication failed' 
    });
  }
};