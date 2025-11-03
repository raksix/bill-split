import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import ProcessingQueue from '@/models/processing-queue.model';
import Bill from '@/models/bill.model';

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

    const { billId, queueId } = req.query;

    if (!billId && !queueId) {
      return res.status(400).json({ message: 'Bill ID veya Queue ID gerekli' });
    }

    await connectToDatabase();

    let queueItem;
    let bill;

    if (queueId) {
      // Queue ID ile arama
      queueItem = await ProcessingQueue.findOne({
        _id: queueId,
        userId: userId
      });
    } else if (billId) {
      // Bill ID ile arama
      queueItem = await ProcessingQueue.findOne({
        'data.billId': billId,
        userId: userId
      }).sort({ createdAt: -1 }); // En son queue item'ı al
    }

    if (!queueItem) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }

    // Bill bilgisini al
    if (queueItem.data.billId) {
      bill = await Bill.findById(queueItem.data.billId);
    }

    // Status bilgilerini hazırla
    const statusInfo = {
      queueId: queueItem._id,
      billId: queueItem.data.billId,
      status: queueItem.status,
      type: queueItem.type,
      progress: {
        percentage: queueItem.data.progressPercentage || 0,
        step: queueItem.data.processingStep || 'Bekliyor...',
        currentStep: getCurrentStepInfo(queueItem.status, queueItem.type)
      },
      attempts: queueItem.attempts,
      maxAttempts: queueItem.maxAttempts,
      createdAt: queueItem.createdAt,
      processedAt: queueItem.processedAt,
      completedAt: queueItem.completedAt,
      error: queueItem.data.errorMessage,
      bill: bill ? {
        id: bill._id,
        market_adi: bill.market_adi,
        tarih: bill.tarih,
        toplam_tutar: bill.toplam_tutar,
        urunler_count: bill.urunler.length,
        imageUrl: bill.imageUrl
      } : null
    };

    return res.status(200).json({
      success: true,
      data: statusInfo
    });

  } catch (error: any) {
    console.error('Bill status API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Durum bilgisi alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Mevcut adım bilgisini al
 */
function getCurrentStepInfo(status: string, type: string) {
  const steps = {
    bill_upload: {
      pending: { step: 1, total: 3, title: 'Bekliyor' },
      uploading: { step: 1, total: 3, title: 'CDN\'e Yükleniyor' },
      uploaded: { step: 2, total: 3, title: 'Yüklendi' },
      processing: { step: 2, total: 3, title: 'İşleniyor' },
      completed: { step: 3, total: 3, title: 'Tamamlandı' },
      failed: { step: 0, total: 3, title: 'Başarısız' }
    },
    bill_ocr: {
      pending: { step: 1, total: 4, title: 'Bekliyor' },
      uploading: { step: 1, total: 4, title: 'Hazırlanıyor' },
      uploaded: { step: 2, total: 4, title: 'Resim Hazır' },
      processing: { step: 3, total: 4, title: 'AI Analizi' },
      completed: { step: 4, total: 4, title: 'Analiz Tamamlandı' },
      failed: { step: 0, total: 4, title: 'Analiz Başarısız' }
    },
    image_upload: {
      pending: { step: 1, total: 2, title: 'Bekliyor' },
      uploading: { step: 1, total: 2, title: 'Yükleniyor' },
      uploaded: { step: 2, total: 2, title: 'Yüklendi' },
      processing: { step: 2, total: 2, title: 'İşleniyor' },
      completed: { step: 2, total: 2, title: 'Tamamlandı' },
      failed: { step: 0, total: 2, title: 'Başarısız' }
    }
  };

  return steps[type as keyof typeof steps]?.[status as keyof typeof steps.bill_upload] || 
         { step: 0, total: 1, title: 'Bilinmeyen' };
}