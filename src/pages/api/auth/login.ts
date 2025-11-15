import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { comparePassword } from '@/lib/password';
import { generateToken } from '@/lib/auth';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre gerekli' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });
    
    const isProd = process.env.NODE_ENV === 'production';
    const cookieMaxAge = process.env.JWT_COOKIE_MAX_AGE
      ? parseInt(process.env.JWT_COOKIE_MAX_AGE, 10)
      : (isProd ? 60 * 60 * 24 * 7 : 60 * 60 * 24 * 365);

    const cookie = serialize('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({ 
      message: 'Giriş başarılı',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
