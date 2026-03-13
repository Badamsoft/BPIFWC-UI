import { StatsCard } from './StatsCard';
import { Clock, FolderOpen, Calendar, AlertTriangle, Plus, FileText, History as HistoryIcon } from 'lucide-react';

interface ImportDashboardProps {
  onNavigate: (tab: string) => void;
}

export function ImportDashboard({ onNavigate }: ImportDashboardProps) {
  const recentImports = [
    {
      date: '2025-12-04 14:30',
      profile: 'Products from Supplier A',
      type: 'CSV',
      status: 'success',
      added: 45,
      updated: 120,
      errors: 0,
    },
    {
      date: '2025-12-04 10:15',
      profile: 'Google Sheets Sync',
      type: 'Google Sheets',
      status: 'success',
      added: 12,
      updated: 88,
      errors: 2,
    },
    {
      date: '2025-12-03 22:00',
      profile: 'FTP Auto Import',
      type: 'XML',
      status: 'running',
      added: 0,
      updated: 0,
      errors: 0,
    },
    {
      date: '2025-12-03 18:45',
      profile: 'Price Update Feed',
      type: 'CSV',
      status: 'success',
      added: 0,
      updated: 450,
      errors: 5,
    },
    {
      date: '2025-12-03 12:00',
      profile: 'New Products Weekly',
      type: 'Excel',
      status: 'error',
      added: 0,
      updated: 0,
      errors: 15,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      running: 'bg-blue-100 text-blue-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 mb-2">Import Dashboard</h1>
        <p className="text-gray-500">Управление импортом товаров WooCommerce</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Последний импорт"
          value="2 часа назад"
          icon={Clock}
          color="red"
          subtitle="165 товаров обработано"
        />
        <StatsCard
          title="Активные профили"
          value="8"
          icon={FolderOpen}
          color="green"
          subtitle="3 запланированных"
        />
        <StatsCard
          title="Запланированные импорты"
          value="12"
          icon={Calendar}
          color="purple"
          subtitle="Следующий через 2 часа"
        />
        <StatsCard
          title="Ошибки за 24 часа"
          value="7"
          icon={AlertTriangle}
          color="orange"
          subtitle="2 требуют внимания"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('new-import')}
            className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg transition-colors text-left hover:bg-red-600"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">New Import</span>
          </button>
          <button
            onClick={() => onNavigate('profiles')}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm">Profiles</span>
          </button>
          <button
            onClick={() => onNavigate('scheduled')}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <Calendar className="w-5 h-5" />
            <span className="flex-1 text-sm">Schedule</span>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">PRO</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">Logs</span>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">Cron</p>
              <p className="text-gray-900">Активен</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">Лицензия</p>
              <p className="text-gray-900">Pro активна (365 дней)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">Очередь импорта</p>
              <p className="text-gray-900">1 задание в работе</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-gray-900">Последние операции</h2>
          <button
            onClick={() => onNavigate('history')}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Посмотреть все
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm text-gray-500">Дата</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">Профиль</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">Тип</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">Статус</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">Добавлено</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">Обновлено</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">Ошибки</th>
              </tr>
            </thead>
            <tbody>
              {recentImports.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-500">{item.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{item.profile}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{item.type}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadge(item.status)}`}>
                      {item.status === 'success' ? 'Успешно' : item.status === 'error' ? 'Ошибка' : 'В работе'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{item.added}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{item.updated}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span className={item.errors > 0 ? 'text-red-600' : 'text-gray-600'}>
                      {item.errors}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}