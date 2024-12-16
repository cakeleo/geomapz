import { connectDB, User } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    await connectDB();
    
    const { username, password, action } = await request.json();

    if (action === 'register') {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Username already exists' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await User.create({
        username,
        password: hashedPassword
      });
    }
    else if (action === 'login') {
      const user = await User.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set cookie
    const cookieHeader = `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24}`;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader
      },
    });

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}