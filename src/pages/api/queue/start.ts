import { NextApiRequest, NextApiResponse } from 'next';
import QueueProcessor from '@/lib/queue-processor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Queue processor başlatılıyor...');
    
    // Queue processor'ı başlat
    await QueueProcessor.startProcessor();
    
    // Queue durumunu al
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}