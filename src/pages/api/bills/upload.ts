import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Bill from '@/models/bill.model';
import { processReceiptImage } from '@/lib/gemini';
import { uploadToRakCDN } from '@/lib/rakcdn';
import QueueProcessor from '@/lib/queue-processor';
import fs from 'fs';
import path from 'path';

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

    await connectToDatabase();

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'Görsel yüklenmedi' });
    }

    console.log('Fatura yükleme başlatıldı, kullanıcı:', userId);

    // Base64'ü buffer'a çevir
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // ADIM 1: Önce CDN'e yükle
    console.log('ADIM 1: CDN\'e yükleme başlatılıyor...');
    const uploadResult = await uploadToRakCDN(imageBuffer, `bill_${userId}_${Date.now()}.png`);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        message: 'Resim yüklenemedi',
        error: uploadResult.error
      });
    }

    console.log('CDN yükleme başarılı:', uploadResult.url);

    // ADIM 2: Bill kaydını oluştur (imageUrl ile)
    const bill = await Bill.create({
      uploadedBy: userId,
      market_adi: 'İşleniyor...', // OCR sonucunda güncellenecek
      tarih: new Date().toISOString().split('T')[0], // Geçici tarih
      urunler: [], // OCR sonucunda doldurulacak
      toplam_tutar: 0, // OCR sonucunda güncellenecek
      participants: [userId],
      imageUrl: uploadResult.url!, // CDN URL'si direkt kaydedildi
    });

    console.log('Fatura kaydı oluşturuldu:', bill._id);

    // ADIM 3: OCR işlemini queue'ya ekle
    const queueItem = await QueueProcessor.addToQueue(
      'bill_ocr',
      userId,
      {
        billId: bill._id!.toString(),
        imageUrl: uploadResult.url!,
        imageBase64: imageBase64, // OCR için gerekli
        progressPercentage: 0,
        processingStep: 'CDN yükleme tamamlandı'
      },
      15 // OCR için yüksek öncelik
    );

    console.log('OCR işlemi queue\'ya eklendi:', queueItem._id);

    return res.status(201).json({ 
      message: 'Fatura resmi yüklendi, AI işleme başladı',
      bill: {
        id: bill._id,
        market_adi: bill.market_adi,
        tarih: bill.tarih,
        urunler: bill.urunler,
        toplam_tutar: bill.toplam_tutar,
        imageUrl: bill.imageUrl
      },
      queueId: queueItem._id,
      status: 'processing',
      message_detail: 'Resim başarıyla yüklendi. Yapay zeka faturayı analiz ediyor...'
    });

  } catch (error: any) {
    console.error('Upload bill error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Fatura yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
