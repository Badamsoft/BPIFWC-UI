import { Save, AlertCircle } from 'lucide-react';

export function Settings() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Настройки импорта товаров</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Основные настройки</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Размер пакета импорта (batch size)
              </label>
              <input
                type="number"
                defaultValue="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Количество товаров, обрабатываемых за один раз
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Таймаут (секунды)
              </label>
              <input
                type="number"
                defaultValue="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Максимальное время выполнения одного импорта
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Лимит памяти (MB)
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="512 MB">
                <option>256 MB</option>
                <option>512 MB</option>
                <option>1024 MB</option>
                <option>2048 MB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Кодировка по умолчанию
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="UTF-8">
                <option>UTF-8</option>
                <option>Windows-1251</option>
                <option>ISO-8859-1</option>
                <option>UTF-16</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Валюта по умолчанию
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2" defaultValue="USD - US Dollar ($)">
              <option>USD - US Dollar ($)</option>
              <option>EUR - Euro (€)</option>
              <option>RUB - Russian Ruble (₽)</option>
              <option>GBP - British Pound (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logic Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Логика импорта</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Уникальный идентификатор товара
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2" defaultValue="SKU">
              <option>SKU</option>
              <option>Product ID</option>
              <option>EAN</option>
              <option>GTIN</option>
              <option>Custom Meta Field</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Поле для определения существующих товаров
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Поведение при конфликте
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2" defaultValue="Обновить существующий товар">
              <option>Обновить существующий товар</option>
              <option>Пропустить товар</option>
              <option>Создать дубликат</option>
              <option>Запросить подтверждение</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Поведение при ошибках
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2" defaultValue="Продолжить импорт, записать в лог">
              <option>Продолжить импорт, записать в лог</option>
              <option>Остановить импорт</option>
              <option>Отправить email и продолжить</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-gray-900">Автоматически публиковать новые товары</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-gray-900">Обновлять только товары в статусе "Черновик"</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-gray-900">Удалять старые изображения при обновлении</span>
            </label>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Производительность</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <div>
                <span className="text-gray-900 block">Асинхронный режим</span>
                <span className="text-xs text-gray-500">
                  Импорт выполняется в фоновом режиме
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <div>
                <span className="text-gray-900 block">Использовать очереди</span>
                <span className="text-xs text-gray-500">
                  Обработка импортов через систему очередей
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <div>
                <span className="text-gray-900 block">WP Background Processing</span>
                <span className="text-xs text-gray-500">
                  Использовать встроенную систему фоновой обработки WordPress
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Задержка между пакетами (мс)
            </label>
            <input
              type="number"
              defaultValue="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Пауза между обработкой пакетов для снижения нагрузки
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Уведомления</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Email для уведомлений
            </label>
            <input
              type="email"
              placeholder="admin@yoursite.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-gray-900">Отправлять email после завершения импорта</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-gray-900">Отправлять email при ошибках</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-gray-900">Ежедневный отчет о всех импортах</span>
            </label>
          </div>
        </div>
      </div>

      {/* Debug Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Отладка и логирование</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Уровень логирования
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2" defaultValue="Стандартный">
              <option>Минимальный (только ошибки)</option>
              <option>Стандартный</option>
              <option>Подробный (включая предупреждения)</option>
              <option>Максимальный (debug)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-gray-900">Режим отладки (debug mode)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="text-gray-900">Сохранять логи в файлы</span>
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Хранить логи (дней)
            </label>
            <input
              type="number"
              defaultValue="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="text-gray-900 mb-1">Важно</h3>
          <p className="text-sm text-gray-600">
            Изменение настроек производительности может повлиять на работу сайта. 
            При больших объемах импорта рекомендуется использовать асинхронный режим и очереди.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Save className="w-5 h-5" />
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}