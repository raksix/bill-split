import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import mongoose from 'mongoose';

interface PaymentRequest {
  transactionId: string;
  amount: number;
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

    const { transactionId, amount }: PaymentRequest = req.body;

    // Validation
    if (!transactionId || !amount) {
      return res.status(400).json({ message: 'Transaction ID ve tutar gerekli' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Ödeme tutarı 0\'dan büyük olmalı' });
    }

    await connectToDatabase();

    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction bulunamadı' });
    }

    // Check if user is authorized to pay this debt
    if (transaction.fromUser.toString() !== userId) {
      return res.status(403).json({ message: 'Bu borcu ödeme yetkiniz yok' });
    }

    // Check if already paid
    if (transaction.isPaid) {
      return res.status(400).json({ message: 'Bu borç zaten ödenmiş' });
    }

    // Check if payment amount is valid
    if (amount > transaction.amount) {
      return res.status(400).json({ message: 'Ödeme tutarı borç tutarından fazla olamaz' });
    }

    // Start MongoDB session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        if (amount === transaction.amount) {
          // Full payment - mark as paid
          await Transaction.findByIdAndUpdate(
            transactionId,
            {
              isPaid: true,
              paidAt: new Date(),
              updatedAt: new Date()
            },
            { session }
          );
        } else {
          // Partial payment - update amount and create new transaction for remaining
          const remainingAmount = transaction.amount - amount;
          
          // Update original transaction with paid amount
          await Transaction.findByIdAndUpdate(
            transactionId,
            {
              amount: amount,
              isPaid: true,
              paidAt: new Date(),
              updatedAt: new Date()
            },
            { session }
          );

          // Create new transaction for remaining amount
          await Transaction.create([{
            billId: transaction.billId,
            fromUser: transaction.fromUser,
            toUser: transaction.toUser,
            amount: remainingAmount,
            isPaid: false,
            type: transaction.type || 'debt',
            createdAt: new Date(),
            updatedAt: new Date()
          }], { session });
        }
      });

      console.log(`✅ Payment processed: ₺${amount} for transaction ${transactionId}`);
      
      return res.status(200).json({
        message: 'Ödeme başarıyla kaydedildi',
        paidAmount: amount,
        isFullPayment: amount === transaction.amount
      });

    } catch (sessionError) {
      await session.abortTransaction();
      throw sessionError;
    } finally {
      await session.endSession();
    }

  } catch (error: any) {
    console.error('Payment API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Geçersiz transaction ID' });
    }

    return res.status(500).json({
      message: 'Ödeme işlenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}