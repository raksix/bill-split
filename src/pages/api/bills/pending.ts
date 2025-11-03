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

    await connectToDatabase();

    // Kullanıcının aktif işlemlerini al
    const activeJobs = await ProcessingQueue.find({
      userId,
      status: { $in: ['pending', 'uploading', 'uploaded', 'processing'] }
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10);

    // Son tamamlanan işlemleri al
    const completedJobs = await ProcessingQueue.find({
      userId,
      status: { $in: ['completed', 'failed'] }
    })
    .sort({ completedAt: -1 })
    .limit(5);

    // Bill bilgilerini toplu al
    const billIds = [...activeJobs, ...completedJobs]
      .map(job => job.data.billId)
      .filter(Boolean);

    const bills = await Bill.find({
      _id: { $in: billIds }
    });

    const billsMap = bills.reduce((acc: any, bill: any) => {
      acc[bill._id.toString()] = bill;
      return acc;
    }, {});

    // Active jobs'ları formatla
    const formattedActiveJobs = activeJobs.map(job => ({
      queueId: job._id,
      billId: job.data.billId,
      type: job.type,
      status: job.status,
      progress: {
        percentage: job.data.progressPercentage || 0,
        step: job.data.processingStep || 'Bekliyor...',
        currentStep: getCurrentStepInfo(job.status, job.type)
      },
      createdAt: job.createdAt,
      processedAt: job.processedAt,
      attempts: job.attempts,
      bill: job.data.billId && billsMap[job.data.billId] ? {
        id: billsMap[job.data.billId]._id,
        market_adi: billsMap[job.data.billId].market_adi,
        imageUrl: billsMap[job.data.billId].imageUrl,
        toplam_tutar: billsMap[job.data.billId].toplam_tutar
      } : null,
      estimatedTime: getEstimatedTime(job.type, job.status)
    }));

    // Completed jobs'ları formatla
    const formattedCompletedJobs = completedJobs.map(job => ({
      queueId: job._id,
      billId: job.data.billId,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.data.errorMessage,
      bill: job.data.billId && billsMap[job.data.billId] ? {
        id: billsMap[job.data.billId]._id,
        market_adi: billsMap[job.data.billId].market_adi,
        imageUrl: billsMap[job.data.billId].imageUrl,
        toplam_tutar: billsMap[job.data.billId].toplam_tutar
      } : null
    }));

    // Özet istatistikler
    const summary = {
      activeCount: activeJobs.length,
      pendingCount: activeJobs.filter(job => job.status === 'pending').length,
      processingCount: activeJobs.filter(job => job.status === 'processing').length,
      completedToday: completedJobs.filter(job => 
        job.completedAt && 
        new Date(job.completedAt).toDateString() === new Date().toDateString()
      ).length,
      failedToday: completedJobs.filter(job => 
        job.status === 'failed' &&
        job.updatedAt && 
        new Date(job.updatedAt).toDateString() === new Date().toDateString()
      ).length
    };

    return res.status(200).json({
      success: true,
      data: {
        active: formattedActiveJobs,
        completed: formattedCompletedJobs,
        summary
      }
    });

  } catch (error: any) {
    console.error('Pending jobs API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Bekleyen işlemler alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Adım bilgisini al
 */
function getCurrentStepInfo(status: string, type: string) {
  const steps = {
    bill_ocr: {
      pending: { step: 1, total: 4, title: 'Sırada Bekliyor' },
      uploading: { step: 1, total: 4, title: 'Hazırlanıyor' },
      uploaded: { step: 2, total: 4, title: 'Resim Hazır' },
      processing: { step: 3, total: 4, title: 'AI Analizi Yapılıyor' },
      completed: { step: 4, total: 4, title: 'Analiz Tamamlandı' },
      failed: { step: 0, total: 4, title: 'Analiz Başarısız' }
    },
    bill_upload: {
      pending: { step: 1, total: 3, title: 'Sırada Bekliyor' },
      uploading: { step: 1, total: 3, title: 'CDN\'e Yükleniyor' },
      uploaded: { step: 2, total: 3, title: 'Yüklendi' },
      processing: { step: 2, total: 3, title: 'İşleniyor' },
      completed: { step: 3, total: 3, title: 'Tamamlandı' },
      failed: { step: 0, total: 3, title: 'Başarısız' }
    },
    image_upload: {
      pending: { step: 1, total: 2, title: 'Bekliyor' },
      uploading: { step: 1, total: 2, title: 'Yükleniyor' },
      uploaded: { step: 2, total: 2, title: 'Tamamlandı' },
      processing: { step: 2, total: 2, title: 'İşleniyor' },
      completed: { step: 2, total: 2, title: 'Tamamlandı' },
      failed: { step: 0, total: 2, title: 'Başarısız' }
    }
  };

  return steps[type as keyof typeof steps]?.[status as keyof typeof steps.bill_ocr] || 
         { step: 0, total: 1, title: 'Bilinmeyen' };
}

/**
 * Tahmini süre hesapla
 */
function getEstimatedTime(type: string, status: string): string {
  const estimates = {
    bill_ocr: {
      pending: '~2-3 dakika',
      uploading: '~1-2 dakika', 
      uploaded: '~1-2 dakika',
      processing: '~30-60 saniye'
    },
    bill_upload: {
      pending: '~1-2 dakika',
      uploading: '~30 saniye',
      uploaded: 'Tamamlandı',
      processing: '~30 saniye'
    },
    image_upload: {
      pending: '~30 saniye',
      uploading: '~15 saniye',
      uploaded: 'Tamamlandı',
      processing: '~15 saniye'
    }
  };

  return estimates[type as keyof typeof estimates]?.[status as keyof typeof estimates.bill_ocr] || 
         'Belirsiz';
}