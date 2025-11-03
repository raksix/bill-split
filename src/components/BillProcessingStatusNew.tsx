import React, { useState, useEffect } from 'react';

interface BillStatus {
  queueId: string;
  billId: string;
  type: string;
  status: string;
  progress: {
    percentage: number;
    step: string;
    currentStep: {
      step: number;
      total: number;
      title: string;
    }
  };
  createdAt: string;
  completedAt?: string;
  bill?: {
    id: string;
    market_adi: string;
    imageUrl: string;
    toplam_tutar: number;
  };
  estimatedTime: string;
}

interface PendingJobsData {
  active: BillStatus[];
  completed: BillStatus[];
  summary: {
    activeCount: number;
    pendingCount: number;
    processingCount: number;
    completedToday: number;
    failedToday: number;
  };
}

const BillProcessingStatus: React.FC = () => {
  const [data, setData] = useState<PendingJobsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingJobs = async () => {
    try {
      const response = await fetch('/api/bills/pending');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.message || 'Veri alınamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingJobs();
    
    // Her 3 saniyede bir güncelle
    const interval = setInterval(fetchPendingJobs, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'uploading': return 'text-blue-500';
      case 'uploaded': return 'text-green-500';
      case 'processing': return 'text-purple-500';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'uploading': return 'bg-blue-50 border-blue-200';
      case 'uploaded': return 'bg-green-50 border-green-200';
      case 'processing': return 'bg-purple-50 border-purple-200';
      case 'completed': return 'bg-green-50 border-green-200';
      case 'failed': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Hata</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchPendingJobs}
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Fatura İşlemleri
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              {data.summary.activeCount} Aktif
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {data.summary.completedToday} Bugün Tamamlandı
            </span>
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      {data.active.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Aktif İşlemler
          </h3>
          <div className="space-y-4">
            {data.active.map((job) => (
              <div
                key={job.queueId}
                className={`border rounded-lg p-4 ${getStatusBg(job.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`font-medium ${getStatusColor(job.status)}`}>
                        {job.progress.currentStep.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(job.createdAt)}
                      </span>
                    </div>
                    
                    {job.bill && (
                      <p className="text-sm text-gray-700 mb-2">
                        {job.bill.market_adi} - ₺{job.bill.toplam_tutar?.toFixed(2) || '0.00'}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{job.progress.step}</span>
                        <span>{job.progress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center space-x-2 mb-2">
                      {Array.from({ length: job.progress.currentStep.total }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i + 1 <= job.progress.currentStep.step
                              ? 'bg-blue-500'
                              : i + 1 === job.progress.currentStep.step + 1
                              ? 'bg-blue-300 animate-pulse'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-gray-500">
                      Tahmini: {job.estimatedTime}
                    </p>
                  </div>

                  {job.bill?.imageUrl && (
                    <div className="ml-4">
                      <img
                        src={job.bill.imageUrl}
                        alt="Fatura"
                        className="w-16 h-16 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed */}
      {data.completed.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Son Tamamlananlar
          </h3>
          <div className="space-y-3">
            {data.completed.slice(0, 3).map((job) => (
              <div
                key={job.queueId}
                className={`border rounded-lg p-3 ${getStatusBg(job.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                        {job.status === 'completed' ? 'Tamamlandı' : 'Başarısız'}
                      </span>
                      {job.bill && (
                        <span className="text-sm text-gray-600">
                          {job.bill.market_adi}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {job.completedAt && formatTime(job.completedAt)}
                    </p>
                  </div>
                  
                  {job.bill?.imageUrl && (
                    <img
                      src={job.bill.imageUrl}
                      alt="Fatura"
                      className="w-12 h-12 object-cover rounded border"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.active.length === 0 && data.completed.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          <p>Henüz işlem bulunmuyor</p>
          <p className="text-sm mt-1">Fatura yüklediğinizde burada görünecek</p>
        </div>
      )}
    </div>
  );
};

export default BillProcessingStatus;