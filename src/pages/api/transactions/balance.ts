import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import '@/models/bill.model'; // Schema'yı register etmek için import


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // JWT token verification
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    await connectToDatabase();

    // Get all unpaid transactions for the user
    const [debts, credits] = await Promise.all([
      // Unpaid debts (user owes money to others)
      Transaction.find({
        fromUser: userId,
        isPaid: false,
      })
        .populate('toUser', 'name username')
        .populate('billId', 'market_adi tarih toplam_tutar')
        .sort({ createdAt: -1 }),

      // Unpaid credits (others owe money to user)  
      Transaction.find({
        toUser: userId,
        isPaid: false,
      })
        .populate('fromUser', 'name username')
        .populate('billId', 'market_adi tarih toplam_tutar')
        .sort({ createdAt: -1 })
    ]);

    // Calculate totals
    const totalDebt = debts.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCredit = credits.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Group debts by person
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

    // Group credits by person
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

  } catch (error: any) {
    console.error('Balance API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
