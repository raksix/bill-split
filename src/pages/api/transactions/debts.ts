import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import User from '@/models/user.model';
import mongoose from 'mongoose';

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

    console.log(`🔍 Fetching debts for user: ${userId}`);

    // Kullanıcının tüm transaction'larını al (sadece ödenmeyenler)
    const allTransactions = await Transaction.find({
      $or: [
        { fromUser: userId }, // Kullanıcının borçları
        { toUser: userId }    // Kullanıcıya borçlu olanlar
      ],
      isPaid: false
    }).populate('fromUser toUser', 'name email')
      .populate('billId', 'market_adi tarih toplam_tutar');

    console.log(`📊 Found ${allTransactions.length} unpaid transactions`);

    // Borçları kategorize et
    const debts = {
      iOwe: [] as any[], // Benim borçlarım
      owedToMe: [] as any[] // Bana borçlu olanlar
    };

    let totalIOwe = 0;
    let totalOwedToMe = 0;

    // Transaction'ları kategorize et
    for (const transaction of allTransactions) {
      const transactionData: any = {
        id: transaction._id,
        amount: transaction.amount,
        billId: {
          _id: (transaction.billId as any)?._id,
          market_adi: (transaction.billId as any)?.market_adi || 'Bilinmiyor',
          tarih: (transaction.billId as any)?.tarih || '',
          toplam_tutar: (transaction.billId as any)?.toplam_tutar || 0
        },
        createdAt: transaction.createdAt,
        type: transaction.type || 'debt',
        fromUser: {
          id: (transaction.fromUser as any)._id,
          name: (transaction.fromUser as any).name || 'Bilinmeyen',
          email: (transaction.fromUser as any).email || ''
        },
        toUser: {
          id: (transaction.toUser as any)._id,
          name: (transaction.toUser as any).name || 'Bilinmeyen',
          email: (transaction.toUser as any).email || ''
        }
      };

      if ((transaction.fromUser as any)._id.toString() === userId) {
        // Ben borçluyum
        debts.iOwe.push({
          ...transactionData,
          creditor: transactionData.toUser, // Alacaklı
          description: `${transactionData.toUser.name}'e borç`
        });
        totalIOwe += transaction.amount;
        console.log(`💸 I owe ₺${transaction.amount} to ${transactionData.toUser.name}`);
      } else {
        // Bana borçlu
        debts.owedToMe.push({
          ...transactionData,
          debtor: transactionData.fromUser, // Borçlu
          description: `${transactionData.fromUser.name}'den alacak`
        });
        totalOwedToMe += transaction.amount;
        console.log(`💰 ${transactionData.fromUser.name} owes me ₺${transaction.amount}`);
      }
    }

    // Kullanıcılar bazında grupla
    const debtSummaryMap = new Map();

    // Benim borçlarım - kullanıcı bazında grupla
    for (const debt of debts.iOwe) {
      const creditorId = debt.creditor.id.toString();
      if (!debtSummaryMap.has(creditorId)) {
        debtSummaryMap.set(creditorId, {
          userId: creditorId,
          userName: debt.creditor.name,
          userEmail: debt.creditor.email,
          totalIOweThem: 0,
          totalTheyOweMe: 0,
          transactions: []
        });
      }
      const summary = debtSummaryMap.get(creditorId);
      summary.totalIOweThem += debt.amount;
      summary.transactions.push(debt);
    }

    // Bana borçlu olanlar - kullanıcı bazında grupla  
    for (const debt of debts.owedToMe) {
      const debtorId = debt.debtor.id.toString();
      if (!debtSummaryMap.has(debtorId)) {
        debtSummaryMap.set(debtorId, {
          userId: debtorId,
          userName: debt.debtor.name,
          userEmail: debt.debtor.email,
          totalIOweThem: 0,
          totalTheyOweMe: 0,
          transactions: []
        });
      }
      const summary = debtSummaryMap.get(debtorId);
      summary.totalTheyOweMe += debt.amount;
      summary.transactions.push(debt);
    }

    // Net borç hesapla
    const debtSummary = Array.from(debtSummaryMap.values()).map(summary => {
      const netAmount = summary.totalTheyOweMe - summary.totalIOweThem;
      return {
        ...summary,
        netAmount, // Pozitif = bana borçlu, Negatif = ben borçluyum
        netStatus: netAmount > 0 ? 'owes_me' : (netAmount < 0 ? 'i_owe' : 'even'),
        displayAmount: Math.abs(netAmount)
      };
    });

    const result = {
      summary: {
        totalIOwe,
        totalOwedToMe,
        netBalance: totalOwedToMe - totalIOwe // Pozitif = kar, Negatif = zarar
      },
      
      myDebts: debts.iOwe.map(debt => ({
        transactionId: debt.id,
        amount: debt.amount,
        creditor: debt.creditor,
        description: debt.description,
        createdAt: debt.createdAt,
        billId: debt.billId
      })),
      
      debtsToMe: debts.owedToMe.map(debt => ({
        transactionId: debt.id,
        amount: debt.amount,
        debtor: debt.debtor,
        description: debt.description,
        createdAt: debt.createdAt,
        billId: debt.billId
      })),
      
      debtSummaryByUser: debtSummary.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount)),
      
      statistics: {
        totalUsers: debtSummary.length,
        usersIOwe: debtSummary.filter(s => s.netStatus === 'i_owe').length,
        usersWhoOweMe: debtSummary.filter(s => s.netStatus === 'owes_me').length,
        evenUsers: debtSummary.filter(s => s.netStatus === 'even').length,
        largestDebtToMe: Math.max(...debts.owedToMe.map(d => d.amount), 0),
        largestDebtIOwe: Math.max(...debts.iOwe.map(d => d.amount), 0)
      }
    };

    console.log(`📊 Debt summary completed:`, {
      totalIOwe,
      totalOwedToMe,
      netBalance: result.summary.netBalance,
      userCount: debtSummary.length
    });

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debt summary API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Borç özeti alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}