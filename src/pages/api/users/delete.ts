import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await connectDB();

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Kullanıcı ID gerekli' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin kullanıcısı silinemez' });
    }

    await User.findByIdAndDelete(userId);

    return res.status(200).json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
