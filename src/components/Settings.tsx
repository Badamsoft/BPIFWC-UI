import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { t } from '../utils/i18n';

export function Settings() {
  type PluginSettings = {
    general: {
      batch_size: number;
      timeout_seconds: number;
      memory_limit_mb: number;
      encoding: string;
      currency: string;
    };
    logic: {
      unique_identifier: string;
      custom_meta_key: string;
      conflict_behavior: string;
      error_behavior: string;
      auto_publish: boolean;
      update_only_draft: boolean;
      delete_old_images: boolean;
    };
    performance: {
      async_mode: boolean;
      use_queues: boolean;
      wp_background_processing: boolean;
      delay_ms: number;
    };
    notifications: {
      email: string;
      email_on_complete: boolean;
      email_on_errors: boolean;
      daily_report: boolean;
    };
    debug: {
      log_level: string;
      debug_mode: boolean;
      save_logs_to_files: boolean;
      retention_days: number;
    };
    scheduling: {
      error_threshold_percent: number;
    };
  };

  const defaultSettings: PluginSettings = {
    general: {
      batch_size: 50,
      timeout_seconds: 300,
      memory_limit_mb: 512,
      encoding: 'UTF-8',
      currency: 'USD',
    },
    logic: {
      unique_identifier: 'SKU',
      custom_meta_key: '',
      conflict_behavior: 'update',
      error_behavior: 'continue_log',
      auto_publish: true,
      update_only_draft: false,
      delete_old_images: true,
    },
    performance: {
      async_mode: true,
      use_queues: true,
      wp_background_processing: true,
      delay_ms: 100,
    },
    notifications: {
      email: '',
      email_on_complete: true,
      email_on_errors: true,
      daily_report: false,
    },
    debug: {
      log_level: 'standard',
      debug_mode: false,
      save_logs_to_files: true,
      retention_days: 30,
    },
    scheduling: {
      error_threshold_percent: 10,
    },
  };

  const [cronStatus, setCronStatus] = useState<null>(null);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronError, setCronError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PluginSettings>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  const getNonce = () => (window as any).wpApiSettings?.nonce || (window as any).pifwcAdmin?.nonce || '';

  const apiFetchJson = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-WP-Nonce': getNonce(),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = data?.errors?.[0] || data?.message || 'Request failed';
      throw new Error(msg);
    }
    return data;
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      const data = await apiFetchJson(`/wp-json/pifwc/v1/settings?t=${Date.now()}`);
      const payload = (data?.data || null) as Partial<PluginSettings> | null;
      if (payload && typeof payload === 'object') {
        setSettings({
          general: { ...defaultSettings.general, ...(payload.general || {}) },
          logic: { ...defaultSettings.logic, ...(payload.logic || {}) },
          performance: { ...defaultSettings.performance, ...(payload.performance || {}) },
          notifications: { ...defaultSettings.notifications, ...(payload.notifications || {}) },
          debug: { ...defaultSettings.debug, ...(payload.debug || {}) },
          scheduling: { ...defaultSettings.scheduling, ...(payload.scheduling || {}) },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load settings';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);
      const data = await apiFetchJson(`/wp-json/pifwc/v1/settings?t=${Date.now()}`,
        {
          method: 'POST',
          body: JSON.stringify({ settings }),
        }
      );
      const payload = (data?.data || null) as Partial<PluginSettings> | null;
      if (payload && typeof payload === 'object') {
        setSettings({
          general: { ...defaultSettings.general, ...(payload.general || {}) },
          logic: { ...defaultSettings.logic, ...(payload.logic || {}) },
          performance: { ...defaultSettings.performance, ...(payload.performance || {}) },
          notifications: { ...defaultSettings.notifications, ...(payload.notifications || {}) },
          debug: { ...defaultSettings.debug, ...(payload.debug || {}) },
          scheduling: { ...defaultSettings.scheduling, ...(payload.scheduling || {}) },
        });
      }
      setSettingsSavedAt(Date.now());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save settings';
      setSettingsError(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyText = async (text: string) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (e) {
      // ignore
    }
    window.prompt('Copy to clipboard:', text);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900">{t('Settings')}</h1>
        <p className="text-gray-600">{t('Product import settings')}</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">{t('General Settings')}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('Import batch size')}</label>
              <input
                type="number"
                value={settings.general.batch_size}
                onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, batch_size: Number(e.target.value || 0) } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">{t('Number of products processed at once')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('Timeout (seconds)')}</label>
              <input
                type="number"
                value={settings.general.timeout_seconds}
                onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, timeout_seconds: Number(e.target.value || 0) } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">{t('Maximum execution time for a single import')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('Memory limit (MB)')}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={String(settings.general.memory_limit_mb)}
                onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, memory_limit_mb: Number(e.target.value || 0) } }))}
              >
                <option value="256">256 MB</option>
                <option value="512">512 MB</option>
                <option value="1024">1024 MB</option>
                <option value="2048">2048 MB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('Default encoding')}</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={settings.general.encoding}
                onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, encoding: e.target.value } }))}
              >
                <option value="UTF-8">UTF-8</option>
                <option value="Windows-1251">Windows-1251</option>
                <option value="ISO-8859-1">ISO-8859-1</option>
                <option value="UTF-16">UTF-16</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Default currency')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
              value={settings.general.currency}
              onChange={(e) => setSettings((s) => ({ ...s, general: { ...s.general, currency: e.target.value } }))}
            >
              <option value="USD">USD - US Dollar ($)</option>
              <option value="EUR">EUR - Euro (€)</option>
              <option value="RUB">RUB - Russian Ruble (₽)</option>
              <option value="GBP">GBP - British Pound (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logic Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">{t('Import Logic')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Product unique identifier')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
              value={settings.logic.unique_identifier}
              onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, unique_identifier: e.target.value } }))}
            >
              <option value="SKU">{t('SKU')}</option>
              <option value="Product ID">{t('Product ID')}</option>
              <option value="EAN">{t('EAN')}</option>
              <option value="GTIN">{t('GTIN')}</option>
              <option value="Custom Meta Field">{t('Custom Meta Field')}</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">{t('Field to identify existing products')}</p>
          </div>

          {settings.logic.unique_identifier === 'Custom Meta Field' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('Meta key (to find existing product)')}</label>
              <input
                type="text"
                value={settings.logic.custom_meta_key}
                onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, custom_meta_key: e.target.value } }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2 font-mono text-sm"
                placeholder="_sku"
              />
              <p className="text-xs text-gray-500 mt-1">{t('Example:')} <code>_ean</code> {t('or')} <code>_gtin</code>. {t('No spaces.')}</p>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Conflict behavior')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
              value={settings.logic.conflict_behavior}
              onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, conflict_behavior: e.target.value } }))}
            >
              <option value="update">{t('Update existing product')}</option>
              <option value="skip">{t('Skip product')}</option>
              <option value="duplicate">{t('Create duplicate')}</option>
              <option value="ask">{t('Request confirmation')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Error behavior')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
              value={settings.logic.error_behavior}
              onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, error_behavior: e.target.value } }))}
            >
              <option value="continue">{t('Continue import, log error')}</option>
              <option value="stop">{t('Stop import')}</option>
              <option value="email">{t('Send email and continue')}</option>
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.logic.auto_publish}
                onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, auto_publish: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Automatically publish new products')}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.logic.update_only_draft}
                onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, update_only_draft: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Update only products in "Draft" status')}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.logic.delete_old_images}
                onChange={(e) => setSettings((s) => ({ ...s, logic: { ...s.logic, delete_old_images: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Delete old images when updating')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Performance Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">{t('Performance')}</h2>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.performance.async_mode}
                onChange={(e) => setSettings((s) => ({ ...s, performance: { ...s.performance, async_mode: e.target.checked } }))}
                className="w-4 h-4"
              />
              <div>
                <span className="text-gray-900 block">{t('Async mode')}</span>
                <span className="text-xs text-gray-500">{t('Import runs in background')}</span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.performance.use_queues}
                onChange={(e) => setSettings((s) => ({ ...s, performance: { ...s.performance, use_queues: e.target.checked } }))}
                className="w-4 h-4"
              />
              <div>
                <span className="text-gray-900 block">{t('Use queues')}</span>
                <span className="text-xs text-gray-500">{t('Recommended for large imports')}</span>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.performance.wp_background_processing}
                onChange={(e) => setSettings((s) => ({ ...s, performance: { ...s.performance, wp_background_processing: e.target.checked } }))}
                className="w-4 h-4"
              />
              <div>
                <span className="text-gray-900 block">{t('WordPress Background Processing')}</span>
                <span className="text-xs text-gray-500">{t('Use built-in WP system')}</span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Delay between products (ms)')}</label>
            <input
              type="number"
              value={settings.performance.delay_ms}
              onChange={(e) => setSettings((s) => ({ ...s, performance: { ...s.performance, delay_ms: Number(e.target.value || 0) } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
            <p className="text-xs text-gray-500 mt-1">{t('Pause between processing products to reduce server load')}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">{t('Notifications')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Email for notifications')}</label>
            <input
              type="email"
              placeholder="admin@yoursite.com"
              value={settings.notifications.email}
              onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, email: e.target.value } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.email_on_complete}
                onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, email_on_complete: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Send email on import completion')}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.email_on_errors}
                onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, email_on_errors: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Send email on errors')}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications.daily_report}
                onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, daily_report: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Daily report')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Debug Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">{t('Debug')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Log level')}</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
              value={settings.debug.log_level}
              onChange={(e) => setSettings((s) => ({ ...s, debug: { ...s.debug, log_level: e.target.value } }))}
            >
              <option value="minimal">{t('Minimal')}</option>
              <option value="standard">{t('Standard')}</option>
              <option value="verbose">{t('Verbose')}</option>
              <option value="debug">{t('Debug')}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.debug.debug_mode}
                onChange={(e) => setSettings((s) => ({ ...s, debug: { ...s.debug, debug_mode: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Debug mode')}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.debug.save_logs_to_files}
                onChange={(e) => setSettings((s) => ({ ...s, debug: { ...s.debug, save_logs_to_files: e.target.checked } }))}
                className="w-4 h-4"
              />
              <span className="text-gray-900">{t('Save logs to files')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Log retention (days)')}</label>
            <input
              type="number"
              value={settings.debug.retention_days}
              onChange={(e) => setSettings((s) => ({ ...s, debug: { ...s.debug, retention_days: Number(e.target.value || 0) } }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg md:w-1/2"
            />
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <h3 className="text-gray-900 mb-1">{t('Important')}</h3>
          <p className="text-sm text-gray-600">{t('Changing performance settings may affect site operation. For large imports, it is recommended to use async mode and queues.')}</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          {settingsError ? <div className="text-sm text-red-700">{settingsError}</div> : null}
          {!settingsError && settingsSavedAt ? <div className="text-sm text-green-700">{t('Saved')}</div> : null}
          <button
            type="button"
            disabled={settingsSaving || settingsLoading}
            onClick={() => saveSettings()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {settingsSaving ? t('Saving…') : t('Save Settings')}
          </button>
        </div>
      </div>
    </div>
  );
}