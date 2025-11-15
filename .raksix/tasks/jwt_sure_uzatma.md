- [x] Local/dev ortamında JWT token süresini 1 yıla çıkar
- [x] Login cookie maxAge değerini local/dev için 1 yıla çıkar
- [x] ENV ile override imkanı ekle (JWT_EXPIRES_IN, JWT_COOKIE_MAX_AGE)

Notlar:
- Prod ortamında default 7 gün; local/dev 365 gün.
- Değiştirilebilir ENV:
  - JWT_EXPIRES_IN (örn: 365d)
  - JWT_COOKIE_MAX_AGE (saniye cinsinden, örn: 31536000)