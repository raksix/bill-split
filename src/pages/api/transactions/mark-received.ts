import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';

interface MarkReceivedRequest {
  transactionId: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    const { transactionId }: MarkReceivedRequest = req.body;

    // Validation
    if (!transactionId) {
      return res.status(400).json({ message: 'Transaction ID gerekli' });
    }

    await connectToDatabase();

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction bulunamadı' });
    }

    // Check if user is authorized to mark this as received (must be the creditor)
    if (transaction.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Bu işlemi yapma yetkiniz yok - sadece alacaklı işaretleyebilir' });
    }

    // Check if already paid
    if (transaction.isPaid) {
      return res.status(400).json({ message: 'Bu borç zaten ödenmiş olarak işaretli' });
    }

    // Mark as received/paid
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        isPaid: true,
        paidAt: new Date(),
        paymentNote: 'Alacaklı tarafından ödendi olarak işaretlendi',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      throw new Error('Transaction güncellenemedi');
    }

    console.log(`✅ Transaction marked as received: ₺${transaction.amount} - ${transactionId}`);
    
    return res.status(200).json({
      message: 'Ödeme alındı olarak işaretlendi',
      transactionId: updatedTransaction._id,
      amount: updatedTransaction.amount,
      paidAt: updatedTransaction.paidAt
    });

  } catch (error: any) {
    console.error('Mark received API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz transaction ID' });
    }

    return res.status(500).json({
      message: 'İşlem sırasında hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}