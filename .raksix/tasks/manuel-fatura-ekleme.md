# Manuel Fatura Ekleme Sistemi

## Görev Durumu
- [x] Manuel fatura API endpoint'i oluştur
- [x] Fatura modeline isManual field'ı ekle
- [x] Frontend sayfa oluştur (bills/upload.tsx) - ✅ Route düzeltildi
- [x] Resim upload componenti (FileUploadWithProgress)
- [x] Manuel entry formu
- [x] Tarih seçimi ekle
- [x] Ürün listesi ekleme/çıkarma
- [x] Otomatik toplam hesaplama
- [x] İki mod arası geçiş (Resim/Manuel)
- [x] Queue status widget entegrasyonu
- [x] Validation ve error handling
- [x] Success/error mesajları
- [x] Mevcut bills/upload.tsx'e entegre edildi

## Özellikler

### 1. Fatura Ekleme Sayfası (`/bills/upload`)
⚠️ **Önemli:** `add-bill.tsx` kullanılmıyor, `bills/upload.tsx` kullanılıyor!

- **İki Mod:**
  - 📸 **Resim Yükle**: Fatura fotoğrafı yükle ve AI analizi yaptır
  - ✏️ **Manuel Giriş**: Elle fatura bilgilerini gir

### 2. Resim Upload Modu
- Drag & drop veya dosya seçimi
- Otomatik format kontrolü (PNG, JPG, JPEG)
- Boyut kontrolü (max 5MB)
- Progress bar ile upload durumu
- Real-time status göstergeleri
- Başarılı upload sonrası otomatik dashboard yönlendirmesi

### 3. Manuel Giriş Modu
- **Temel Bilgiler:**
  - Market adı / Fatura başlığı
  - Fatura tarihi (max bugün)
  - Toplam tutar
  - Açıklama (opsiyonel)

- **Ürün Detayları (Opsiyonel):**
  - Ürün adı
  - Birim fiyat
  - Adet/miktar
  - Ara toplam otomatik hesaplama
  - Ekleme/silme özellikleri

### 4. Akıllı Özellikler
- Ürün eklendiğinde toplam tutar otomatik hesaplanır
- Ürün silindiğinde toplam güncellenir
- Tarih max bugün olacak şekilde sınırlı
- API ile %10 tolerans kontrolü
- Validation mesajları

## API Endpoint

### POST `/api/bills/manual`
```json
{
  "market_adi": "Migros",
  "tarih": "2025-11-03",
  "toplam_tutar": 150.50,
  "description": "Haftalık alışveriş",
  "urunler": [
    {
      "ad": "Ekmek",
      "fiyat": 5.00,
      "miktar": 2,
      "birim": "adet"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manuel fatura başarıyla eklendi",
  "data": {
    "billId": "...",
    "market_adi": "Migros",
    "tarih": "2025-11-03T00:00:00.000Z",
    "toplam_tutar": 150.50,
    "urunler": [...],
    "isManual": true
  }
}
```

## Teknik Detaylar

### Frontend Stack
- React + TypeScript
- Next.js routing
- TailwindCSS styling
- Cookie-based authentication

### Validation Kuralları
1. Market adı zorunlu
2. Tarih zorunlu ve max bugün
3. Toplam tutar > 0
4. Ürün eklenmişse: ad ve fiyat zorunlu
5. Ürün toplamı ile genel toplam max %10 fark olabilir

### UX İyileştirmeleri
- Real-time queue status widget
- Progress bar ile upload feedback
- Otomatik hesaplamalar
- Responsive tasarım
- Hata/başarı bildirimleri
- Dashboard'a otomatik yönlendirme

## Kullanım Senaryoları

### Senaryo 1: Sadece Toplam Tutar
```
Market Adı: A101
Tarih: 03.11.2025
Toplam: 85.50₺
Açıklama: Temel ihtiyaçlar
```

### Senaryo 2: Detaylı Ürün Listesi
```
Market Adı: BIM
Tarih: 03.11.2025
Ürünler:
  - Süt (12₺ x 2 = 24₺)
  - Ekmek (5₺ x 3 = 15₺)
  - Peynir (45₺ x 1 = 45₺)
Toplam: 84₺ (Otomatik hesaplandı)
```

### Senaryo 3: Fatura Resmi Upload
```
1. "Resim Yükle" seçeneğini tıkla
2. Fatura fotoğrafını seç
3. Progress bar ile upload takibi
4. AI analiz sıraya eklenir
5. Dashboard'a yönlendirilir
```

## Güvenlik
- JWT token ile authentication
- Cookie-based session
- Input validation (frontend + backend)
- XSS koruması
- SQL injection koruması (mongoose)

## Test Checklist
- [ ] Resim upload çalışıyor mu?
- [ ] Manuel entry kaydediliyor mu?
- [ ] Ürün ekleme/silme çalışıyor mu?
- [ ] Otomatik toplam hesaplama doğru mu?
- [ ] Tarih validasyonu çalışıyor mu?
- [ ] Error handling düzgün mü?
- [ ] Dashboard yönlendirmesi çalışıyor mu?
- [ ] Queue widget güncellemesi yapıyor mu?

## Notlar
- Manuel faturalar `isManual: true` ile işaretlenir
- Resim upload'lu faturalar queue'ya eklenir
- Manuel faturalar anında kayıt edilir
- Ürün listesi tamamen opsiyonel
- Toplam tutar ya manuel girilir ya da ürünlerden hesaplanır