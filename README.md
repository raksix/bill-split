# Bill Split - Masraf Paylaşım Uygulaması

**Bill Split**, aynı evi paylaşan veya ortak harcama yapan gruplar için geliştirilmiş, masrafların kolayca takip edilmesini ve adil bir şekilde bölünmesini sağlayan bir web uygulamasıdır.

## 🚀 Özellikler

- ✅ **Yapay Zeka ile Fatura Okuma**: Google Gemini API ile otomatik fatura/fiş tanıma
- 👥 **Kullanıcı Yönetimi**: Admin ve standart kullanıcı rolleri
- 💰 **Borç-Alacak Takibi**: Anlık borç ve alacak durumu görüntüleme
- 📊 **Raporlama**: Detaylı harcama raporları ve istatistikler
- 🔒 **Güvenli**: JWT token tabanlı authentication ve bcryptjs şifreleme
- 📱 **Responsive**: Mobil ve masaüstü uyumlu tasarım

## 🛠️ Teknolojiler

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: MongoDB (Mongoose)
- **AI**: Google Gemini 1.5 Flash API
- **Auth**: JWT, bcryptjs

## 📦 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/username/bill-split.git
cd bill-split
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
# veya
yarn install
# veya
bun install
```

### 3. Environment Değişkenlerini Ayarlayın
`.env.local` dosyası oluşturun ve aşağıdaki değişkenleri ayarlayın:

```env
MONGODB_URI=mongodb://localhost:27017/bill-split
JWT_SECRET=your-super-secret-jwt-key
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

### 4. MongoDB'yi Başlatın
Local MongoDB instance'ını başlatın veya MongoDB Atlas kullanın.

### 5. Uygulamayı Başlatın
```bash
npm run dev
# veya
yarn dev
# veya
bun dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

## 🎯 İlk Kullanım

1. Tarayıcınızda `http://localhost:3000` adresine gidin
2. İlk kurulum ekranında admin hesabı oluşturun
3. Admin panelinden ev arkadaşlarınızı ekleyin
4. Fatura yüklemeye başlayın!

## 📱 Kullanım

### Admin Kullanıcısı
- Yeni kullanıcı ekleme/silme
- Kullanıcı şifre yönetimi
- Tüm sistem verilerini görüntüleme

### Standart Kullanıcı
- Fatura/fiş yükleme
- Fatura düzenleme ve bölüştürme
- Borç-alacak takibi
- Harcama raporlarını görüntüleme

## 🏗️ Proje Yapısı

```
bill-split/
├── src/
│   ├── components/       # React bileşenleri
│   │   └── ui/          # UI bileşenleri
│   ├── context/         # React Context (Auth)
│   ├── lib/             # Utility fonksiyonları
│   │   ├── db.ts        # MongoDB bağlantısı
│   │   ├── auth.ts      # JWT işlemleri
│   │   ├── password.ts  # Şifre hash
│   │   └── gemini.ts    # Google Gemini API
│   ├── models/          # MongoDB modelleri
│   │   ├── user.model.ts
│   │   ├── bill.model.ts
│   │   └── transaction.model.ts
│   ├── pages/           # Next.js sayfaları
│   │   ├── api/         # API endpoints
│   │   ├── admin/       # Admin sayfaları
│   │   ├── bills/       # Fatura sayfaları
│   │   └── ...
│   └── styles/          # CSS dosyaları
├── .env.local           # Environment değişkenleri
└── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

### Setup
- `GET /api/setup/check` - Kurulum kontrolü
- `POST /api/setup/init` - Admin oluştur

### Users (Admin)
- `GET /api/users/list` - Kullanıcı listesi
- `POST /api/users/create` - Yeni kullanıcı
- `DELETE /api/users/delete` - Kullanıcı sil
- `PUT /api/users/update-password` - Şifre güncelle

### Bills
- `POST /api/bills/upload` - Fatura yükle
- `PUT /api/bills/save` - Fatura kaydet
- `GET /api/bills/list` - Fatura listesi
- `GET /api/bills/[id]` - Fatura detay

### Transactions
- `GET /api/transactions/balance` - Borç-alacak durumu
- `GET /api/transactions/history` - İşlem geçmişi

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

Furkan - [GitHub](https://github.com/username)

## 🙏 Teşekkürler

- Next.js ekibine
- Google Gemini AI ekibine
- Tüm açık kaynak katkıda bulunanlara

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
