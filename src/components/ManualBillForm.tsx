import React, { useState } from 'react';

interface Product {
  ad: string;
  fiyat: number;
  miktar: number;
  birim: string;
}

interface ManualBillFormProps {
  onSuccess?: (billData: any) => void;
  onCancel?: () => void;
}

const ManualBillForm: React.FC<ManualBillFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    market_adi: '',
    tarih: new Date().toISOString().split('T')[0],
    toplam_tutar: '',
    description: ''
  });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<Product>({
    ad: '',
    fiyat: 0,
    miktar: 1,
    birim: 'adet'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'fiyat' || name === 'miktar' ? Number(value) : value
    }));
  };

  const addProduct = () => {
    if (!newProduct.ad || newProduct.fiyat <= 0) {
      alert('Ürün adı ve geçerli fiyat gerekli');
      return;
    }

    setProducts(prev => [...prev, { ...newProduct }]);
    setNewProduct({
      ad: '',
      fiyat: 0,
      miktar: 1,
      birim: 'adet'
    });
    
    // Otomatik toplam hesaplama
    const newTotal = [...products, newProduct].reduce((sum, product) => {
      return sum + (product.fiyat * product.miktar);
    }, 0);
    
    setFormData(prev => ({
      ...prev,
      toplam_tutar: newTotal.toFixed(2)
    }));
  };

  const removeProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
    
    // Toplam tutarı yeniden hesapla
    const newTotal = updatedProducts.reduce((sum, product) => {
      return sum + (product.fiyat * product.miktar);
    }, 0);
    
    setFormData(prev => ({
      ...prev,
      toplam_tutar: newTotal.toFixed(2)
    }));
  };

  const calculateProductsTotal = () => {
    return products.reduce((sum, product) => sum + (product.fiyat * product.miktar), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.market_adi || !formData.tarih || !formData.toplam_tutar) {
        throw new Error('Market adı, tarih ve toplam tutar gerekli');
      }

      const totalAmount = Number(formData.toplam_tutar);
      if (totalAmount <= 0) {
        throw new Error('Toplam tutar 0\'dan büyük olmalı');
      }

      // Ürün toplamı kontrolü
      if (products.length > 0) {
        const productsTotal = calculateProductsTotal();
        const difference = Math.abs(productsTotal - totalAmount);
        const tolerancePercentage = (difference / totalAmount) * 100;
        
        if (tolerancePercentage > 10) {
          throw new Error(`Ürün toplamı (₺${productsTotal.toFixed(2)}) ile genel toplam (₺${totalAmount.toFixed(2)}) tutmuyor`);
        }
      }

      const payload = {
        market_adi: formData.market_adi,
        tarih: formData.tarih,
        toplam_tutar: totalAmount,
        description: formData.description || undefined,
        urunler: products.length > 0 ? products : undefined
      };

      const response = await fetch('/api/bills/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Fatura oluşturulamadı');
      }

      console.log('✅ Manuel fatura oluşturuldu:', result.data);
      
      if (onSuccess) {
        onSuccess(result.data);
      }

      // Form'u temizle
      setFormData({
        market_adi: '',
        tarih: new Date().toISOString().split('T')[0],
        toplam_tutar: '',
        description: ''
      });
      setProducts([]);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
      console.error('Manuel fatura oluşturma hatası:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Manuel Fatura Ekle
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Adı *
            </label>
            <input
              type="text"
              name="market_adi"
              value={formData.market_adi}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Migros, BIM, A101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarih *
            </label>
            <input
              type="date"
              name="tarih"
              value={formData.tarih}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Toplam Tutar (₺) *
          </label>
          <input
            type="number"
            step="0.01"
            name="toplam_tutar"
            value={formData.toplam_tutar}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Açıklama (İsteğe bağlı)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Fatura hakkında ek bilgiler..."
          />
        </div>

        {/* Ürün Listesi */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Ürün Detayları (İsteğe bağlı)
            </h3>
            <button
              type="button"
              onClick={() => setShowProductForm(!showProductForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {showProductForm ? 'Gizle' : 'Ürün Ekle'}
            </button>
          </div>

          {showProductForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <input
                  type="text"
                  name="ad"
                  value={newProduct.ad}
                  onChange={handleProductChange}
                  placeholder="Ürün adı"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="0.01"
                  name="fiyat"
                  value={newProduct.fiyat || ''}
                  onChange={handleProductChange}
                  placeholder="Fiyat"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  name="miktar"
                  value={newProduct.miktar}
                  onChange={handleProductChange}
                  placeholder="Miktar"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="birim"
                  value={newProduct.birim}
                  onChange={handleProductChange}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="adet">Adet</option>
                  <option value="kg">Kg</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="metre">Metre</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Ürün Ekle
              </button>
            </div>
          )}

          {/* Eklenen Ürünler */}
          {products.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Eklenen Ürünler ({products.length})
              </h4>
              {products.map((product, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex-1">
                    <span className="font-medium">{product.ad}</span>
                    <span className="text-gray-600 ml-2">
                      {product.miktar} {product.birim} x ₺{product.fiyat.toFixed(2)} = 
                      ₺{(product.fiyat * product.miktar).toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    Sil
                  </button>
                </div>
              ))}
              <div className="text-right text-sm text-gray-600">
                Ürün Toplamı: ₺{calculateProductsTotal().toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Fatura Ekle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualBillForm;