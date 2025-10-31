# Bill Split - Kurulum Kılavuzu

## Gereksinimler

- Node.js 18+ veya Bun
- MongoDB (local veya Atlas)
- Google Gemini API Key (https://makersuite.google.com/app/apikey)

## Adım Adım Kurulum

### 1. Projeyi İndirin
```bash
git clone https://github.com/username/bill-split.git
cd bill-split
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. MongoDB Kurulumu

#### Seçenek A: Local MongoDB
```bash
# Windows (MongoDB Compass ile)
# https://www.mongodb.com/try/download/compass adresinden indirin

# Linux/Mac
brew install mongodb-community
brew services start mongodb-community
```

#### Seçenek B: MongoDB Atlas (Ücretsiz Cloud)
1. https://www.mongodb.com/cloud/atlas/register adresine gidin
2. Ücretsiz cluster oluşturun
3. Database Access'den kullanıcı oluşturun
4. Network Access'den IP adresinizi ekleyin (0.0.0.0/0 tüm IP'ler için)
5. Connection string'i kopyalayın

### 4. Google Gemini API Key Alın
1. https://makersuite.google.com/app/apikey adresine gidin
2. "Get API Key" butonuna tıklayın
3. API key'i kopyalayın

### 5. Environment Değişkenlerini Ayarlayın

`.env.local` dosyası oluşturun:

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/bill-split

# Veya MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bill-split

# JWT Secret (güçlü bir şifre)
JWT_SECRET=super-gizli-anahtar-123456-değiştir

# Google Gemini API Key
GEMINI_API_KEY=your-actual-api-key-here

# Environment
NODE_ENV=development
```

### 6. Uygulamayı Başlatın
```bash
npm run dev
```

### 7. İlk Kurulumu Yapın
1. Tarayıcınızda `http://localhost:3000` açın
2. Otomatik olarak `/setup` sayfasına yönlendirileceksiniz
3. Admin hesabı bilgilerini girin:
   - İsim: Admin
   - Kullanıcı Adı: admin
   - Şifre: (güçlü bir şifre seçin)
4. "Admin Hesabı Oluştur" butonuna tıklayın

### 8. İlk Kullanıcıları Ekleyin
1. Admin hesabıyla giriş yapın
2. "Kullanıcılar" menüsüne gidin
3. "+ Yeni Kullanıcı Ekle" butonuna tıklayın
4. Ev arkadaşlarınızın bilgilerini girin

## Kullanım

### Admin Olarak
- **Kullanıcı Yönetimi**: Kullanıcı ekle/sil/şifre değiştir
- **İstatistikler**: Toplam kullanıcı ve fatura sayısı
- **Tüm Veriler**: Tüm faturaları ve işlemleri görüntüle

### Normal Kullanıcı Olarak
1. **Fatura Ekle**:
   - "Fatura Ekle" butonuna tıklayın
   - Fatura/fiş fotoğrafını yükleyin
   - Yapay zeka otomatik olarak ürünleri tanıyacak
   - Gerekirse düzenleyin
   - Paylaşacağınız kişileri seçin
   - Kaydedin

2. **Borç/Alacak Takibi**:
   - Ana sayfada toplam borç ve alacağınızı görün
   - Kime ne kadar borcunuz olduğunu görün
   - Kimden ne kadar alacağınız olduğunu görün

3. **Raporlar**:
   - Tüm harcamaları görüntüleyin
   - Aylık istatistikleri inceleyin

## Sorun Giderme

### MongoDB Bağlantı Hatası
```
Error: MongooseError: MONGODB_URI tanımlanmamış
```
**Çözüm**: `.env.local` dosyasının doğru konumda olduğundan ve `MONGODB_URI` değişkeninin tanımlı olduğundan emin olun.

### Gemini API Hatası
```
Error: Gemini API Key tanımlanmamış
```
**Çözüm**: `.env.local` dosyasına `GEMINI_API_KEY` ekleyin. API key'i https://makersuite.google.com/app/apikey adresinden alabilirsiniz.

### Port 3000 Kullanımda
```bash
# Farklı port kullanın
PORT=3001 npm run dev
```

### MongoDB Atlas Bağlantı Hatası
- IP adresinizin whitelist'e eklendiğinden emin olun
- Connection string'de şifrenin özel karakterlerini encode edin
- Database kullanıcısının doğru izinlere sahip olduğundan emin olun

## Production Deployment

### Vercel'e Deploy
1. Vercel'e GitHub repoyu bağlayın
2. Environment variables'ları ekleyin:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `NODE_ENV=production`
3. Deploy edin

### Kendi Sunucunuza Deploy
```bash
# Build
npm run build

# Start
npm start
```

## Güvenlik Notları

⚠️ **Önemli**:
- Production'da `JWT_SECRET` değişkenini mutlaka değiştirin
- MongoDB'yi güvenli bir şekilde yapılandırın
- HTTPS kullanın
- Environment değişkenlerini asla commit etmeyin
- `.env.local` dosyasını `.gitignore`'a ekleyin (zaten eklendi)

## Destek

Sorun yaşarsanız:
1. GitHub Issues'da sorun açın
2. README.md dosyasını inceleyin
3. Console'daki hata mesajlarını kontrol edin

## Lisans

MIT License - İstediğiniz gibi kullanabilirsiniz!
