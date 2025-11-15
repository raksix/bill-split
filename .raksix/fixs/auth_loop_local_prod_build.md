# Local Prod Build Oturum Döngüsü (Secure Cookie) Fixi

- Sorun:
  - Prod build'i localde (http://localhost) çalıştırınca `secure: true` cookie set edildiği için tarayıcı cookie'yi kaydetmiyor/göndermiyor.
  - `/api/auth/me` sürekli 401 dönüyor, sayfa da `Oturumunuzun süresi doldu` deyip login'e atıyor; sonsuz döngü oluşuyor.

- Kök Neden:
  - `process.env.NODE_ENV === 'production'` koşuluna göre `secure` belirleniyordu. Local prod build senaryosunda bağlantı HTTPS olmadığı için cookie hiç set edilmiyor.

- Çözüm:
  - `secure` bayrağını host'a göre hesapla:
    - `localhost`/`127.0.0.1` ise secure=false
    - Aksi halde (gerçek domain) secure=true
  - İsteğe bağlı: `COOKIE_SECURE` env ile override imkanı
  - Cookie `maxAge` local/dev'de 1 yıl, prod'da 7 gün (ENV ile değiştirilebilir)

- Değişiklikler:
  - `src/pages/api/auth/login.ts` → `secure` ve `maxAge` dinamik hale getirildi
  - `src/pages/api/auth/logout.ts` → `secure` bayrağı aynı mantıkla uygulandı

- ENV Anahtarları:
  - `COOKIE_SECURE` ("true"/"false")
  - `JWT_EXPIRES_IN` (örn: 365d)
  - `JWT_COOKIE_MAX_AGE` (saniye)