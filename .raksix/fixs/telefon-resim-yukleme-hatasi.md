# Telefondan Resim Yükleme Hatası Çözümü

## Tarih
03.12.2025

## Sorun
Telefondan resim yüklenince "hata oluştu" / "fatura yüklenmedi" mesajı alınıyordu. Hata client tarafında oluşuyordu.

## Kök Sebepler
1. **Format Kontrolü Bozuk**: `handleFileInputChange` fonksiyonundaki format kontrolü mantığı yanlıştı. Telefonlardan gelen dosyalarda `file.type` bazen boş olabiliyor.
2. **FileReader Hata Yakalama Eksik**: `readFileAsBase64` fonksiyonunda yeterli hata yakalama yoktu.
3. **Yanıt Parse Hatası**: Sunucu yanıtı parse edilirken hatalar düzgün yakalanmıyordu.
4. **MIME Type Sorunu**: Gemini API'ye gönderilen resmin MIME type'ı her zaman `image/jpeg` olarak sabitlenmişti.

## Yapılan Değişiklikler

### 1. `src/pages/bills/upload.tsx` (Client)

#### Format Kontrolü Düzeltildi
```javascript
// Eski (bozuk):
if (!file.type.startsWith('image/') && !acceptedTypes.some(...))

// Yeni (düzgün):
const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
const isImage = file.type.startsWith('image/') || hasValidExtension;
```

#### FileReader Hata Yakalama Güçlendirildi
- `reader.onabort` eklendi
- `reader.onerror` detaylı hata mesajı veriyor
- `try-catch` ile `readAsDataURL` sarıldı

#### Upload Task Hata Yakalama İyileştirildi
- Base64 kontrolü eklendi (`data:` ile başlamalı)
- Response text olarak alınıp sonra parse ediliyor
- Daha detaylı hata mesajları

### 2. `src/pages/api/bills/upload.ts` (Server)
- MIME type dinamik tespit ediliyor
- HEIC/HEIF formatları destekleniyor
- Dosya boyutu limiti 10MB

### 3. `src/lib/gemini.ts`
- `mimeType` parametresi eklendi

### 4. `src/lib/rakcdn.ts`
- `contentType` parametresi eklendi

## Test Senaryoları
- iPhone'dan çekilen HEIC fotoğraf yükleme
- Android'den çekilen büyük boyutlu JPEG yükleme
- file.type boş olan dosya yükleme
- PNG ekran görüntüsü yükleme

## Beklenen Sonuç
Telefonlardan yüklenen tüm yaygın görsel formatları başarıyla işlenebiliyor.

---

## Güncelleme - 413 Payload Too Large Hatası

### Sorun
Büyük dosyalar yüklenirken "Sunucu hatası: 413" alınıyordu. Next.js varsayılan body limit'i 1MB.

### Çözüm
1. `src/pages/api/bills/upload.ts` - API route'a 50MB limit eklendi:
```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
```

2. `next.config.ts` - Global API body limit eklendi
