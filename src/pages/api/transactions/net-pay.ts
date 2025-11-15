import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Transaction from '@/models/transaction.model';
// import { verifyToken } from '@/lib/auth';

interface NetPayRequest {
  toUserId: string;
  netAmount: number;
}

interface NetPayResponse {
  success: boolean;
  message: string;
  paidAmount: number;
  nettingAmount: number;
  transactionsProcessed: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NetPayResponse | { message: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // JWT token verification
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Token bulunamadı' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    await connectDB();

    const { toUserId, netAmount }: NetPayRequest = req.body;

    // Validasyon
    if (!toUserId || !netAmount || netAmount <= 0) {
      return res.status(400).json({ message: 'Geçersiz parametreler' });
    }

    try {
      // Bu kullanıcının ödeyeceği borçları al (en eski önce)
      const myDebts = await Transaction.find({
        fromUser: userId,
        toUser: toUserId,
        isPaid: false
      }).sort({ createdAt: 1 });

      // Bu kullanıcının alacaklarını al (mahsup için)
      const myCredits = await Transaction.find({
        fromUser: toUserId,
        toUser: userId,
        isPaid: false
      }).sort({ createdAt: 1 });

      console.log('Net ödeme işlemi:', {
        userId,
        toUserId,
        netAmount,
        myDebtsCount: myDebts.length,
        myCreditsCount: myCredits.length
      });

      let remainingAmount = netAmount;
      let nettingAmount = 0;
      let processedTransactions = 0;

      // 1. ADIM: Karşılıklı mahsup işlemi (partial destekli)
      for (const credit of myCredits) {
        if (remainingAmount <= 0) break;

        const mahsupAmount = Math.min(credit.amount, remainingAmount);
        
        if (mahsupAmount >= credit.amount) {
          // Tam mahsup: bu alacağı kapat
          await Transaction.findByIdAndUpdate(credit._id, {
            isPaid: true,
            paidAt: new Date(),
          });
        } else if (mahsupAmount > 0) {
          // Kısmi mahsup: mevcut kaydı ödenen miktarla kapat, kalan için yeni kayıt oluştur
          const remainingDebt = credit.amount - mahsupAmount;

          await Transaction.findByIdAndUpdate(credit._id, {
            amount: mahsupAmount,
            isPaid: true,
            paidAt: new Date(),
          });

          const newTransaction = new Transaction({
            billId: credit.billId,
            fromUser: credit.fromUser,
            toUser: credit.toUser,
            amount: remainingDebt,
            isPaid: false,
          });
          await newTransaction.save();
        }

        nettingAmount += mahsupAmount;
        remainingAmount -= mahsupAmount;
        processedTransactions++;

        console.log(`Mahsup işlemi: ₺${mahsupAmount} - Kalan: ₺${remainingAmount}`);
      }

      // 2. ADIM: Kalan tutar ile borçları öde (partial destekli)
      for (const debt of myDebts) {
        if (remainingAmount <= 0) break;

        const paymentAmount = Math.min(debt.amount, remainingAmount);

        if (paymentAmount >= debt.amount) {
          // Tam ödeme
          await Transaction.findByIdAndUpdate(debt._id, {
            isPaid: true,
            paidAt: new Date(),
          });
        } else if (paymentAmount > 0) {
          // Kısmi ödeme: mevcut kaydı ödenen miktarla kapat, kalan için yeni kayıt oluştur
          const remainingDebt = debt.amount - paymentAmount;

          await Transaction.findByIdAndUpdate(debt._id, {
            amount: paymentAmount,
            isPaid: true,
            paidAt: new Date(),
          });

          const newTransaction = new Transaction({
            billId: debt.billId,
            fromUser: debt.fromUser,
            toUser: debt.toUser,
            amount: remainingDebt,
            isPaid: false,
          });
          await newTransaction.save();
        }

        remainingAmount -= paymentAmount;
        processedTransactions++;

        console.log(`Borç ödeme: ₺${paymentAmount} - Kalan: ₺${remainingAmount}`);
      }

      const paidAmount = netAmount - remainingAmount;

      console.log('Net ödeme tamamlandı:', {
        netAmount,
        paidAmount,
        nettingAmount,
        processedTransactions,
        remainingAmount
      });

      return res.status(200).json({
        success: true,
        message: 'Net ödeme başarıyla tamamlandı',
        paidAmount,
        nettingAmount,
        transactionsProcessed: processedTransactions
      });

    } catch (error) {
      throw error;
    }

  } catch (error: any) {
    console.error('Net ödeme hatası:', error);
    return res.status(500).json({ 
      message: error.message || 'Net ödeme işlemi başarısız' 
    });
  }
}