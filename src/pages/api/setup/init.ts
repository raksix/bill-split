import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';
import { hashPassword } from '@/lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      return res.status(400).json({ message: 'Admin kullanıcısı zaten mevcut' });
    }

    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Tüm alanları doldurun' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const hashedPassword = await hashPassword(password);

    const admin = await User.create({
      username,
      password: hashedPassword,
      name,
      role: 'admin',
    });

    return res.status(201).json({ 
      message: 'Admin kullanıcısı başarıyla oluşturuldu',
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      }
    });
  } catch (error) {
    console.error('Setup init error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
