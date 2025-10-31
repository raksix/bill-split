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

    const debts = await Transaction.find({
      fromUser: currentUser.userId,
      isPaid: false,
    })
      .populate('toUser', 'name username')
      .populate('billId', 'market_adi tarih');

    const credits = await Transaction.find({
      toUser: currentUser.userId,
      isPaid: false,
    })
      .populate('fromUser', 'name username')
      .populate('billId', 'market_adi tarih');

    const totalDebt = debts.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCredit = credits.reduce((sum, transaction) => sum + transaction.amount, 0);

    const debtsByPerson = debts.reduce((acc: any, transaction) => {
      const userId = transaction.toUser._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: transaction.toUser,
          totalAmount: 0,
          transactions: [],
        };
      }
      acc[userId].totalAmount += transaction.amount;
      acc[userId].transactions.push(transaction);
      return acc;
    }, {});

    const creditsByPerson = credits.reduce((acc: any, transaction) => {
      const userId = transaction.fromUser._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: transaction.fromUser,
          totalAmount: 0,
          transactions: [],
        };
      }
      acc[userId].totalAmount += transaction.amount;
      acc[userId].transactions.push(transaction);
      return acc;
    }, {});

    return res.status(200).json({ 
      totalDebt,
      totalCredit,
      debts: Object.values(debtsByPerson),
      credits: Object.values(creditsByPerson),
    });
  } catch (error) {
    console.error('Balance error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
