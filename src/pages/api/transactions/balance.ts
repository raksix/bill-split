import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Transaction from '@/models/transaction.model';
import '@/models/bill.model'; // Schema'yı register etmek için import

type TransactionUserKey = 'toUser' | 'fromUser';
type BasicUser = {
  _id?: unknown;
  name?: string;
  username?: string;
};

type BalanceTransaction = {
  _id?: unknown;
  amount: number;
  toUser?: unknown;
  fromUser?: unknown;
};

type GroupedTransactions = Record<
  string,
  {
    user: BasicUser;
    totalAmount: number;
    transactions: BalanceTransaction[];
  }
>;

const toObjectIdString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'object') {
    const candidate = value as { toString?: () => string };
    if (typeof candidate.toString === 'function') {
      return candidate.toString();
    }
  }

  return null;
};

const buildPlaceholderUser = (userId: string, placeholderName: string): BasicUser => ({
  _id: userId,
  name: placeholderName,
  username: 'unknown',
});

const isBasicUser = (value: unknown): value is BasicUser => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return '_id' in value || 'name' in value || 'username' in value;
};

const normalizeUserReference = (
  userRef: unknown,
  placeholderName: string
) => {
  if (userRef === null || userRef === undefined) {
    return { userId: null, user: null };
  }

  if (typeof userRef === 'string') {
    return {
      userId: userRef,
      user: buildPlaceholderUser(userRef, placeholderName),
    };
  }

  if (isBasicUser(userRef)) {
    const normalizedId = toObjectIdString(userRef._id ?? null);
    if (!normalizedId) {
      return { userId: null, user: null };
    }
    return {
      userId: normalizedId,
      user: userRef,
    };
  }

  const fallbackId = toObjectIdString(userRef);
  if (!fallbackId) {
    return { userId: null, user: null };
  }

  return {
    userId: fallbackId,
    user: buildPlaceholderUser(fallbackId, placeholderName),
  };
};

const logTransactionWarning = (
  message: string,
  key: TransactionUserKey,
  transaction: BalanceTransaction
) => {
  const transactionId = toObjectIdString(transaction._id ?? null) ?? 'unknown';
  console.warn(`Balance API: ${message}`, { key, transactionId });
};

const groupTransactionsByUser = (
  transactions: BalanceTransaction[],
  key: TransactionUserKey,
  placeholderName: string
): GroupedTransactions => {
  return transactions.reduce<GroupedTransactions>((acc, transaction) => {
    const { userId, user } = normalizeUserReference(transaction[key], placeholderName);

    if (!userId) {
      logTransactionWarning('Kullanıcı ID alınamadı, işlem atlandı', key, transaction);
      return acc;
    }

    if (!acc[userId]) {
      acc[userId] = {
        user: user ?? buildPlaceholderUser(userId, placeholderName),
        totalAmount: 0,
        transactions: [],
      };
    } else if (user) {
      acc[userId].user = user;
    }

    acc[userId].totalAmount += transaction.amount;
    acc[userId].transactions.push(transaction);
    return acc;
  }, {});
};


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

    // Get all unpaid transactions for the user
    const [debts, credits] = await Promise.all([
      // Unpaid debts (user owes money to others)
      Transaction.find({
        fromUser: userId,
        isPaid: false,
      })
        .populate('toUser', 'name username')
        .populate('billId', 'market_adi tarih toplam_tutar')
        .sort({ createdAt: -1 }),

      // Unpaid credits (others owe money to user)  
      Transaction.find({
        toUser: userId,
        isPaid: false,
      })
        .populate('fromUser', 'name username')
        .populate('billId', 'market_adi tarih toplam_tutar')
        .sort({ createdAt: -1 })
    ]);

    // Calculate totals
    const totalDebt = debts.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCredit = credits.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Group debts/credits by person with null-safe guards
    const debtsByPerson = groupTransactionsByUser(debts, 'toUser', 'Bilinmeyen alacaklı');
    const creditsByPerson = groupTransactionsByUser(credits, 'fromUser', 'Bilinmeyen borçlu');

    return res.status(200).json({
      totalDebt,
      totalCredit,
      debts: Object.values(debtsByPerson),
      credits: Object.values(creditsByPerson),
    });

  } catch (error: unknown) {
    console.error('Balance API error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    const errorMessage = error instanceof Error ? error.message : undefined;

    return res.status(500).json({
      message: 'Sunucu hatası',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
