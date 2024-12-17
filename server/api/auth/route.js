import { connectDB, User } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    await connectDB();
    
    const { username, password, action } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let user;

    if (action === 'register') {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Username already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user = await User.create({
        username,
        password: hashedPassword
      });
    }
    else if (action === 'login') {
      user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update last login
      await User.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() }}
      );
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie with consistent options
    const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; ${
      process.env.NODE_ENV === 'production' ? 'Secure; SameSite=None' : 'SameSite=Lax'
    }; Max-Age=${24 * 60 * 60}`; // 24 hours

    return new Response(JSON.stringify({ success: true, username: user.username }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}