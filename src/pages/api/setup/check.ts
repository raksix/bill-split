import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import User from '@/models/user.model';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    
    const adminExists = await User.findOne({ role: 'admin' });
    
    return res.status(200).json({ 
      needsSetup: !adminExists,
      message: adminExists ? 'Admin kullanıcısı mevcut' : 'Admin kullanıcısı oluşturulmalı'
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
