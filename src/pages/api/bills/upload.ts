import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Bill from '@/models/bill.model';
import { processReceiptImage } from '@/lib/gemini';
import { uploadToRakCDN } from '@/lib/rakcdn';

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

    // ADIM 1: CDN'e yükleme
    const uploadResult = await uploadToRakCDN(imageBuffer, `bill_${userId}_${Date.now()}.png`);
    if (!uploadResult.success || !uploadResult.url) {
      return res.status(500).json({
        message: 'Resim yüklenemedi',
        error: uploadResult.error
      });
    }

    // ADIM 2: OCR işlemi
    const ocrResult = await processReceiptImage(base64Data);

    // Tarih formatını normalize et
    const normalizedDate = (() => {
      try {
        if (!ocrResult.tarih) return new Date();
        if (ocrResult.tarih.includes('.')) {
          const [day, month, year] = ocrResult.tarih.split('.').map(part => parseInt(part, 10));
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month - 1, day);
          }
        }
        const parsed = new Date(ocrResult.tarih);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch (err) {
        console.warn('Tarih parse edilemedi, bugün atanacak:', err);
      }
      return new Date();
    })();

    const toNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      return 0;
    };

    const formattedProducts = (Array.isArray(ocrResult.urunler) ? ocrResult.urunler : []).map((item, index) => {
      const normalizedItem = item as Record<string, unknown>;

      const nameCandidates = [
        normalizedItem['urun_adi'],
        normalizedItem['urunAdi'],
        normalizedItem['ad'],
        normalizedItem['name'],
        normalizedItem['product_name'],
        normalizedItem['productName'],
        normalizedItem['isim'],
        normalizedItem['title'],
        normalizedItem['description'],
      ];

      const productName = nameCandidates.find(
        (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
      )?.trim() || `Ürün ${index + 1}`;

      const quantityRaw = normalizedItem['miktar'] ?? normalizedItem['quantity'] ?? 1;
      const quantity = Math.max(1, Math.round(toNumber(quantityRaw)) || 1);

      const totalRaw =
        normalizedItem['toplam'] ??
        normalizedItem['total'] ??
        normalizedItem['toplam_tutar'] ??
        normalizedItem['totalPrice'] ??
        normalizedItem['total_price'] ??
        normalizedItem['fiyat'] ??
        normalizedItem['price'];
      const unitRaw =
        normalizedItem['fiyat'] ??
        normalizedItem['price'] ??
        normalizedItem['birim_fiyat'] ??
        normalizedItem['unitPrice'];

      const totalPrice = toNumber(totalRaw);
      const unitPrice = toNumber(unitRaw) || (quantity ? totalPrice / quantity : 0);
      const resolvedTotal = totalPrice || unitPrice * quantity;

      return {
        ad: productName,
        urun_adi: productName,
        fiyat: Number(unitPrice.toFixed(2)),
        miktar: quantity,
        birim: (typeof normalizedItem['birim'] === 'string' && (normalizedItem['birim'] as string).trim()) ||
          (typeof normalizedItem['unit'] === 'string' && (normalizedItem['unit'] as string).trim()) ||
          'adet',
        toplam: Number(resolvedTotal.toFixed(2)),
      };
    });

    const totalAmount = Number(ocrResult.toplam_tutar) || formattedProducts.reduce((sum, product) => sum + product.toplam!, 0);

    const bill = await Bill.create({
      uploadedBy: userId,
      userId,
      participants: [userId],
      market_adi: ocrResult.market_adi || 'Fatura',
      tarih: normalizedDate,
      urunler: formattedProducts,
      toplam_tutar: totalAmount,
      imageUrl: uploadResult.url,
      isManual: false
    });

    return res.status(201).json({
      message: 'Fatura başarıyla işlendi',
      bill: {
        id: bill._id,
        market_adi: bill.market_adi,
        tarih: bill.tarih,
        urunler: bill.urunler,
        toplam_tutar: bill.toplam_tutar,
        imageUrl: bill.imageUrl,
        participants: bill.participants,
        uploadedBy: bill.uploadedBy
      }
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
