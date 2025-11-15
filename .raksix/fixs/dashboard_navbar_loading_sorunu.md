# Dashboard Navbar Loading Sorunu Çözümü

## Sorun
Navbar'dan `/dashboard` sayfasına tıklandığında sayfa sürekli full-screen loading ekranında kalıyordu.

## Kök Sebep
- `DashboardPage` içinde:
  - `authLoading || (loading && initialLoad)` ve `!balance && initialLoad` şartları ile loading gösteriliyordu.
  - Navbar üzerinden client-side navigation yapıldığında `AuthProvider` yeniden mount oluyor, `authLoading` tekrar `true` başlıyor.
  - Balance ilk yükleme state'leri (`initialLoad`, `loading`) ile birlikte bazı durumlarda kullanıcı uzun süre sadece loading görüyordu.

## Çözüm
1. `src/pages/dashboard.tsx` dosyasında auth ve balance yükleme akışı sadeleştirildi:
   - `useEffect` içinde:
     - `authLoading` bitmeden hiçbir şey yapılmıyor.
     - `user` yoksa `router.push` yerine `router.replace('/login')` ile login'e yönlendiriliyor.
     - İlk yüklemede polling başlatılırken `setLoading(true)` ve `setInitialLoad(true)` birlikte set ediliyor.
   - `startPolling` fonksiyonunda `isMountedRef` kontrolü eklenerek unmount sonrası state set edilmiyor.

2. Render koşulları yeniden düzenlendi:
   - Sadece `authLoading` true ise:

     ```tsx
     if (authLoading) {
       return <Loading fullScreen />;
     }
     ```

   - `user` yoksa (router.replace çalışana kadar kısa süreli):

     ```tsx
     if (!user) {
       return <Loading fullScreen />;
     }
     ```

   - Sadece ilk yükleme ve balance fetch süresince:

     ```tsx
     if (initialLoad && loading) {
       return <Loading fullScreen />;
     }
     ```

## Sonuç
- Navbar'dan `/dashboard`'a tıklandığında:
  - Auth doğrulaması bitince dashboard verileri çekiliyor.
  - İlk yükleme tamamlandıktan sonra kullanıcı sürekli loading ekranında kalmıyor.
  - Geriye kalan durumlarda hata/boş state UI'ı düzgün çalışıyor.
