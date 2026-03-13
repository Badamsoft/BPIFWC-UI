import { Server, FileSpreadsheet, Link as LinkIcon, Plus, Edit, Trash2, CheckCircle, XCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Sources() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<'FTP' | 'SFTP' | 'Google' | 'URL' | null>(null);
  
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
  
  const sources = [
    {
      id: 1,
      name: 'Supplier A FTP',
      type: 'FTP',
      host: 'ftp.supplier-a.com',
      login: 'user_supplier_a',
      status: 'connected',
      lastTest: '2025-12-04 14:00',
    },
    {
      id: 2,
      name: 'Products Inventory Sheet',
      type: 'Google',
      host: 'Google Sheets API',
      login: 'admin@company.com',
      status: 'connected',
      lastTest: '2025-12-04 10:00',
    },
    {
      id: 3,
      name: 'Warehouse SFTP',
      type: 'SFTP',
      host: 'sftp.warehouse.com:22',
      login: 'import_user',
      status: 'connected',
      lastTest: '2025-12-03 18:00',
    },
    {
      id: 4,
      name: 'Price Feed URL',
      type: 'URL',
      host: 'https://feed.example.com',
      login: 'API Key: ****abc123',
      status: 'error',
      lastTest: '2025-12-03 12:00',
    },
  ];

  const getStatusIcon = (status: string) => {
    if (status === 'connected') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Google':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'URL':
        return <LinkIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <Server className="w-5 h-5 text-gray-600" />;
    }
  };

  const openAddSourceModal = (type: 'FTP' | 'SFTP' | 'Google' | 'URL') => {
    setSelectedSourceType(type);
    setShowAddModal(true);
    // Reset form fields
    if (type === 'FTP' || type === 'SFTP') {
      setFtpName('');
      setFtpHost('');
      setFtpPort(type === 'SFTP' ? '22' : '21');
      setFtpUsername('');
      setFtpPassword('');
      setFtpPath('/');
    } else if (type === 'Google') {
      setGoogleName('');
      setGoogleSheetUrl('');
      setGoogleClientId('');
      setGoogleClientSecret('');
    } else if (type === 'URL') {
      setUrlName('');
      setUrlFeed('');
      setUrlAuthType('none');
      setUrlUsername('');
      setUrlPassword('');
      setUrlApiKey('');
    }
  };

  const handleSaveSource = () => {
    // Handle save logic here
    console.log('Saving source:', selectedSourceType);
    setShowAddModal(false);
    setSelectedSourceType(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900 mb-2">Sources</h1>
          <p className="text-gray-600">Manage data sources for import</p>
        </div>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Source
        </button>
      </div>

      {/* Sources Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Host / URL</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Login</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Last Test</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(source.type)}
                      <span className="text-gray-900">{source.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {source.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.host}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.login}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(source.status)}
                      <span className={`text-sm ${source.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {source.status === 'connected' ? 'Connected' : 'Error'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{source.lastTest}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                        Test
                      </button>
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
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

      {/* Add New Source Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Add New Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => openAddSourceModal('FTP')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <Server className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">FTP</h3>
            <p className="text-sm text-gray-600">Connect to FTP server</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('SFTP')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <Server className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">SFTP</h3>
            <p className="text-sm text-gray-600">Secure FTP connection</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('Google')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
          >
            <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="text-gray-900 mb-1">Google Sheets</h3>
            <p className="text-sm text-gray-600">Sync with Google</p>
          </button>

          <button 
            onClick={() => openAddSourceModal('URL')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <LinkIcon className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="text-gray-900 mb-1">URL Feed</h3>
            <p className="text-sm text-gray-600">Import from direct link</p>
          </button>
        </div>
      </div>

      {/* Connection Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-gray-900 mb-2">Connection Tips</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• Use Test Connection to verify source availability before saving</li>
          <li>• For FTP/SFTP, make sure the port and file path are correct</li>
          <li>• Google Sheets requires OAuth authorization</li>
          <li>• URL sources should be accessible without authentication or with Basic Auth</li>
        </ul>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-gray-900">
                Add {selectedSourceType === 'Google' ? 'Google Sheets' : selectedSourceType} Source
              </h2>
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
              {(selectedSourceType === 'FTP' || selectedSourceType === 'SFTP') && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Connection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ftpName}
                      onChange={(e) => setFtpName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My FTP Connection"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Host <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ftpHost}
                        onChange={(e) => setFtpHost(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ftp.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Port <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ftpPort}
                        onChange={(e) => setFtpPort(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={selectedSourceType === 'SFTP' ? '22' : '21'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={ftpUsername}
                        onChange={(e) => setFtpUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
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
                    <label className="block text-sm text-gray-700 mb-2">
                      Remote Path
                    </label>
                    <input
                      type="text"
                      value={ftpPath}
                      onChange={(e) => setFtpPath(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/path/to/files"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Directory path on the remote server where files are located
                    </p>
                  </div>
                </>
              )}

              {/* Google Sheets Form */}
              {selectedSourceType === 'Google' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Connection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="My Google Sheet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Google Sheet URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Full URL of your Google Sheet
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Client ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Your Google OAuth Client ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Client Secret <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Your Google OAuth Client Secret"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm text-gray-900 mb-2">Setup Instructions:</h4>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                      <li>Go to Google Cloud Console</li>
                      <li>Create a new project or select existing</li>
                      <li>Enable Google Sheets API</li>
                      <li>Create OAuth 2.0 credentials</li>
                      <li>Copy Client ID and Client Secret here</li>
                    </ol>
                  </div>
                </>
              )}

              {/* URL Feed Form */}
              {selectedSourceType === 'URL' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Connection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={urlName}
                      onChange={(e) => setUrlName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Product Feed URL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Feed URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={urlFeed}
                      onChange={(e) => setUrlFeed(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/feed.xml"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Direct URL to CSV, XML, or JSON feed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Authentication Type
                    </label>
                    <select
                      value={urlAuthType}
                      onChange={(e) => setUrlAuthType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="none">None</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                  </div>

                  {urlAuthType === 'basic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
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
              <button
                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                Test Connection
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSourceType(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSource}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Source
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}