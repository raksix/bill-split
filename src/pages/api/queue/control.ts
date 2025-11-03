import { NextApiRequest, NextApiResponse } from 'next';
import QueueProcessor from '@/lib/queue-processor';

// Queue processor otomatik başlatma
let processorStarted = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    if (action === 'start') {
      if (!processorStarted) {
        await QueueProcessor.startProcessor();
        processorStarted = true;
        
        return res.status(200).json({
          success: true,
          message: 'Queue processor başlatıldı'
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Queue processor zaten çalışıyor'
        });
      }
    }

    if (action === 'stop') {
      QueueProcessor.stopProcessor();
      processorStarted = false;
      
      return res.status(200).json({
        success: true,
        message: 'Queue processor durduruldu'
      });
    }

    return res.status(400).json({
      message: 'Geçersiz action. start veya stop kullanın.'
    });

  } catch (error: any) {
    console.error('Queue control API error:', error);
    
    return res.status(500).json({
      message: 'Queue kontrol hatası',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Sunucu başladığında processor'ı otomatik başlat
if (process.env.NODE_ENV === 'production' && !processorStarted) {
  QueueProcessor.startProcessor()
    .then(() => {
      processorStarted = true;
      console.log('✅ Queue processor otomatik başlatıldı');
    })
    .catch((error) => {
      console.error('❌ Queue processor başlatma hatası:', error);
    });
}