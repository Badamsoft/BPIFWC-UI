import { Server, FileSpreadsheet, Link as LinkIcon, Plus, Edit, Trash2, CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { t } from '../utils/i18n';

interface Source {
  id: number;
  name: string;
  type: string;
  config: any;
  status: string;
  last_tested: string | null;
  created_at: string;
}

export function Sources() {
  const isPro = !!(window as any).pifwcAdmin?.isPro;
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<'ftp' | 'sftp' | 'sheets' | 'url' | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [savingSource, setSavingSource] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // FTP/SFTP form state
  const [ftpName, setFtpName] = useState('');
  const [ftpHost, setFtpHost] = useState('');
  const [ftpPort, setFtpPort] = useState('21');
  const [ftpUsername, setFtpUsername] = useState('');
  const [ftpPassword, setFtpPassword] = useState('');
  const [ftpPath, setFtpPath] = useState('/');
  
  // Google Sheets form state
  const [googleName, setGoogleName] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  
  // URL Feed form state
  const [urlName, setUrlName] = useState('');
  const [urlFeed, setUrlFeed] = useState('');
  const [urlAuthType, setUrlAuthType] = useState('none');
  const [urlUsername, setUrlUsername] = useState('');
  const [urlPassword, setUrlPassword] = useState('');
  const [urlApiKey, setUrlApiKey] = useState('');

  // Fetch sources on mount
  useEffect(() => {
    if (!isPro) {
      return;
    }
    fetchSources();
  }, [isPro]);

  if (!isPro) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl text-gray-900 mb-3">{t('Sources')}</h2>
            <p className="text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed pifwc-center-text">
              {t('Remote import sources are not supported by the active plugin configuration.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/wp-json/pifwc/v1/sources', {
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sources');
      }

      const data = await response.json();
      if (data.status === 'success' && data.data.sources) {
        setSources(data.data.sources);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  };
  
  const getSourceDisplay = (source: Source) => {
    const config = source.config || {};
    let host = '';
    let login = '';

    switch (source.type) {
      case 'ftp':
      case 'sftp':
        host = `${config.host || ''}${config.port ? ':' + config.port : ''}`;
        login = config.username || '';
        break;
      case 'url':
        host = config.url || '';
        login = config.api_key ? 'API Key: ****' : (config.username || 'None');
        break;
      case 'sheets':
        host = 'Google Sheets';
        login = config.url ? 'Connected' : '';
        break;
    }

    return { host, login };
  };

  const getStatusIcon = (status: string) => {
    if (status === 'active') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sheets':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'url':
        return <LinkIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <Server className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ftp': return t('FTP');
      case 'sftp': return t('SFTP');
      case 'sheets': return t('Google Sheets');
      case 'url': return t('URL');
      default: return type.toUpperCase();
    }
  };

  const openAddSourceModal = (type: 'ftp' | 'sftp' | 'sheets' | 'url') => {
    setEditingSource(null);
    setSelectedSourceType(type);
    setShowAddModal(true);
    // Reset form fields
    if (type === 'ftp' || type === 'sftp') {
      setFtpName('');
      setFtpHost('');
      setFtpPort(type === 'sftp' ? '22' : '21');
      setFtpUsername('');
      setFtpPassword('');
      setFtpPath('/');
    } else if (type === 'sheets') {
      setGoogleName('');
      setGoogleSheetUrl('');
      setGoogleClientId('');
      setGoogleClientSecret('');
    } else if (type === 'url') {
      setUrlName('');
      setUrlFeed('');
      setUrlAuthType('none');
      setUrlUsername('');
      setUrlPassword('');
      setUrlApiKey('');
    }
  };

  const openEditSourceModal = (source: Source) => {
    setEditingSource(source);
    setSelectedSourceType(source.type as any);
    setShowAddModal(true);

    const config = source.config || {};
    if (source.type === 'ftp' || source.type === 'sftp') {
      setFtpName(source.name);
      setFtpHost(config.host || '');
      setFtpPort(config.port || (source.type === 'sftp' ? '22' : '21'));
      setFtpUsername(config.username || '');
      setFtpPassword('');
      setFtpPath(config.path || '/');
    } else if (source.type === 'sheets') {
      setGoogleName(source.name);
      setGoogleSheetUrl(config.url || '');
      setGoogleClientId(config.client_id || '');
      setGoogleClientSecret('');
    } else if (source.type === 'url') {
      setUrlName(source.name);
      setUrlFeed(config.url || '');
      setUrlAuthType(config.auth_type || 'none');
      setUrlUsername(config.username || '');
      setUrlPassword('');
      setUrlApiKey(config.api_key || '');
    }
  };

  const handleSaveSource = async () => {
    if (!selectedSourceType) return;

    setSavingSource(true);
    setError(null);

    try {
      let name = '';
      let config: any = {};

      if (selectedSourceType === 'ftp' || selectedSourceType === 'sftp') {
        name = ftpName;
        config = {
          host: ftpHost,
          port: ftpPort,
          username: ftpUsername,
          password: ftpPassword || undefined,
          path: ftpPath
        };
      } else if (selectedSourceType === 'sheets') {
        name = googleName;
        config = {
          url: googleSheetUrl,
          client_id: googleClientId,
          client_secret: googleClientSecret || undefined
        };
      } else if (selectedSourceType === 'url') {
        name = urlName;
        config = {
          url: urlFeed,
          auth_type: urlAuthType,
          username: urlAuthType === 'basic' ? urlUsername : undefined,
          password: urlAuthType === 'basic' ? urlPassword : undefined,
          api_key: urlAuthType === 'apikey' ? urlApiKey : undefined
        };
      }

      const url = addCacheBuster(editingSource
        ? `/wp-json/pifwc/v1/sources/${editingSource.id}`
        : '/wp-json/pifwc/v1/sources');

      const method = 'POST';

      const response = await fetch(url, {
        method,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-WP-Nonce': getWpNonce()
        },
        body: JSON.stringify({
          name,
          type: selectedSourceType,
          config
        })
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.errors?.[0] || t('Failed to save source'));
      }

      setSuccessMessage(editingSource ? t('Source updated successfully') : t('Source created successfully'));
      setShowAddModal(false);
      setSelectedSourceType(null);
      setEditingSource(null);
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to save source'));
    } finally {
      setSavingSource(false);
    }
  };

  const handleTestSource = async (sourceId: number) => {
    setTestingId(sourceId);
    setError(null);

    try {
      const response = await fetch(`/wp-json/pifwc/v1/sources/${sourceId}/test`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.errors?.[0] || t('Connection test failed'));
      }

      setSuccessMessage(t('Connection test successful'));
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Connection test failed'));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm(t('Are you sure you want to delete this source?'))) {
      return;
    }

    try {
      const response = await fetch(`/wp-json/pifwc/v1/sources/${sourceId}`, {
        method: 'DELETE',
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.errors?.[0] || t('Failed to delete source'));
      }

      setSuccessMessage(t('Source deleted successfully'));
      await fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to delete source'));
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900 mb-2">{t('Sources')}</h1>
          <p className="text-gray-600">{t('Manage data sources for import')}</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sources Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{t('No sources configured yet')}</p>
            <p className="text-sm text-gray-500">{t('Add your first source below')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Name')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Type')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Host / URL')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Login')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Last Test')}</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const display = getSourceDisplay(source);
                  return (
                    <tr key={source.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(source.type)}
                          <span className="text-gray-900">{source.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {getTypeLabel(source.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{display.host}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{display.login}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(source.status)}
                          <span className={`text-sm ${source.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                            {source.status === 'active' ? t('Active') : t('Error')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {source.last_tested ? new Date(source.last_tested).toLocaleString() : t('Never')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTestSource(source.id)}
                            disabled={testingId === source.id}
                            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {testingId === source.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> {t('Testing...')}</>
                            ) : t('Test')}
                          </button>
                          <button
                            onClick={() => openEditSourceModal(source)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t('Edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSource(source.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t('Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Source Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">{t('Add New Source')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => openAddSourceModal('ftp')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <Server className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">{t('FTP')}</h3>
            <p className="text-sm text-gray-600">{t('Connect to FTP server')}</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('sftp')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <Server className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">{t('SFTP')}</h3>
            <p className="text-sm text-gray-600">{t('Secure FTP connection')}</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('sheets')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left">
            <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="text-gray-900 mb-1">{t('Google Sheets')}</h3>
            <p className="text-sm text-gray-600">{t('Sync with Google')}</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('url')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <LinkIcon className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">{t('URL Feed')}</h3>
            <p className="text-sm text-gray-600">{t('Import from direct link')}</p>
          </button>
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setShowAddModal(false);
              setSelectedSourceType(null);
              setEditingSource(null);
            }}
          />
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300 relative z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">{editingSource ? t('Edit') : t('Add')} {selectedSourceType?.toUpperCase()} {t('Source')}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedSourceType(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* FTP/SFTP Form */}
              {(selectedSourceType === 'ftp' || selectedSourceType === 'sftp') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Connection Name')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={ftpName}
                      onChange={(e) => setFtpName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('My FTP Connection')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('Host')} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={ftpHost}
                        onChange={(e) => setFtpHost(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('your-ftp-host')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('Port')} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={ftpPort}
                        onChange={(e) => setFtpPort(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={selectedSourceType === 'sftp' ? '22' : '21'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('Username')} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={ftpUsername}
                        onChange={(e) => setFtpUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('username')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('Password')} <span className="text-red-500">*</span></label>
                      <input
                        type="password"
                        value={ftpPassword}
                        onChange={(e) => setFtpPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Remote Path')}</label>
                    <input
                      type="text"
                      value={ftpPath}
                      onChange={(e) => setFtpPath(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('/path/to/files')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('Directory path on the remote server where files are located')}
                    </p>
                  </div>
                </>
              )}

              {/* Google Sheets Form */}
              {selectedSourceType === 'sheets' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Connection Name')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('My Google Sheet')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Google Sheet URL')} <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('https://docs.google.com/spreadsheets/d/...')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('Full URL of your Google Sheet')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Client ID')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('Your Google OAuth Client ID')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Client Secret')} <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder={t('Your Google OAuth Client Secret')}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('Setup Instructions:')}</h3>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                      <li>{t('Go to Google Cloud Console')}</li>
                      <li>{t('Create a new project or select existing')}</li>
                      <li>{t('Enable Google Sheets API')}</li>
                      <li>{t('Create OAuth 2.0 credentials')}</li>
                      <li>{t('Copy Client ID and Client Secret here')}</li>
                    </ol>
                  </div>
                </>
              )}

              {/* URL Feed Form */}
              {selectedSourceType === 'url' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Connection Name')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={urlName}
                      onChange={(e) => setUrlName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('Product Feed URL')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Feed URL')} <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      value={urlFeed}
                      onChange={(e) => setUrlFeed(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('https://your-feed-url')}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('Direct URL to a product feed')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Authentication Type')}</label>
                    <select
                      value={urlAuthType}
                      onChange={(e) => setUrlAuthType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">{t('None')}</option>
                      <option value="basic">{t('Basic Auth')}</option>
                      <option value="apikey">{t('API Key')}</option>
                    </select>
                  </div>

                  {urlAuthType === 'basic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('Username')}</label>
                        <label className="block text-sm text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={urlUsername}
                          onChange={(e) => setUrlUsername(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={urlPassword}
                          onChange={(e) => setUrlPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  )}

                  {urlAuthType === 'apikey' && (
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="text"
                        value={urlApiKey}
                        onChange={(e) => setUrlApiKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your API key"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        API key will be sent in the Authorization header
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSourceType(null);
                    setEditingSource(null);
                  }}
                  disabled={savingSource}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleSaveSource}
                  disabled={savingSource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {savingSource && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingSource ? t('Saving...') : (editingSource ? t('Update') + ' ' + t('Source') : t('Save') + ' ' + t('Source'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}