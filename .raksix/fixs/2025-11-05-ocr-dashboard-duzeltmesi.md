# OCR ve Dashboard Düzeltmesi

## Sorun
- OCR ile yüklenen faturaların ürün adları `urun_adi` alanına yazılmadığı için listelerde boş görünüyordu.
- Dashboard sayfasındaki "Size ödenecek" verisi sadece ilk yüklemede geliyordu, sayfa açıkken güncellenmiyordu.

## Çözüm
- `/api/bills/upload` içinde OCR sonuçlarını normalleştirip farklı anahtar adlarından ürün adı ve fiyat bilgilerini okuyacak şekilde geliştirildi. Eksik isimler için hem `ad` hem `urun_adi` alanları dolduruldu ve fiyat/ toplam hesaplamaları güvenli hale getirildi.
- `dashboard.tsx` sayfasında bakiye isteği `useCallback` ile yeniden kullanılır hale getirildi ve interval ile 15 saniyede bir otomatik yenileme eklendi. Bileşen unmount olduğunda state güncellemesi engellenerek sızıntıların önüne geçildi.

## Etkilenen Dosyalar
- src/pages/api/bills/upload.ts
- src/pages/dashboard.tsx
