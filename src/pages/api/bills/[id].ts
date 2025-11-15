import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Bill from '@/models/bill.model';
import { getUserFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Geçersiz fatura ID' });
    }

    const bill = await Bill.findById(id)
      .populate('uploadedBy', 'name username')
      .populate('participants', 'name username');

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    return res.status(200).json({ bill });
  } catch (error) {
    console.error('Get bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const { id } = req.query;
    const { market_adi, tarih, toplam_tutar, urunler, participants } = req.body;

    console.log('📝 Bill detail PUT request:', {
      billId: id,
      market_adi,
      tarih,
      toplam_tutar,
      urunlerCount: urunler?.length,
      participantsCount: participants?.length,
      participants,
      urunler: urunler?.map((u: any) => ({ urun_adi: u.urun_adi, fiyat: u.fiyat, isPersonal: u.isPersonal })),
      currentUserId: currentUser.userId
    });

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Geçersiz fatura ID' });
    }

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    // Check if user can edit (bill owner or admin)
    if (bill.uploadedBy.toString() !== currentUser.userId && currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Bu faturayı düzenleme yetkiniz yok' });
    }

    const updateData: any = {};
    if (market_adi) updateData.market_adi = market_adi;
    if (tarih) updateData.tarih = tarih;
    if (toplam_tutar) updateData.toplam_tutar = parseFloat(toplam_tutar);
    if (urunler) updateData.urunler = urunler;
    if (participants) updateData.participants = participants;

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('uploadedBy', 'name username')
      .populate('participants', 'name username');

    // Transaction işlemlerini ekle (eğer participants güncelleniyorsa)
    if (participants && urunler) {
      const Transaction = (await import('@/models/transaction.model')).default;
      const mongoose = (await import('mongoose')).default;
      
      // Mevcut transaction'ları sil
      await Transaction.deleteMany({ billId: bill._id });

      console.log('🔄 Bill detail PUT - updating transactions:', {
        billId: bill._id,
        participantsCount: participants.length,
        currentUserId: currentUser.userId
      });

      // Paylaşılan ürünleri hesapla
      const sharedItems = urunler.filter((item: any) => !item.isPersonal);
      const sharedTotal = sharedItems.reduce((sum: number, item: any) => sum + item.fiyat, 0);

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
          console.log('⚠️ No transactions created - current user is the only participant');
        }
      } else {
        console.log('⚠️ No transactions created - no participants or no shared items', {
          participantsCount: participants.length,
          sharedTotal
        });
      }
    }

    return res.status(200).json({ bill: updatedBill });
  } catch (error) {
    console.error('Update bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Geçersiz fatura ID' });
    }

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({ message: 'Fatura bulunamadı' });
    }

    // Check if user can delete (bill owner or admin)
    if (bill.uploadedBy.toString() !== currentUser.userId && currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Bu faturayı silme yetkiniz yok' });
    }

    await Bill.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Fatura başarıyla silindi' });
  } catch (error) {
    console.error('Delete bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
