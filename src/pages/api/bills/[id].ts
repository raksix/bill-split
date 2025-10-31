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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Geçersiz fatura ID' });
    }

    const bill = await Bill.findById(id)
      .populate('uploadedBy', 'name username')
      .populate('participants', 'name username');

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    return res.status(200).json({ bill });
  } catch (error) {
    console.error('Get bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
