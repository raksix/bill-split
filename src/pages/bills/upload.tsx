import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth-context';
import Layout from '@/components/ui/layout';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Loading from '@/components/ui/loading';
import toast from 'react-hot-toast';

const BillUploadPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir görsel dosyası seçin');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        const response = await fetch('/api/bills/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (response.ok) {
          const data = await response.json();
          toast.success('Fatura yüklendi! Düzenleme sayfasına yönlendiriliyorsunuz...');
          setTimeout(() => {
            router.push(`/bills/edit/${data.bill.id}`);
          }, 1000);
        } else {
          const data = await response.json();
          toast.error(data.message || 'Fatura yüklenemedi');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <Head>
        <title>Fatura Yükle - Bill Split</title>
      </Head>

      <Layout title="Fatura Yükle">
        <Card className="max-w-2xl mx-auto text-center">
          <div className="py-12">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Fatura veya Fiş Yükleyin
            </h3>
            <p className="text-gray-600 mb-6">
              Yapay zeka otomatik olarak ürünleri ve fiyatları tanıyacak
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
              id="file-input"
            />

            <label htmlFor="file-input" className="cursor-pointer">
              <span className={`inline-block px-6 py-3 text-lg font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                uploading 
                  ? 'bg-blue-300 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
                {uploading ? 'Yükleniyor...' : 'Dosya Seç'}
              </span>
            </label>

            {uploading && (
              <div className="mt-6">
                <Loading />
                <p className="text-sm text-gray-600 mt-2">
                  Fatura işleniyor, lütfen bekleyin...
                </p>
              </div>
            )}
          </div>
        </Card>
      </Layout>
    </>
  );
};

export default BillUploadPage;
