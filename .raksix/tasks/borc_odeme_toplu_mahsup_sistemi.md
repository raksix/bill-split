# Borç Ödeme Sistemi Toplu Ödeme ve Karşılıklı Mahsup

## Görevler

- [x] Bulk payment API'si oluşturuldu (`/api/transactions/bulk-pay`)
- [x] Karşılıklı mahsup logic'i eklendi
- [x] Debts sayfasında borçları kişi bazında gruplandırma
- [x] Toplu ödeme modal'ı eklendi
- [x] Net borç hesaplama ve gösterimi
- [x] Tek ödeme + toplu ödeme seçenekleri
- [ ] **BUG**: Karşılıklı mahsup çalışmıyor - debugging eklendi
- [ ] **BUG**: Toplu ödemede borç gözükmüyor - user ID mapping düzeltildi

## Özellikler

### API (`bulk-pay.ts`)
1. **Single Payment**: Tek transaction ödeme (mevcut sistem ile uyumlu)
2. **Bulk Payment**: Kişi bazında toplu ödeme + karşılıklı mahsup
3. **Netting Logic**: Karşılıklı borçları otomatik mahsup eder
4. **Smart Processing**: Önce mahsup, sonra borç ödeme

### UI Değişiklikleri (`debts.tsx`)
1. **Borç Gruplama**: Kişi bazında borçları gruplar
2. **Net Borç Gösterimi**: Karşılıklı borçları gösterir
3. **Dual Buttons**: "Tek Öde" + "Toplu Ödeme Yap"
4. **Smart Modal**: Borç durumunu açıklar, kullanım kılavuzu

### İş Mantığı
- A'nın B'ye 5000₺ borcu var
- B'nin A'ya 2000₺ borcu var  
- A 3000₺ ödeme yapınca:
  - B'nin 2000₺ borcu silinir (mahsup)
  - A'nın 1000₺ borcu silinir (ödeme)
  - Net sonuç: A'nın B'ye 4000₺ borcu kalır

## Test Senaryoları
1. Normal tek ödeme
2. Karşılıklı borç olmadan toplu ödeme  
3. Karşılıklı borç ile toplu ödeme + mahsup
4. Fazla tutar girme (iade edilir)

## Debug İşlemleri

### Düzeltilen Hatalar:
1. **User ID Mapping**: `unpaidDebts` ve `unpaidCredits` mapping'inde `user.userId` kullanılıyor artık
2. **API Debugging**: Bulk payment API'sinde detaylı debug logları eklendi
3. **UI Debugging**: Modal açılışında borç hesaplama logları eklendi

### Console Logları:
- `📊 Debt data transformed`: Debt verisi dönüşüm logları
- `🔍 Bulk payment modal açılıyor`: Modal açılış logları  
- `💸 Bulk payment request`: API isteği logları
- `🔄 Bulk payment processing`: API işlem logları
- `📊 Found debts`: Transaction bulma logları

### Test Adımları:
1. Console açık tutun
2. Debts sayfasına gidin - veri dönüşüm loglarını kontrol edin
3. Toplu ödeme butonuna basın - modal loglarını kontrol edin
4. Ödeme yapın - API loglarını kontrol edin

## Sonuç
Debug işlemleri tamamlandı. Console logları ile real-time takip yapılabilir.