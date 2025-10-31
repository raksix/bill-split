import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Bill from '@/models/bill.model';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const bills = await Bill.find({})
      .populate('uploadedBy', 'name username')
      .populate('participants', 'name username')
      .sort({ createdAt: -1 });

    return res.status(200).json({ bills });
  } catch (error) {
    console.error('List bills error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
