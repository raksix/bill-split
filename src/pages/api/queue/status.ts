import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import QueueProcessor from '@/lib/queue-processor';

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

    // Queue durumunu al
    const queueStatus = await QueueProcessor.getQueueStatus();

    return res.status(200).json({
      success: true,
      status: queueStatus,
      message: 'Queue durumu başarıyla alındı'
    });

  } catch (error: any) {
    console.error('Queue status API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'Queue durumu alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}