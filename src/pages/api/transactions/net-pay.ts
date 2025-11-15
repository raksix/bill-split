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

    // Validasyon: netAmount 0 olabilir (sadece mahsup)
    if (!toUserId || netAmount == null || netAmount < 0) {
      return res.status(400).json({ message: 'Geçersiz parametreler' });
    }

    try {
      // Bu kullanıcının ödeyeceği borçları al (en eski önce)
      let myDebts = await Transaction.find({
        fromUser: userId,
        toUser: toUserId,
        isPaid: false
      }).sort({ createdAt: 1 });

      // Bu kullanıcının alacaklarını al (mahsup için)
      let myCredits = await Transaction.find({
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

      let nettingAmount = 0;
      let processedTransactions = 0;

      // AŞAMA 1: Karşılıklı borçları TAM mahsup et (ödeme tutarından bağımsız)
  const totalMyDebts = myDebts.reduce((s, t) => s + t.amount, 0);
  const totalMyCredits = myCredits.reduce((s, t) => s + t.amount, 0);
      let mutualToCancel = Math.min(totalMyDebts, totalMyCredits);

      const cancelFromList = async (list: any[], amountToCancel: number) => {
        let remaining = amountToCancel;
        for (const t of list) {
          if (remaining <= 0) break;
          const use = Math.min(t.amount, remaining);
          if (use >= t.amount) {
            await Transaction.findByIdAndUpdate(t._id, {
              isPaid: true,
              paidAt: new Date(),
            });
          } else if (use > 0) {
            const leftover = t.amount - use;
            await Transaction.findByIdAndUpdate(t._id, {
              amount: use,
              isPaid: true,
              paidAt: new Date(),
            });
            const newT = new Transaction({
              billId: t.billId,
              fromUser: t.fromUser,
              toUser: t.toUser,
              amount: leftover,
              isPaid: false,
            });
            await newT.save();
          }
          remaining -= use;
          processedTransactions++;
        }
        return amountToCancel - remaining;
      };

      if (mutualToCancel > 0) {
        // Önce onların bana olan borçlarını kapat
        const canceledOnCredits = await cancelFromList(myCredits, mutualToCancel);
        // Aynı tutarı benim borçlarımdan kapat
        const canceledOnDebts = await cancelFromList(myDebts, canceledOnCredits);
        nettingAmount += canceledOnDebts; // her iki tarafta da aynı tutar kapanır
        console.log(`🔄 Tam mahsup tamamlandı: ₺${nettingAmount}`);
      }

      // AŞAMA 2: Net tutarı borçlarıma uygula
      let remainingAmount = netAmount;

      // NetAmount > 0 ise ben borçluyum demek; kalan borçlarımı öde
      if (remainingAmount > 0) {
        // Mahsuptan sonra güncel borç listesi
        myDebts = await Transaction.find({
          fromUser: userId,
          toUser: toUserId,
          isPaid: false,
        }).sort({ createdAt: 1 });

        for (const debt of myDebts) {
          if (remainingAmount <= 0) break;
          const paymentAmount = Math.min(debt.amount, remainingAmount);

          if (paymentAmount >= debt.amount) {
            await Transaction.findByIdAndUpdate(debt._id, {
              isPaid: true,
              paidAt: new Date(),
            });
          } else if (paymentAmount > 0) {
            const leftover = debt.amount - paymentAmount;
            await Transaction.findByIdAndUpdate(debt._id, {
              amount: paymentAmount,
              isPaid: true,
              paidAt: new Date(),
            });
            const newDebt = new Transaction({
              billId: debt.billId,
              fromUser: debt.fromUser,
              toUser: debt.toUser,
              amount: leftover,
              isPaid: false,
            });
            await newDebt.save();
          }
          remainingAmount -= paymentAmount;
          processedTransactions++;
        }
      }

      const paidAmount = netAmount - Math.max(0, remainingAmount);

      console.log('Net ödeme tamamlandı:', {
        netAmount,
        paidAmount,
        nettingAmount,
        processedTransactions,
        remainingAmount
      });

      return res.status(200).json({
        success: true,
        message: netAmount > 0 ? 'Net ödeme başarıyla tamamlandı' : 'Karşılıklı mahsup başarıyla tamamlandı',
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