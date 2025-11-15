# [ ] Borçlar Sayfasında Fatura Sahibi ve Gruplama Düzeltmesi

## Amaç
- Fatura sahibi (ödeyen) bilgisini borçlar listesindeki her fatura kartında göstermek
- Aynı anda birden fazla kişiye olan borçların ayrı ayrı kişiler altında doğru gruplanması

## Yapılacaklar
- [x] API: Bill sahibini populate et (userId/uploadedBy) ve response'a billOwner ekle
- [x] API: fromUser/toUser için username alanını da dahil et
- [x] Client: API dönüşümünde creditor/debtor id alanlarını doğru kullan (id)
- [x] Client: Transaction tipine billOwner alanını ekle
- [x] UI: Fatura kartında "Fatura sahibi" satırı ekle
- [ ] Logları sadeleştir (debug loglarını azalt)

## Notlar
- Olası bug: API creditor/debtor alanları id ile dönüyor; client _id beklerse grupla tek kişi görünür. Düzeltildi.
- Bill owner bilgisi populate edildi; yoksa null döner.
