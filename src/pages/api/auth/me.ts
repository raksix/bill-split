import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const tokenUser = getUserFromRequest(req);

    if (!tokenUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı', authenticated: false });
    }

    await connectDB();
    
    const user = await User.findById(tokenUser.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı', authenticated: false });
    }

    return res.status(200).json({ 
      authenticated: true,
      user: {
        userId: (user as any)._id.toString(),
        username: (user as any).username,
        name: (user as any).name,
        role: (user as any).role,
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
