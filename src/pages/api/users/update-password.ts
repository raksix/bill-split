import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { getUserFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await connectDB();

    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'Kullanıcı ID ve yeni şifre gerekli' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
