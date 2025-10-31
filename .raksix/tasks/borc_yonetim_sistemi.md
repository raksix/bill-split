# Borç Yönetim Sistemi

## Görevler:

- [x] Borç detay sayfası oluştur (/debts)
- [x] Borç detaylarını getiren API endpoint (/api/transactions/debts)  
- [x] Borç ödeme API endpoint (/api/transactions/pay)
- [x] Transaction modeline paidAt ve type field'ları ekle
- [x] MongoDB bağlantı dosyası oluştur
- [x] Dashboard'a Borçlarım butonu ekle
- [x] Borç ödeme modalı ve UI geliştir
- [x] Kısmi ödeme desteği ekle
- [x] Ödeme geçmişi sekmesi ekle

## Özellikler:

✅ **Borç Listesi**: Kullanıcının tüm borçlarını gösterir
✅ **Alacak Listesi**: Kullanıcının tüm alacaklarını gösterir  
✅ **Ödeme İşlemi**: Borçları tek tıkla ödeme yapabilme
✅ **Kısmi Ödeme**: Tam tutardan az ödeme yapabilme
✅ **Ödeme Geçmişi**: Geçmiş ödemeleri görüntüleme
✅ **Transaction Yönetimi**: Ödeme sonrası otomatik güncelleme
✅ **UI/UX**: Premium glassmorphism tasarım

## API Endpoints:

- `GET /api/transactions/debts` - Borç detaylarını getirir
- `POST /api/transactions/pay` - Borç ödeme işlemi yapar

## Sayfalar:

- `/debts` - Borç yönetim ana sayfası
- Dashboard'dan direkt erişim

## Veritabanı:

- Transaction model'e `paidAt` ve `type` field'ları eklendi
- MongoDB transaction desteği ile güvenli ödeme işlemleri