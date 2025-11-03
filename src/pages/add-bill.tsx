import React, { useState } from 'react';
import { useRouter } from 'next/router';
import FileUploadWithProgress from '../components/FileUploadWithProgress';
import QueueManagerWidget from '../components/QueueManagerWidget';

interface ManualBillData {
  title: string;
  total: number;
  description: string;
  products: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

const AddBillPage: React.FC = () => {
  const router = useRouter();
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBillData, setManualBillData] = useState<ManualBillData>({
    title: '',
    total: 0,
    description: '',
    products: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUploadComplete = (result: any) => {
    setSuccess('Fatura başarıyla yüklendi! Analiz işlemi sırada...');
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
  };

  const handleFileUploadError = (error: string) => {
    setError(`Upload hatası: ${error}`);
  };

  const addProduct = () => {
    setManualBillData(prev => ({
      ...prev,
      products: [...prev.products, { name: '', price: 0, quantity: 1 }]
    }));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    setManualBillData(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const removeProduct = (index: number) => {
    setManualBillData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return manualBillData.products.reduce((sum, product) => 
      sum + (product.price * product.quantity), 0
    );
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const total = calculateTotal();
      
      const response = await fetch('/api/bills/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...manualBillData,
          total: total > 0 ? total : manualBillData.total
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Fatura oluşturulamadı');
      }

      setSuccess('Manuel fatura başarıyla oluşturuldu!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Fatura Ekle</h1>
            <p className="mt-1 text-sm text-gray-600">
              Resim yükleyerek otomatik analiz ettirin veya manuel olarak girin
            </p>
          </div>

          <div className="p-6">
            {/* Queue Status Widget */}
            <div className="mb-6">
              <QueueManagerWidget />
            </div>

            {/* Toggle Buttons */}
            <div className="flex space-x-4 mb-6">
              <button
                type="button"
                onClick={() => setIsManualEntry(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  !isManualEntry
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📸 Resim Yükle
              </button>
              <button
                type="button"
                onClick={() => setIsManualEntry(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isManualEntry
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ✏️ Manuel Giriş
              </button>
            </div>

            {/* Image Upload Section */}
            {!isManualEntry && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Fatura Resmi Yükle</h2>
                <FileUploadWithProgress
                  onUploadComplete={handleFileUploadComplete}
                  onUploadError={handleFileUploadError}
                  accept="image/*"
                  maxSize={5}
                />
              </div>
            )}

            {/* Manual Entry Section */}
            {isManualEntry && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Manuel Fatura Girişi</h2>
                
                <form onSubmit={handleManualSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fatura Başlığı *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualBillData.title}
                        onChange={(e) => setManualBillData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Örn: Market Alışverişi"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Toplam Tutar (₺) {manualBillData.products.length > 0 ? '(Otomatik hesaplanıyor)' : '*'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={manualBillData.products.length === 0}
                        value={manualBillData.products.length > 0 ? calculateTotal() : manualBillData.total}
                        onChange={(e) => setManualBillData(prev => ({ ...prev, total: parseFloat(e.target.value) || 0 }))}
                        disabled={manualBillData.products.length > 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={manualBillData.description}
                      onChange={(e) => setManualBillData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Fatura hakkında not..."
                    />
                  </div>

                  {/* Products Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-md font-medium text-gray-900">Ürünler (İsteğe bağlı)</h3>
                      <button
                        type="button"
                        onClick={addProduct}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        + Ürün Ekle
                      </button>
                    </div>

                    {manualBillData.products.map((product, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Ürün Adı
                            </label>
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateProduct(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Ürün adı"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Fiyat (₺)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Adet
                            </label>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="1"
                                value={product.quantity}
                                onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => removeProduct(index)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Ürünü sil"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-right">
                          <span className="text-sm text-gray-600">
                            Ara Toplam: <strong>{(product.price * product.quantity).toFixed(2)} ₺</strong>
                          </span>
                        </div>
                      </div>
                    ))}

                    {manualBillData.products.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-900">
                            Genel Toplam: {calculateTotal().toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-red-900">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-900">{success}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBillPage;