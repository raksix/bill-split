import React, { useState, useEffect } from 'react';

interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface QueueManagerData {
  isRunning: boolean;
  status: QueueStatus;
  timestamp: string;
}

const QueueManagerWidget: React.FC = () => {
  const [data, setData] = useState<QueueManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/queue/manager');
      const result = await response.json();

      if (result.success) {
        setData(result);
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

  const startProcessor = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/queue/manager', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        await fetchQueueStatus(); // Refresh data
      } else {
        setError(result.message || 'Başlatılamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Başlatma hatası');
    } finally {
      setActionLoading(false);
    }
  };

  const stopProcessor = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/queue/manager', { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        await fetchQueueStatus(); // Refresh data
      } else {
        setError(result.message || 'Durdurulamadı');
      }
    } catch (err: any) {
      setError(err.message || 'Durdurma hatası');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    
    // Her 5 saniyede bir güncelle
    const interval = setInterval(fetchQueueStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (isRunning: boolean) => {
    return isRunning ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const getTotalJobs = () => {
    if (!data?.status) return 0;
    return data.status.pending + data.status.processing + data.status.completed + data.status.failed;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-600">Queue Hatası</span>
          </div>
          <button 
            onClick={fetchQueueStatus}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Yenile
          </button>
        </div>
        <p className="text-xs text-red-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`rounded-lg shadow-sm border p-4 ${getStatusBg(data.isRunning)}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${data.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium ${getStatusColor(data.isRunning)}`}>
            Queue {data.isRunning ? 'Aktif' : 'Durmuş'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {new Date(data.timestamp).toLocaleTimeString('tr-TR', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
          
          {!actionLoading && (
            <button
              onClick={data.isRunning ? stopProcessor : startProcessor}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                data.isRunning 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {data.isRunning ? 'Durdur' : 'Başlat'}
            </button>
          )}
          
          {actionLoading && (
            <div className="px-3 py-1">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold text-yellow-600">{data.status.pending}</div>
          <div className="text-xs text-gray-600">Bekleyen</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-blue-600">{data.status.processing}</div>
          <div className="text-xs text-gray-600">İşleniyor</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-green-600">{data.status.completed}</div>
          <div className="text-xs text-gray-600">Tamamlandı</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-600">{data.status.failed}</div>
          <div className="text-xs text-gray-600">Başarısız</div>
        </div>
      </div>

      {/* Total */}
      {getTotalJobs() > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-center">
            <span className="text-sm text-gray-600">
              Toplam: <span className="font-medium">{getTotalJobs()}</span> işlem
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {data.isRunning && data.status.pending > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>{data.status.pending} işlem sırada bekliyor</span>
            </div>
          </div>
        </div>
      )}

      {!data.isRunning && data.status.pending > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-center">
            <div className="text-xs text-orange-600 text-center">
              ⚠️ {data.status.pending} bekleyen işlem var<br />
              Queue'yu başlatın
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagerWidget;