import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/lib/db';
import Bill from '@/models/bill.model';
import { getUserFromRequest } from '@/lib/auth';
import { processReceiptImage } from '@/lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const currentUser = getUserFromRequest(req);

    if (!currentUser) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    await connectDB();

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'Görsel yüklenmedi' });
    }

    const ocrResult = await processReceiptImage(imageBase64);

    const bill = await Bill.create({
      uploadedBy: currentUser.userId,
      market_adi: ocrResult.market_adi,
      tarih: ocrResult.tarih,
      urunler: ocrResult.urunler,
      toplam_tutar: ocrResult.toplam_tutar,
      participants: [currentUser.userId],
      imageUrl: '',
    });

    return res.status(201).json({ 
      message: 'Fatura başarıyla yüklendi',
      bill: {
        id: bill._id,
        market_adi: bill.market_adi,
        tarih: bill.tarih,
        urunler: bill.urunler,
        toplam_tutar: bill.toplam_tutar,
      }
    });
  } catch (error) {
    console.error('Upload bill error:', error);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}
