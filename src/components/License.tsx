import { Key, CheckCircle, Calendar, Globe, AlertCircle } from 'lucide-react';

export function License() {
  const proFeatures = [
    'Import from URL, FTP, SFTP',
    'Google Sheets synchronization',
    'Scheduled imports (CRON)',
    'Data source management',
    'Rollback changes',
    'Priority support',
    'Unlimited profiles',
    'Advanced performance settings',
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">License</h1>
        <p className="text-gray-600">Manage Pro license</p>
      </div>

      {/* Current License Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-gray-900 mb-2">License Status</h2>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-600">Pro license active</span>
            </div>
          </div>
          <div className="px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200">
            PRO
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Expiration Date</p>
              <p className="text-gray-900">December 04, 2026</p>
              <p className="text-xs text-gray-500">365 days remaining</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">Domains Used</p>
              <p className="text-gray-900">1 of 3</p>
              <p className="text-xs text-gray-500">2 domains available</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-sm text-gray-600">License Key</p>
              <p className="text-gray-900 font-mono text-sm">XXXX-XXXX-****-****</p>
              <button className="text-xs text-blue-600 hover:text-blue-700">
                Show full key
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
            Deactivate License
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400">
            Manage Domains
          </button>
        </div>
      </div>

      {/* Activate License (shown when not activated) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6" style={{ display: 'none' }}>
        <h2 className="text-gray-900 mb-4">Activate Pro License</h2>
        <p className="text-gray-600 mb-4">
          Enter your license key to activate Pro features
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
          />
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Activate
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          License key can be found in your purchase email or account dashboard
        </p>
      </div>

      {/* Pro Features */}
      <div className="bg-gradient-to-br from-red-50 to-blue-50 rounded-lg border border-red-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Pro Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {proFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-gray-900 mb-4">Subscription Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">License Type:</span>
            <span className="text-gray-900">Pro Annual</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Activation Date:</span>
            <span className="text-gray-900">December 04, 2025</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="text-gray-900">admin@yoursite.com</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Auto-renewal:</span>
            <span className="text-green-600">Enabled</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Manage Subscription →
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="text-gray-900 mb-1">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-2">
            As a Pro license holder, you get priority support.
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Contact Support →
          </button>
        </div>
      </div>
    </div>
  );
}