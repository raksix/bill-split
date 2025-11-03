import { NextApiRequest, NextApiResponse } from 'next';
import QueueProcessor from '@/lib/queue-processor';

// Global queue processor instance
let queueProcessorInstance: any = null;
let isProcessorRunning = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Start queue processor
    try {
      if (isProcessorRunning) {
        return res.status(200).json({
          success: true,
          message: 'Queue processor zaten çalışıyor',
          status: await QueueProcessor.getQueueStatus()
        });
      }

      console.log('🚀 Starting queue processor...');
      await QueueProcessor.startProcessor();
      isProcessorRunning = true;
      
      const status = await QueueProcessor.getQueueStatus();
      
      return res.status(200).json({
        success: true,
        message: 'Queue processor başlatıldı',
        status
      });

    } catch (error: any) {
      console.error('Queue start error:', error);
      return res.status(500).json({
        success: false,
        message: 'Queue processor başlatılamadı',
        error: error.message
      });
    }

  } else if (req.method === 'GET') {
    // Get queue status
    try {
      const status = await QueueProcessor.getQueueStatus();
      
      return res.status(200).json({
        success: true,
        isRunning: isProcessorRunning,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Queue status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Queue durumu alınamadı',
        error: error.message
      });
    }

  } else if (req.method === 'DELETE') {
    // Stop queue processor
    try {
      if (!isProcessorRunning) {
        return res.status(200).json({
          success: true,
          message: 'Queue processor zaten durmuş',
        });
      }

      console.log('🛑 Stopping queue processor...');
      QueueProcessor.stopProcessor();
      isProcessorRunning = false;
      
      return res.status(200).json({
        success: true,
        message: 'Queue processor durduruldu'
      });

    } catch (error: any) {
      console.error('Queue stop error:', error);
      return res.status(500).json({
        success: false,
        message: 'Queue processor durdurulamadı',
        error: error.message
      });
    }

  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Auto-start queue processor on server start
if (typeof window === 'undefined' && !isProcessorRunning) {
  setTimeout(async () => {
    try {
      console.log('🔄 Auto-starting queue processor...');
      await QueueProcessor.startProcessor();
      isProcessorRunning = true;
      console.log('✅ Queue processor auto-started');
    } catch (error: any) {
      console.error('❌ Queue processor auto-start failed:', error.message);
    }
  }, 3000); // 3 saniye bekle
}