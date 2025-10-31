import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: 'Oturum bulunamadı', authenticated: false });
    }

    return res.status(200).json({ 
      authenticated: true,
      user: {
        userId: user.userId,
        username: user.username,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
