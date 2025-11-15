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
      hasUrunler: !!urunler,
      urunlerCount: urunler?.length || 0,
      participantsCount: participants?.length,
      participants,
      currentUserId: currentUser.userId
    });

    if (!billId || !participants) {
      return res.status(400).json({ message: 'Fatura ID ve katılımcı bilgisi gerekli' });
    }

    const bill = await Bill.findById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    if (bill.uploadedBy?.toString() !== currentUser.userId) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    // Paylaşılan tutarı hesapla - eğer ürün yoksa toplam tutarı kullan
    let sharedTotal = 0;
    if (urunler && urunler.length > 0) {
      const sharedItems = urunler.filter((item: any) => !item.isPersonal);
      sharedTotal = sharedItems.reduce((sum: number, item: any) => sum + item.fiyat, 0);
      bill.toplam_tutar = urunler.reduce((sum: number, item: any) => sum + item.fiyat, 0);
    } else {
      // Ürün yoksa mevcut toplam tutarı kullan
      sharedTotal = bill.toplam_tutar || 0;
    }

    bill.urunler = urunler;
    bill.participants = participants;
    await bill.save();

    await Transaction.deleteMany({ billId: bill._id });

    console.log('💰 Shared total calculation in save:', {
      hasUrunler: !!urunler && urunler.length > 0,
      urunlerLength: urunler?.length || 0,
      sharedTotal,
      participantsCount: participants.length
    });

    if (participants.length > 0 && sharedTotal > 0) {
      // Fatura sahibi dahil tüm katılımcılar arasında paylaşılan tutarı böl
      const perPersonAmount = sharedTotal / participants.length;
      
      console.log('💸 Split calculation:', {
        sharedTotal,
        participantsCount: participants.length,
        perPersonAmount,
        billOwnerId: currentUser.userId
      });

      // Fatura sahibi dışındaki katılımcılar ona borçlu
      const transactions = participants
        .filter((participantId: string) => participantId !== currentUser.userId)
        .map((participantId: string) => ({
          billId: bill._id,
          fromUser: new mongoose.Types.ObjectId(participantId), // Borçlu
          toUser: new mongoose.Types.ObjectId(currentUser.userId), // Alacaklı (fatura sahibi)
          amount: perPersonAmount,
          isPaid: false,
        }));

      if (transactions.length > 0) {
        console.log('💰 Creating transactions:', transactions.map((t: any) => ({
          from: t.fromUser.toString(),
          to: t.toUser.toString(), 
          amount: t.amount
        })));
        await Transaction.insertMany(transactions);
        console.log(`✅ Created ${transactions.length} transactions for bill ${bill._id}`);
      } else {
        console.log('⚠️ No transactions created - current user is the only participant or no other participants');
      }
    } else {
      console.log('⚠️ No transactions created - no participants or no shared items', {
        participantsCount: participants.length,
        sharedTotal
      });
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
