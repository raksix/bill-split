import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { getUserFromRequest } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await connectDB();

    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Tüm alanları doldurun' });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      username,
      password: hashedPassword,
      name,
      role: 'user',
    });

    return res.status(201).json({ 
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
