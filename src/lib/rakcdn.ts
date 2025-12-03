/**
 * RakCDN Uploader Service
 * Fatura resimlerini RakCDN'e yüklemek için kullanılır
 */

import axios from 'axios';
import FormData from 'form-data';

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * RakCDN'e resim yükleme fonksiyonu
 * @param buffer - Yüklenecek resim buffer'ı
 * @param filename - Dosya adı (opsiyonel)
 * @param contentType - MIME type (opsiyonel)
 * @returns Promise<UploadResult>
 */
export async function uploadToRakCDN(buffer: Buffer, filename?: string, contentType?: string): Promise<UploadResult> {
  try {
    // Content type belirleme
    const mimeType = contentType || 'image/jpeg';
    const finalFilename = filename || `bill_${Date.now()}.jpg`;

    console.log('RakCDN\'e yükleme başlatılıyor:', { 
      size: buffer.length, 
      filename: finalFilename,
      contentType: mimeType
    });

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: finalFilename,
      contentType: mimeType
    });

    const response = await axios({
      url: 'https://cdnapi.turkmanga.live/image/upload',
      method: 'POST',
      headers: {
        'Authorization': 'DFJEWFWEFAWEYFGYAEWF@SDFSDGWEYQWWEQ126321E1321WQSADQDQD',
        ...formData.getHeaders()
      },
      data: formData,
      maxBodyLength: Infinity,
      timeout: 60000 // 60 saniye timeout
    });

    if (response.data.error) {
      console.error('RakCDN yükleme hatası:', response.data);
      return {
        success: false,
        error: 'CDN yükleme başarısız'
      };
    }

    if (!response.data.data || !response.data.data._id) {
      console.error('RakCDN response ID eksik:', response.data);
      return {
        success: false,
        error: 'CDN response geçersiz'
      };
    }

    const imageUrl = `https://cdnapi.turkmanga.live/image/${response.data.data._id}`;
    
    console.log('RakCDN yükleme başarılı:', imageUrl);
    
    return {
      success: true,
      url: imageUrl
    };

  } catch (error: any) {
    console.error('RakCDN yükleme hatası:', error.message);
    
    return {
      success: false,
      error: error.message || 'CDN yükleme başarısız'
    };
  }
}

/**
 * Çoklu resim yükleme
 * @param buffers - Yüklenecek resim buffer'ları
 * @param prefix - Dosya adı prefix'i
 * @returns Promise<string[]> - Yüklenen resimlerin URL'leri
 */
export async function uploadMultipleToRakCDN(
  buffers: Buffer[], 
  prefix = 'bill'
): Promise<string[]> {
  console.log(`${buffers.length} resim toplu yükleme başlatılıyor...`);
  
  const uploadPromises = buffers.map(async (buffer, index) => {
    // Her resim arasında kısa bekleme süresi
    await new Promise(resolve => setTimeout(resolve, index * 1000));
    
    const result = await uploadToRakCDN(buffer, `${prefix}_${index}_${Date.now()}.png`);
    return result.success ? result.url! : null;
  });

  const results = await Promise.all(uploadPromises);
  const successfulUploads = results.filter(url => url !== null) as string[];
  
  console.log(`${successfulUploads.length}/${buffers.length} resim başarıyla yüklendi`);
  
  return successfulUploads;
}

/**
 * Fatura için özel yükleme fonksiyonu
 * @param buffer - Fatura resim buffer'ı
 * @param billId - Fatura ID'si
 * @param userId - Kullanıcı ID'si
 * @returns Promise<UploadResult>
 */
export async function uploadBillToRakCDN(
  buffer: Buffer, 
  billId: string, 
  userId: string
): Promise<UploadResult> {
  const filename = `bill_${userId}_${billId}_${Date.now()}.png`;
  return uploadToRakCDN(buffer, filename);
}

export default {
  uploadToRakCDN,
  uploadMultipleToRakCDN,
  uploadBillToRakCDN
};