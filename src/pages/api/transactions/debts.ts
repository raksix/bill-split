import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import Bill from '@/models/bill.model';
import User from '@/models/user.model';

interface DebtSummary {
  totalDebt: number;
  totalCredit: number;
  unpaidDebts: any[];
  unpaidCredits: any[];
  paidTransactions: any[];
}

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

    // Get all transactions for the user (both as debtor and creditor)
    const [debtTransactions, creditTransactions, paidTransactions] = await Promise.all([
      // Unpaid debts (user owes money to others)
      Transaction.find({
        fromUser: userId,
        isPaid: false
      })
      .populate('fromUser', 'name username')
      .populate('toUser', 'name username')
      .populate('billId', 'market_adi tarih toplam_tutar')
      .sort({ createdAt: -1 }),

      // Unpaid credits (others owe money to user)
      Transaction.find({
        toUser: userId,
        isPaid: false
      })
      .populate('fromUser', 'name username')
      .populate('toUser', 'name username')
      .populate('billId', 'market_adi tarih toplam_tutar')
      .sort({ createdAt: -1 }),

      // Paid transactions (history)
      Transaction.find({
        $or: [
          { fromUser: userId, isPaid: true },
          { toUser: userId, isPaid: true }
        ]
      })
      .populate('fromUser', 'name username')
      .populate('toUser', 'name username')
      .populate('billId', 'market_adi tarih toplam_tutar')
      .sort({ paidAt: -1 })
      .limit(50) // Limit history to last 50 transactions
    ]);

    // Calculate totals
    const totalDebt = debtTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = creditTransactions.reduce((sum, t) => sum + t.amount, 0);

    const result: DebtSummary = {
      totalDebt,
      totalCredit,
      unpaidDebts: debtTransactions,
      unpaidCredits: creditTransactions,
      paidTransactions
    };

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Debt API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}