import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
// Local/dev ortamında 1 yıl, prod'da 7 gün; env ile override edilebilir
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || (process.env.NODE_ENV !== 'production' ? '365d' : '7d');

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const getUserFromRequest = (req: NextApiRequest): TokenPayload | null => {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  return verifyToken(token);
};
