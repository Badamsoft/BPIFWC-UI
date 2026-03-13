import { Play, Edit, Copy, Trash2, Clock, Plus } from 'lucide-react';

interface ImportProfilesProps {
  onNavigate: (tab: string) => void;
}

export function ImportProfiles({ onNavigate }: ImportProfilesProps) {
  const profiles = [
    {
      id: 1,
      name: 'Products from Supplier A',
      type: 'CSV',
      source: 'FTP: ftp.supplier-a.com',
      lastRun: '2025-12-04 14:30',
      nextRun: '2025-12-05 14:30',
      status: 'active',
    },
    {
      id: 2,
      name: 'Google Sheets Sync',
      type: 'Google Sheets',
      source: 'Products Inventory 2025',
      lastRun: '2025-12-04 10:15',
      nextRun: '2025-12-04 16:15',
      status: 'active',
    },
    {
      id: 3,
      name: 'Price Update Feed',
      type: 'CSV',
      source: 'URL: https://feed.example.com/prices.csv',
      lastRun: '2025-12-03 18:45',
      nextRun: 'Не запланировано',
      status: 'inactive',
    },
    {
      id: 4,
      name: 'New Products Weekly',
      type: 'Excel',
      source: 'Upload: new-products.xlsx',
      lastRun: '2025-11-27 09:00',
      nextRun: '2025-12-04 09:00',
      status: 'scheduled',
    },
    {
      id: 5,
      name: 'XML Product Feed',
      type: 'XML',
      source: 'FTP: products.xml',
      lastRun: '2025-12-04 00:00',
      nextRun: '2025-12-05 00:00',
      status: 'active',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Активен' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Неактивен' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Запланирован' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900 mb-2">Import Profiles</h1>
          <p className="text-gray-600">Управление профилями импорта</p>
        </div>
        <button
          onClick={() => onNavigate('new-import')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Создать профиль
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm text-gray-600">Название</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Тип</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Источник</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Последний запуск</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Следующий запуск</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Статус</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="text-gray-900">{profile.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {profile.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.source}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.lastRun}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.nextRun}</td>
                  <td className="py-3 px-4">{getStatusBadge(profile.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Запустить"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('scheduled')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Запланировать"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Дублировать"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <div>Показано {profiles.length} профилей</div>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Предыдущая</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Следующая</button>
        </div>
      </div>
    </div>
  );
}