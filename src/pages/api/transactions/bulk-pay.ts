import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import mongoose from 'mongoose';

interface BulkPaymentRequest {
  paymentType: 'single' | 'bulk';
  payments: Array<{
    transactionId?: string;
    toUserId?: string; // Bulk ödeme için
    amount: number;
  }>;
  totalAmount: number; // Kullanıcının girdiği toplam tutar
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

    const { paymentType, payments, totalAmount }: BulkPaymentRequest = req.body;

    // Validation
    if (!paymentType || !payments || payments.length === 0 || !totalAmount) {
      return res.status(400).json({ message: 'Ödeme bilgileri eksik' });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'Ödeme tutarı 0\'dan büyük olmalı' });
    }

    await connectToDatabase();

    if (paymentType === 'single') {
      // Tek transaction ödeme (mevcut sistem)
      const payment = payments[0];
      if (!payment.transactionId) {
        return res.status(400).json({ message: 'Transaction ID gerekli' });
      }

      return await processSinglePayment(payment.transactionId, totalAmount, userId, res);
    } 
    else if (paymentType === 'bulk') {
      // Belirli bir kişiye toplu ödeme + karşılıklı mahsup
      const payment = payments[0];
      if (!payment.toUserId) {
        return res.status(400).json({ message: 'Ödeme yapılacak kullanıcı ID gerekli' });
      }

      return await processBulkPayment(payment.toUserId, totalAmount, userId, res);
    }

  } catch (error: any) {
    console.error('Bulk payment API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Ödeme işlenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function processSinglePayment(transactionId: string, amount: number, userId: string, res: NextApiResponse) {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: 'Transaction bulunamadı' });
  }

  if (transaction.fromUser.toString() !== userId) {
    return res.status(403).json({ message: 'Bu borcu ödeme yetkiniz yok' });
  }

  if (transaction.isPaid) {
    return res.status(400).json({ message: 'Bu borç zaten ödenmiş' });
  }

  if (amount > transaction.amount) {
    return res.status(400).json({ message: 'Ödeme tutarı borç tutarından fazla olamaz' });
  }

  if (amount === transaction.amount) {
    // Tam ödeme
    await Transaction.findByIdAndUpdate(transactionId, {
      isPaid: true,
      paidAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ Single full payment: ₺${amount} for transaction ${transactionId}`);
    
    return res.status(200).json({
      message: 'Ödeme başarıyla kaydedildi',
      paidAmount: amount,
      isFullPayment: true
    });
  } else {
    // Kısmi ödeme
    const remainingAmount = transaction.amount - amount;
    
    await Transaction.findByIdAndUpdate(transactionId, {
      amount: amount,
      isPaid: true,
      paidAt: new Date()
    });

    const newTransaction = new Transaction({
      billId: transaction.billId,
      fromUser: transaction.fromUser,
      toUser: transaction.toUser,
      amount: remainingAmount,
      isPaid: false
    });
    await newTransaction.save();

    console.log(`✅ Single partial payment: ₺${amount} paid, ₺${remainingAmount} remaining`);
    
    return res.status(200).json({
      message: 'Kısmi ödeme başarıyla kaydedildi',
      paidAmount: amount,
      remainingAmount: remainingAmount,
      isFullPayment: false
    });
  }
}

async function processBulkPayment(toUserId: string, totalAmount: number, userId: string, res: NextApiResponse) {
  console.log(`🔄 Bulk payment processing: ${userId} → ${toUserId}, amount: ₺${totalAmount}`);

  // 1. Kullanıcının bu kişiye olan borçlarını getir
  const myDebtsToThisPerson = await Transaction.find({
    fromUser: userId,
    toUser: toUserId,
    isPaid: false
  }).sort({ createdAt: 1 });

  // 2. Bu kişinin kullanıcıya olan borçlarını getir (karşılıklı mahsup için)
  const theirDebtsToMe = await Transaction.find({
    fromUser: toUserId,
    toUser: userId,
    isPaid: false
  }).sort({ createdAt: 1 });

  console.log(`📊 Found debts:`, {
    myDebtsToThemCount: myDebtsToThisPerson.length,
    theirDebtsToMeCount: theirDebtsToMe.length,
    myDebtsToThemTotal: myDebtsToThisPerson.reduce((sum, t) => sum + t.amount, 0),
    theirDebtsToMeTotal: theirDebtsToMe.reduce((sum, t) => sum + t.amount, 0),
    myDebts: myDebtsToThisPerson.map(t => ({ id: t._id, amount: t.amount })),
    theirDebts: theirDebtsToMe.map(t => ({ id: t._id, amount: t.amount }))
  });

  let remainingPayment = totalAmount;
  const processedTransactions = [];

  // 3. Önce karşılıklı mahsup yap
  let myDebtTotal = myDebtsToThisPerson.reduce((sum, t) => sum + t.amount, 0);
  let theirDebtTotal = theirDebtsToMe.reduce((sum, t) => sum + t.amount, 0);

  console.log(`💰 Before netting: My debt ₺${myDebtTotal}, Their debt ₺${theirDebtTotal}`);

  if (theirDebtTotal > 0) {
    const netAmount = Math.min(remainingPayment, theirDebtTotal);
    
    // Onların borcunu sil (netAmount kadar)
    let amountToNet = netAmount;
    for (const theirDebt of theirDebtsToMe) {
      if (amountToNet <= 0) break;

      if (theirDebt.amount <= amountToNet) {
        // Bu borcu tamamen sil
        await Transaction.findByIdAndUpdate(theirDebt._id, {
          isPaid: true,
          paidAt: new Date(),
          paymentNote: `Karşılıklı mahsup - ₺${theirDebt.amount}`
        });
        
        amountToNet -= theirDebt.amount;
        processedTransactions.push({
          type: 'netting',
          amount: theirDebt.amount,
          transactionId: theirDebt._id
        });
      } else {
        // Kısmi mahsup
        const remainingDebt = theirDebt.amount - amountToNet;
        
        await Transaction.findByIdAndUpdate(theirDebt._id, {
          amount: amountToNet,
          isPaid: true,
          paidAt: new Date(),
          paymentNote: `Karşılıklı mahsup - ₺${amountToNet}`
        });

        // Kalan borç için yeni transaction
        const newTransaction = new Transaction({
          billId: theirDebt.billId,
          fromUser: theirDebt.fromUser,
          toUser: theirDebt.toUser,
          amount: remainingDebt,
          isPaid: false
        });
        await newTransaction.save();

        processedTransactions.push({
          type: 'partial_netting',
          amount: amountToNet,
          transactionId: theirDebt._id,
          newTransactionId: newTransaction._id
        });

        amountToNet = 0;
      }
    }

    remainingPayment -= netAmount;
    console.log(`🔄 Netting completed: ₺${netAmount}, remaining payment: ₺${remainingPayment}`);
  }

  // 4. Kalan tutarla kendi borçlarını öde
  if (remainingPayment > 0 && myDebtsToThisPerson.length > 0) {
    let amountToPay = remainingPayment;
    
    for (const myDebt of myDebtsToThisPerson) {
      if (amountToPay <= 0) break;

      if (myDebt.amount <= amountToPay) {
        // Bu borcu tamamen öde
        await Transaction.findByIdAndUpdate(myDebt._id, {
          isPaid: true,
          paidAt: new Date(),
          paymentNote: `Toplu ödeme - ₺${myDebt.amount}`
        });
        
        amountToPay -= myDebt.amount;
        processedTransactions.push({
          type: 'payment',
          amount: myDebt.amount,
          transactionId: myDebt._id
        });
      } else {
        // Kısmi ödeme
        const remainingDebt = myDebt.amount - amountToPay;
        
        await Transaction.findByIdAndUpdate(myDebt._id, {
          amount: amountToPay,
          isPaid: true,
          paidAt: new Date(),
          paymentNote: `Toplu kısmi ödeme - ₺${amountToPay}`
        });

        // Kalan borç için yeni transaction
        const newTransaction = new Transaction({
          billId: myDebt.billId,
          fromUser: myDebt.fromUser,
          toUser: myDebt.toUser,
          amount: remainingDebt,
          isPaid: false
        });
        await newTransaction.save();

        processedTransactions.push({
          type: 'partial_payment',
          amount: amountToPay,
          transactionId: myDebt._id,
          newTransactionId: newTransaction._id
        });

        amountToPay = 0;
      }
    }

    remainingPayment = amountToPay;
  }

  console.log(`✅ Bulk payment completed. Processed ${processedTransactions.length} transactions, unused amount: ₺${remainingPayment}`);

  return res.status(200).json({
    message: 'Toplu ödeme başarıyla tamamlandı',
    totalPaid: totalAmount - remainingPayment,
    unusedAmount: remainingPayment,
    processedTransactions,
    nettingAmount: processedTransactions
      .filter(t => t.type === 'netting' || t.type === 'partial_netting')
      .reduce((sum, t) => sum + t.amount, 0),
    paymentAmount: processedTransactions
      .filter(t => t.type === 'payment' || t.type === 'partial_payment')
      .reduce((sum, t) => sum + t.amount, 0)
  });
}