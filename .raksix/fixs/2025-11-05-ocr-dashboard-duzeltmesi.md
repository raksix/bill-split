# OCR ve Dashboard Düzeltmesi

## Sorun
- OCR ile yüklenen faturaların ürün adları `urun_adi` alanına yazılmadığı için listelerde boş görünüyordu.
- Dashboard sayfasındaki "Size ödenecek" verisi sadece ilk yüklemede geliyordu, sayfa açıkken güncellenmiyordu.
- Fatura yükledikten sonra detay sayfasına gitmiyordu ve düzenleme imkanı yoktu.

## Çözüm
- `/api/bills/upload` içinde OCR sonuçlarını normalleştirip farklı anahtar adlarından ürün adı ve fiyat bilgilerini okuyacak şekilde geliştirildi. Eksik isimler için hem `ad` hem `urun_adi` alanları dolduruldu ve fiyat/ toplam hesaplamaları güvenli hale getirildi.
- `dashboard.tsx` sayfasında bakiye isteği `useCallback` ile yeniden kullanılır hale getirildi ve interval ile 15 saniyede bir otomatik yenileme eklendi. Bileşen unmount olduğunda state güncellemesi engellenerek sızıntıların önüne geçildi.
- `bills/upload.tsx` sayfasında fatura yüklendikten sonra otomatik olarak fatura detay sayfasına yönlendirme eklendi.
- `bills/[id].tsx` detay sayfasında düzenleme modunda hızlı fiyat ayarlama butonları (+0.5₺/-0.5₺), kişiye özel/ortak ürün toggle butonu, toplu işlem butonları (hepsini ortak yap, paylaşımı kaydet) eklendi.

## Etkilenen Dosyalar
- src/pages/api/bills/upload.ts
- src/pages/dashboard.tsx
- src/pages/bills/upload.tsx
- src/pages/bills/[id].tsx

## Ek Düzeltmeler (3 Kasım 2025)
- Otomatik yönlendirme kaldırıldı, upload sayfasında inline düzenleme eklendi
- Fatura yüklendikten sonra aynı sayfada ürünleri düzenleyebilme, katılımcı seçme, kişisel/ortak ayarlama özellikleri
- Tarih formatı düzeltildi: ISO string (2025-10-04T21:00:00.000Z) → Türkçe format (04.10.2025)
- Dashboard loading spinner başlangıç durumu false yapıldı, sadece veri çekerken true oluyor
- Navbar'dan dashboard'a geçişte `setLoading(false)` gereksiz çağrısı kaldırıldı, böylece loading state doğru çalışıyor
- Dashboard loading spinner kesin çözümü: `initialLoad` state'i eklendi, sadece ilk yüklemede loading gösteriliyor. Sonraki interval güncellemelerinde spinner görünmüyor. Balance yoksa ve ilk yükleme değilse hata mesajı gösteriliyor.
