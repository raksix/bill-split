import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import Bill from '@/models/bill.model';

interface ManualBillRequest {
  market_adi: string;
  tarih: string;
  toplam_tutar: number;
  description?: string;
  urunler?: Array<{
    ad: string;
    fiyat: number;
    miktar?: number;
    birim?: string;
  }>;
}

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

    const { 
      market_adi, 
      tarih, 
      toplam_tutar, 
      description, 
      urunler = [] 
    }: ManualBillRequest = req.body;

    // Validation
    if (!market_adi || !tarih || !toplam_tutar) {
      return res.status(400).json({ 
        message: 'Market adı, tarih ve toplam tutar gerekli' 
      });
    }

    if (toplam_tutar <= 0) {
      return res.status(400).json({ 
        message: 'Toplam tutar 0\'dan büyük olmalı' 
      });
    }

    // Tarih validation
    const billDate = new Date(tarih);
    if (isNaN(billDate.getTime())) {
      return res.status(400).json({ 
        message: 'Geçersiz tarih formatı' 
      });
    }

    // Ürün listesi validation
    if (urunler.length > 0) {
      const invalidProducts = urunler.filter(
        product => !product.ad || !product.fiyat || product.fiyat <= 0
      );
      
      if (invalidProducts.length > 0) {
        return res.status(400).json({ 
          message: 'Ürün adı ve fiyatı gerekli, fiyat 0\'dan büyük olmalı' 
        });
      }

      // Ürün toplam kontrolü
      const productsTotal = urunler.reduce((sum, product) => {
        const quantity = product.miktar || 1;
        return sum + (product.fiyat * quantity);
      }, 0);

      // %10 tolerans ile kontrol
      const tolerance = Math.abs(productsTotal - toplam_tutar);
      const tolerancePercentage = (tolerance / toplam_tutar) * 100;

      if (tolerancePercentage > 10) {
        return res.status(400).json({ 
          message: `Ürün toplamı (₺${productsTotal.toFixed(2)}) ile genel toplam (₺${toplam_tutar.toFixed(2)}) arasında büyük fark var` 
        });
      }
    }

    await connectToDatabase();

    // Format products - diğer API'lerle uyumlu olması için urun_adi kullan
    const formattedProducts = urunler.map(product => ({
      urun_adi: product.ad.trim(), // urun_adi formatına çevir
      fiyat: Number(product.fiyat),
      miktar: product.miktar || 1,
      birim: product.birim || 'adet',
      toplam: Number(product.fiyat) * (product.miktar || 1),
      isPersonal: false // Manuel eklenen ürünler varsayılan olarak paylaşılan
    }));

    // Manuel fatura oluştur
    const newBill = new Bill({
      userId,
      uploadedBy: userId,
      participants: [userId],
      market_adi: market_adi.trim(),
      tarih: billDate,
      toplam_tutar: Number(toplam_tutar),
      urunler: formattedProducts,
      description: description?.trim(),
      isManual: true, // Manuel eklenen fatura
      imageUrl: null // Manuel faturalarda resim yok
    });

    await newBill.save();

    console.log(`✅ Manuel fatura oluşturuldu: ${market_adi} - ₺${toplam_tutar}`);

    return res.status(201).json({
      success: true,
      message: 'Manuel fatura başarıyla eklendi',
      data: {
        billId: newBill._id,
        market_adi: newBill.market_adi,
        tarih: newBill.tarih,
        toplam_tutar: newBill.toplam_tutar,
        urunler: newBill.urunler,
        description: newBill.description,
        isManual: true,
        uploadedBy: {
          _id: newBill.uploadedBy,
          name: 'Siz',
        }
      }
    });

  } catch (error: any) {
    console.error('Manual bill creation error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token' });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({ 
        message: 'Validation hatası',
        errors: validationErrors
      });
    }

    return res.status(500).json({
      message: 'Fatura oluşturulurken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}