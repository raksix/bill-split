/**
 * Queue Processing Service
 * Fatura yükleme ve işleme queue'larını yönetir
 */

import { connectToDatabase } from '@/lib/mongodb';
import ProcessingQueue, { IProcessingQueue } from '@/models/processing-queue.model';
import Bill from '@/models/bill.model';
import { uploadBillToRakCDN } from '@/lib/rakcdn';
import fs from 'fs';
import path from 'path';

class QueueProcessor {
  private isProcessing = false;
  private readonly processingInterval = 5000; // 5 saniye

  /**
   * Queue'ya yeni işlem ekle
   */
  static async addToQueue(
    type: 'bill_upload' | 'bill_ocr' | 'image_upload',
    userId: string,
    data: any,
    priority = 0
  ): Promise<IProcessingQueue> {
    await connectToDatabase();

    const queueItem = new ProcessingQueue({
      type,
      userId,
      data,
      priority,
      status: 'pending'
    });

    await queueItem.save();
    
    console.log(`Queue'ya eklendi: ${type} - User: ${userId} - Priority: ${priority}`);
    
    return queueItem;
  }

  /**
   * Bekleyen işlemleri al
   */
  static async getPendingJobs(limit = 5): Promise<IProcessingQueue[]> {
    await connectToDatabase();

    return ProcessingQueue.find({
      status: 'pending',
      attempts: { $lt: 3 } // Maksimum 3 deneme
    })
    .sort({ priority: -1, createdAt: 1 }) // Öncelik ve tarih sıralı
    .limit(limit);
  }

  /**
   * Fatura yükleme işlemi
   */
  static async processBillUpload(job: IProcessingQueue): Promise<boolean> {
    try {
      const { billId, imagePath, filename } = job.data;

      if (!billId || !imagePath) {
        throw new Error('Bill ID veya image path eksik');
      }

      // Fatura bilgisini al
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new Error('Fatura bulunamadı');
      }

      // Resim dosyasını oku
      const fullPath = path.resolve(imagePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error('Resim dosyası bulunamadı');
      }

      const imageBuffer = fs.readFileSync(fullPath);
      
      // RakCDN'e yükle
      const uploadResult = await uploadBillToRakCDN(
        imageBuffer, 
        billId, 
        job.userId.toString()
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'CDN yükleme başarısız');
      }

      // Fatura modelini güncelle
      bill.imageUrl = uploadResult.url!;
      await bill.save();

      // Geçici dosyayı sil
      try {
        fs.unlinkSync(fullPath);
        console.log('Geçici dosya silindi:', fullPath);
      } catch (error) {
        console.warn('Geçici dosya silinemedi:', error);
      }

      console.log(`Fatura resmi başarıyla yüklendi: ${uploadResult.url}`);
      return true;

    } catch (error: any) {
      console.error('Fatura yükleme hatası:', error.message);
      
      // Hata verisini queue item'a kaydet
      job.data.errorMessage = error.message;
      await job.save();
      
      return false;
    }
  }

  /**
   * OCR işlemi - Gemini AI ile fatura analizi
   */
  static async processBillOCR(job: IProcessingQueue): Promise<boolean> {
    try {
      const { billId, imageBase64, imageUrl } = job.data;

      if (!billId || !imageBase64) {
        throw new Error('Bill ID veya image data eksik');
      }

      // Fatura bilgisini al
      const bill = await Bill.findById(billId);
      if (!bill) {
        throw new Error('Fatura bulunamadı');
      }

      // Progress güncelle
      job.status = 'processing';
      job.data.progressPercentage = 25;
      job.data.processingStep = 'AI analizi başlatılıyor...';
      await job.save();

      console.log(`OCR işlemi başlatıldı - Bill ID: ${billId}`);

      // Gemini OCR modülünü import et
      const { processReceiptImage } = await import('@/lib/gemini');

      // Progress güncelle
      job.data.progressPercentage = 50;
      job.data.processingStep = 'Fatura analiz ediliyor...';
      await job.save();

      // OCR işlemi yap
      const ocrResult = await processReceiptImage(imageBase64);

      // Progress güncelle
      job.data.progressPercentage = 75;
      job.data.processingStep = 'Sonuçlar kaydediliyor...';
      await job.save();

      // Bill verilerini güncelle
      bill.market_adi = ocrResult.market_adi || 'Bilinmeyen Market';
      bill.tarih = ocrResult.tarih || bill.tarih;
      bill.urunler = ocrResult.urunler || [];
      bill.toplam_tutar = ocrResult.toplam_tutar || 0;
      
      await bill.save();

      // Progress tamamla
      job.data.progressPercentage = 100;
      job.data.processingStep = 'Tamamlandı';
      await job.save();

      console.log(`OCR işlemi tamamlandı - Bill ID: ${billId}`, {
        market_adi: bill.market_adi,
        toplam_tutar: bill.toplam_tutar,
        urunler_count: bill.urunler.length
      });

      return true;

    } catch (error: any) {
      console.error('OCR işlemi hatası:', error.message);
      
      // Hata verisini queue item'a kaydet
      job.data.errorMessage = error.message;
      job.data.processingStep = 'Hata oluştu';
      await job.save();
      
      return false;
    }
  }

  /**
   * Genel resim yükleme işlemi
   */
  static async processImageUpload(job: IProcessingQueue): Promise<boolean> {
    try {
      // TODO: Genel resim yükleme logic'i
      console.log('Genel resim yükleme işlemi');
      return true;
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error.message);
      return false;
    }
  }

  /**
   * Tek bir job'ı işle
   */
  static async processJob(job: IProcessingQueue): Promise<void> {
    console.log(`Processing job: ${job._id} - Type: ${job.type} - Status: ${job.status}`);
    
    // İşlem durumunu güncelle
    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts += 1;
    job.data.progressPercentage = 10;
    job.data.processingStep = 'İşlem başlatılıyor...';
    await job.save();

    let success = false;

    try {
      switch (job.type) {
        case 'bill_upload':
          job.data.progressPercentage = 20;
          job.data.processingStep = 'CDN\'e yükleniyor...';
          await job.save();
          success = await this.processBillUpload(job);
          break;
        case 'bill_ocr':
          success = await this.processBillOCR(job);
          break;
        case 'image_upload':
          success = await this.processImageUpload(job);
          break;
        default:
          throw new Error(`Bilinmeyen job tipi: ${job.type}`);
      }

      // Başarılı ise tamamlandı olarak işaretle
      if (success) {
        job.status = 'completed';
        job.completedAt = new Date();
        job.data.progressPercentage = 100;
        job.data.processingStep = 'Tamamlandı';
        console.log(`Job completed successfully: ${job._id}`);
      } else {
        // Başarısız ise maksimum deneme kontrol et
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          job.data.processingStep = 'Başarısız';
        } else {
          job.status = 'pending'; // Tekrar denenebilir
          job.data.processingStep = 'Tekrar denenecek';
        }
        console.log(`Job failed: ${job._id} - Attempts: ${job.attempts}/${job.maxAttempts}`);
      }

    } catch (error: any) {
      console.error(`Job işleme hatası [${job._id}]:`, error.message);
      
      job.data.errorMessage = error.message;
      job.data.processingStep = `Hata: ${error.message}`;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
      } else {
        job.status = 'pending';
      }
    }

    await job.save();
  }

  /**
   * Queue işlemcisini başlat
   */
  static async startProcessor(): Promise<void> {
    console.log('Queue processor başlatılıyor...');

    const processLoop = async () => {
      try {
        const pendingJobs = await this.getPendingJobs(3);
        
        if (pendingJobs.length > 0) {
          console.log(`${pendingJobs.length} bekleyen job işleniyor...`);
          
          // Jobs'ları sırayla işle (paralel yerine) - daha güvenilir
          for (const job of pendingJobs) {
            try {
              await this.processJob(job);
            } catch (jobError: any) {
              console.error(`Job ${job._id} işlenirken hata:`, jobError.message);
            }
          }
        } else {
          console.log('Bekleyen job yok');
        }

      } catch (error: any) {
        console.error('Queue processing loop hatası:', error.message);
      }

      // 5 saniye bekle ve tekrar çalıştır
      setTimeout(processLoop, 5000);
    };

    processLoop();
  }

  /**
   * Queue işlemcisini durdur
   */
  static stopProcessor(): void {
    this.prototype.isProcessing = false;
    console.log('Queue processor durduruldu');
  }

  /**
   * Queue durumunu al
   */
  static async getQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    await connectToDatabase();

    const [pending, processing, completed, failed] = await Promise.all([
      ProcessingQueue.countDocuments({ status: 'pending' }),
      ProcessingQueue.countDocuments({ status: 'processing' }),
      ProcessingQueue.countDocuments({ status: 'completed' }),
      ProcessingQueue.countDocuments({ status: 'failed' })
    ]);

    return { pending, processing, completed, failed };
  }
}

export default QueueProcessor;