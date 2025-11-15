# Manuel Fatura Split Sorunu

## Sorun
Manuel fatura düzenleyince katılımcı ekleme çalışmıyor, transaction'lar oluşmuyor.

## Kök Sebep
`/pages/bills/[id].tsx` sayfasında `handleEdit` fonksiyonu `/api/bills/[id]` PUT endpoint'ini kullanıyor.
Bu endpoint'te transaction mantığı var ama `participants` ve `urunler` parametrelerinin doğru gönderilmesi gerekiyor.

## Debug İhtiyaçları
1. Client tarafında `handleEdit` fonksiyonuna console.log ekle
2. API tarafında gelen parametreleri kontrol et
3. Transaction oluşturma şartlarını kontrol et

## Olası Sorunlar
- Client tarafında katılımcı listesi doğru gönderilmiyor
- API tarafında participants parametresi boş geliyor
- urunler formatı yanlış (isPersonal eksik vs.)

## Test Adımları
1. Manuel fatura oluştur
2. Detay sayfasına git
3. Düzenle butonuna tıkla
4. Katılımcı ekle
5. Console'da logları kontrol et
6. Kaydet butonuna tıkla
7. API response'unu kontrol et