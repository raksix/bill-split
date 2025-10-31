import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import Card from '@/components/ui/card';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error('Kullanıcı adı ve şifre gerekli');
      return;
    }

    setSubmitting(true);

    try {
      await login(username, password);
      toast.success('Giriş başarılı!');
    } catch (error: any) {
      toast.error(error.message || 'Giriş başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Giriş - Bill Split</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 via-purple-600 to-pink-500 p-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Logo ve Başlık */}
          <div className="text-center mb-8">
            <div className="inline-block bg-white rounded-3xl p-6 shadow-2xl mb-6">
              <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg">Bill Split</h1>
            <p className="text-white/90 text-lg font-medium">Masraf paylaşım uygulaması</p>
          </div>

          {/* Login Kartı */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Hoş Geldiniz! 👋</h2>
              <p className="text-gray-600">Hesabınıza giriş yapın</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  label="Kullanıcı Adı"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                  fullWidth
                  autoComplete="username"
                  className="text-lg"
                />
              </div>

              <div>
                <Input
                  label="Şifre"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                  fullWidth
                  autoComplete="current-password"
                  className="text-lg"
                />
              </div>

              <Button
                type="submit"
                fullWidth
                disabled={submitting}
                size="lg"
                className="py-4 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all mt-6"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Giriş Yap
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-white/80 text-sm">
              Bill Split - Harcamalarınızı kolayca paylaşın 💰
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
