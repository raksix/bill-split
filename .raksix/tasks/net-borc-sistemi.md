# Borç Ödeme Sistemi Yeniden Tasarım

## Mevcut Problem
- Her kullanıcı kendi borçlarını ayrı ayrı ödüyor
- Karşılıklı borçlar düzgün mahsup edilmiyor
- Net borç hesaplanmıyor

## Yeni Sistem
### 1. Net Borç Hesaplama
- A'nın B'ye borcu: X₺
- B'nin A'ya borcu: Y₺
- Net borç: |X - Y|₺
- Net borçlu: X > Y ise A, Y > X ise B

### 2. Ödeme Mantığı
- Sadece net borçlu kişi ödeme yapar
- Net alacaklı kişi ödeme yapmaz
- Karşılıklı mahsup otomatik yapılır

### 3. Örnek Senaryolar
**Senaryo 1:**
- Emir → Furkan: 5000₺ borç
- Furkan → Emir: 2000₺ borç
- Net: Emir, Furkan'a 3000₺ ödeyecek

**Senaryo 2:**
- Ali → Mehmet: 1000₺ borç
- Mehmet → Ali: 3000₺ borç
- Net: Mehmet, Ali'ye 2000₺ ödeyecek

## Yapılacaklar
- [x] Mevcut sistemi analiz et
- [x] Net borç hesaplama algoritması yaz (calculateNetDebt)
- [x] UI'yi net borç sistemine göre güncelle
- [x] API'yi yeniden yaz (/api/transactions/net-pay)
- [x] Eski bulk payment modal kodlarını temizle
- [x] "Kullanıcı ID bulunamadı" hatasını düzelt
- [x] Transaction model uyumsuzluğunu düzelt (status -> isPaid)
- [x] Debugging logları ekle
- [ ] Test senaryoları hazırla