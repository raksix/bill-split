import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Transaction from '@/models/transaction.model';
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

    const transactions = await Transaction.find({
      $or: [
        { fromUser: currentUser.userId },
        { toUser: currentUser.userId },
      ],
    })
      .populate('fromUser', 'name username')
      .populate('toUser', 'name username')
      .populate('billId', 'market_adi tarih toplam_tutar')
      .sort({ createdAt: -1 });

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
