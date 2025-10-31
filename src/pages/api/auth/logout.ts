import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const cookie = serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: -1,
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({ message: 'Çıkış başarılı' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
