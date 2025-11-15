import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Bill from '@/models/bill.model';
import Transaction from '@/models/transaction.model';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const { billId, urunler, participants } = req.body;

    console.log('💾 Bill save request:', {
      billId,
      urunlerCount: urunler?.length,
      participantsCount: participants?.length,
      participants,
      currentUserId: currentUser.userId
    });

    if (!billId || !urunler || !participants) {
      return res.status(400).json({ message: 'Eksik bilgi' });
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    if (bill.uploadedBy.toString() !== currentUser.userId) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    const sharedItems = urunler.filter((item: any) => !item.isPersonal);
    const sharedTotal = sharedItems.reduce((sum: number, item: any) => sum + item.fiyat, 0);

    bill.urunler = urunler;
    bill.participants = participants;
    bill.toplam_tutar = urunler.reduce((sum: number, item: any) => sum + item.fiyat, 0);
    await bill.save();

    await Transaction.deleteMany({ billId: bill._id });

    if (participants.length > 0 && sharedTotal > 0) {
      const perPersonAmount = sharedTotal / participants.length;

      const transactions = participants
        .filter((participantId: string) => participantId !== currentUser.userId)
        .map((participantId: string) => ({
          billId: bill._id,
          fromUser: new mongoose.Types.ObjectId(participantId),
          toUser: new mongoose.Types.ObjectId(currentUser.userId),
          amount: perPersonAmount,
          isPaid: false,
        }));

      if (transactions.length > 0) {
        console.log('💰 Creating transactions:', transactions.map(t => ({
          from: t.fromUser,
          to: t.toUser, 
          amount: t.amount
        })));
        await Transaction.insertMany(transactions);
      } else {
        console.log('⚠️ No transactions created - participants:', participants.length, 'sharedTotal:', sharedTotal);
      }
    }

    return res.status(200).json({ 
      message: 'Fatura başarıyla güncellendi',
      bill: {
        id: bill._id,
        market_adi: bill.market_adi,
        tarih: bill.tarih,
        urunler: bill.urunler,
        toplam_tutar: bill.toplam_tutar,
        participants: bill.participants,
      }
    });
  } catch (error) {
    console.error('Save bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
