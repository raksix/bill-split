import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

if (!API_KEY) {
  console.warn('GEMINI_API_KEY tanımlanmamış. OCR özellikleri çalışmayacak.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export interface OCRResult {
  market_adi: string;
  tarih: string;
  urunler: {
    urun_adi: string;
    fiyat: number;
  }[];
  toplam_tutar: number;
}

export async function processReceiptImage(imageBase64: string): Promise<OCRResult> {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API Key tanımlanmamış');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `
Bu fatura/fiş görselini analiz et ve aşağıdaki JSON formatında döndür.
Eğer bir alan okunamazsa veya yoksa, varsayılan değerleri kullan.

Hocam ürün fiyatları yaparken fişin alt kısmında Ürün İndirimleri var onları da dikkate kat!

{
  "market_adi": "Market adı (yoksa 'Bilinmeyen Market')",
  "tarih": "GG.AA.YYYY formatında tarih (yoksa bugünün tarihi)",
  "urunler": [
    { "urun_adi": "Ürün adı", "fiyat": 0.00 }
  ],
  "toplam_tutar": 0.00
}

Sadece JSON formatında yanıt ver, başka açıklama ekleme.
Tüm fiyatları sayı olarak ver (string değil).
`;

    const imageParts = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg',
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini API JSON formatında yanıt döndürmedi');
    }

    const parsedResult: OCRResult = JSON.parse(jsonMatch[0]);

    if (!parsedResult.tarih) {
      const today = new Date();
      parsedResult.tarih = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    }

    if (!parsedResult.market_adi) {
      parsedResult.market_adi = 'Bilinmeyen Market';
    }

    if (!parsedResult.urunler || parsedResult.urunler.length === 0) {
      parsedResult.urunler = [{ urun_adi: 'Ürün', fiyat: parsedResult.toplam_tutar || 0 }];
    }

    if (!parsedResult.toplam_tutar) {
      parsedResult.toplam_tutar = parsedResult.urunler.reduce((sum, item) => sum + item.fiyat, 0);
    }

    return parsedResult;
  } catch (error) {
    console.error('Gemini OCR error:', error);
    throw new Error('Fatura işlenirken hata oluştu');
  }
}
