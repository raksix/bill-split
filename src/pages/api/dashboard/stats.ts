import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Bill from '@/models/bill.model';
import Transaction from '@/models/transaction.model';
import User from '@/models/user.model';
import mongoose from 'mongoose';

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

    // Paralel olarak tüm istatistikleri al
    const [
      userBills,
      userTransactions,
      totalOwed,
      totalOwing,
      recentBills,
      monthlyStats
    ] = await Promise.all([
      // Kullanıcının faturaları
      Bill.find({ userId }).sort({ createdAt: -1 }),
      
      // Kullanıcının tüm transaction'ları
      Transaction.find({
        $or: [
          { fromUser: userId },
          { toUser: userId }
        ]
      }).populate('fromUser toUser', 'name email').sort({ createdAt: -1 }),
      
      // Kullanıcıya borçlu olanlar (toUser = userId, isPaid = false)
      Transaction.aggregate([
        {
          $match: {
            toUser: new mongoose.Types.ObjectId(userId),
            isPaid: false
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Kullanıcının borçları (fromUser = userId, isPaid = false)
      Transaction.aggregate([
        {
          $match: {
            fromUser: new mongoose.Types.ObjectId(userId),
            isPaid: false
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Son 5 fatura
      Bill.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('market_adi toplam_tutar createdAt imageUrl'),
      
      // Bu ay yapılan harcamalar
      Bill.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: {
              day: { $dayOfMonth: '$createdAt' }
            },
            totalAmount: { $sum: '$toplam_tutar' },
            billCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.day': 1 }
        }
      ])
    ]);

    // En çok harcama yapılan marketler
    const topMarkets = await Bill.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          market_adi: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$market_adi',
          totalAmount: { $sum: '$toplam_tutar' },
          billCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Haftalık harcama trendi
    const weeklyTrend = await Bill.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
          }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalAmount: { $sum: '$toplam_tutar' },
          billCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 }
      }
    ]);

    // Borçlu-alacaklı özeti
    const debtSummary = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { fromUser: new mongoose.Types.ObjectId(userId) },
            { toUser: new mongoose.Types.ObjectId(userId) }
          ],
          isPaid: false
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'fromUser',
          foreignField: '_id',
          as: 'fromUserInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'toUser',
          foreignField: '_id',
          as: 'toUserInfo'
        }
      },
      {
        $group: {
          _id: {
            otherUserId: {
              $cond: [
                { $eq: ['$fromUser', new mongoose.Types.ObjectId(userId)] },
                '$toUser',
                '$fromUser'
              ]
            }
          },
          owedToMe: {
            $sum: {
              $cond: [
                { $eq: ['$toUser', new mongoose.Types.ObjectId(userId)] },
                '$amount',
                0
              ]
            }
          },
          iOwe: {
            $sum: {
              $cond: [
                { $eq: ['$fromUser', new mongoose.Types.ObjectId(userId)] },
                '$amount',
                0
              ]
            }
          },
          otherUserInfo: { $first: {
            $cond: [
              { $eq: ['$fromUser', new mongoose.Types.ObjectId(userId)] },
              { $arrayElemAt: ['$toUserInfo', 0] },
              { $arrayElemAt: ['$fromUserInfo', 0] }
            ]
          }}
        }
      }
    ]);

    // Sonuçları formatla
    const stats = {
      overview: {
        totalBills: userBills.length,
        totalSpent: userBills.reduce((sum, bill) => sum + (bill.toplam_tutar || 0), 0),
        totalOwedToMe: totalOwed[0]?.total || 0,
        totalIOwe: totalOwing[0]?.total || 0,
        netBalance: (totalOwed[0]?.total || 0) - (totalOwing[0]?.total || 0)
      },
      
      recentActivity: {
        recentBills: recentBills.map(bill => ({
          id: bill._id,
          market: bill.market_adi || 'Bilinmeyen Market',
          amount: bill.toplam_tutar || 0,
          date: bill.createdAt,
          imageUrl: bill.imageUrl
        })),
        
        recentTransactions: userTransactions
          .slice(0, 5)
          .map((transaction: any) => ({
            id: transaction._id,
            type: transaction.fromUser._id.toString() === userId ? 'debt' : 'credit',
            amount: transaction.amount,
            isPaid: transaction.isPaid,
            otherUser: transaction.fromUser._id.toString() === userId 
              ? transaction.toUser?.name || 'Bilinmeyen'
              : transaction.fromUser?.name || 'Bilinmeyen',
            createdAt: transaction.createdAt
          }))
      },
      
      analytics: {
        topMarkets: topMarkets.map(market => ({
          name: market._id,
          totalAmount: market.totalAmount,
          billCount: market.billCount,
          averageAmount: market.totalAmount / market.billCount
        })),
        
        monthlySpending: monthlyStats.map(stat => ({
          day: stat._id.day,
          amount: stat.totalAmount,
          billCount: stat.billCount
        })),
        
        weeklyTrend: weeklyTrend.map(week => ({
          week: week._id.week,
          year: week._id.year,
          amount: week.totalAmount,
          billCount: week.billCount
        }))
      },
      
      debts: {
        summary: debtSummary.map(debt => ({
          userId: debt._id.otherUserId,
          userName: debt.otherUserInfo?.name || 'Bilinmeyen Kullanıcı',
          owedToMe: debt.owedToMe,
          iOwe: debt.iOwe,
          netBalance: debt.owedToMe - debt.iOwe
        })),
        
        totalOwedToMe: totalOwed[0]?.total || 0,
        totalIOwe: totalOwing[0]?.total || 0
      }
    };

    return res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Dashboard stats API error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    return res.status(500).json({
      message: 'İstatistikler alınırken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}