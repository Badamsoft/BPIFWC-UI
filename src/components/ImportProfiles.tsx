import { useState, useEffect } from 'react';
import { Play, Edit, Copy, Trash2, Plus, Search, Filter } from 'lucide-react';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { t } from '../utils/i18n';

interface ImportProfilesProps {
  onNavigate: (tab: string, profileId?: number) => void;
}

interface Profile {
  id: number;
  name: string;
  type: string;
  source: string;
  lastRun: string;
  status: string;
  createdAt: string;
}

export function ImportProfiles({ onNavigate }: ImportProfilesProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(addCacheBuster('/wp-json/pifwc/v1/profiles?limit=100'), {
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      if (!response.ok) {
        throw new Error(t('Failed to fetch profiles'));
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data.profiles) {
        const formattedProfiles = data.data.profiles.map((profile: any) => ({
          id: profile.id,
          name: profile.name || t('Unnamed Profile'),
          type: getSourceType(profile.source, profile.source_config),
          source: getSourceDescription(profile.source, profile.source_config),
          lastRun: profile.last_run?.started_at || profile.last_run?.created_at || t('Never'),
          status: profile.is_active ? 'active' : 'inactive',
          createdAt: profile.created_at || '-'
        }));

        setProfiles(formattedProfiles);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceType = (source: string, config?: any): string => {
    const extToLabel: { [key: string]: string } = {
      'csv': 'CSV',
      'tsv': 'TSV',
      'txt': 'CSV',
      'xml': 'XML',
      'xlsx': 'Excel',
      'xls': 'Excel',
      'json': 'JSON',
    };

    const extractExt = (name: string): string => {
      const match = name.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      return match ? match[1].toLowerCase() : '';
    };

    if (config) {
      if (typeof config.file_name === 'string' && config.file_name) {
        const ext = extractExt(config.file_name);
        if (ext && extToLabel[ext]) return extToLabel[ext];
      }
      if (typeof config.url === 'string' && config.url) {
        const ext = extractExt(config.url);
        if (ext && extToLabel[ext]) return extToLabel[ext];
      }
      if (typeof config.path === 'string' && config.path) {
        const ext = extractExt(config.path);
        if (ext && extToLabel[ext]) return extToLabel[ext];
      }
    }

    const fallback: { [key: string]: string } = {
      'local': 'CSV',
      'upload': 'CSV',
      'url': 'URL',
      'ftp': 'FTP',
      'sftp': 'SFTP',
      'api': 'API',
    };
    return fallback[source] || source.toUpperCase();
  };

  const getSourceDescription = (source: string, config: any): string => {
    if (!config) return t('Not configured');

    switch (source) {
      case 'url': {
        const url = typeof config.url === 'string' ? config.url : '';
        if (url) {
          const short = url.length > 50 ? url.substring(0, 47) + '...' : url;
          return 'URL: ' + short;
        }
        return 'URL';
      }
      case 'ftp':
      case 'sftp': {
        const host = typeof config.host === 'string' ? config.host : '';
        const path = typeof config.path === 'string' ? config.path : '';
        const label = source.toUpperCase();
        if (host) return `${label}: ${host}${path ? '/' + path : ''}`;
        return label;
      }
      case 'api': {
        const endpoint = typeof config.endpoint === 'string' ? config.endpoint : '';
        if (endpoint) {
          const short = endpoint.length > 50 ? endpoint.substring(0, 47) + '...' : endpoint;
          return 'API: ' + short;
        }
        return 'API';
      }
      case 'local':
      case 'upload':
      default: {
        const fileName = typeof config.file_name === 'string' ? config.file_name : '';
        if (fileName) return t('Local upload') + ': ' + fileName;
        return t('Local upload');
      }
    }
  };

  const handleRunProfile = async (profileId: number) => {
    try {
      const response = await fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${profileId}/run`), {
        method: 'POST',
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      if (!response.ok) {
        throw new Error(t('Failed to start import'));
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        alert(t('Import started! Job ID: {jobId}', { jobId: data.data.job_id }));
        // Optionally navigate to history page
      } else {
        alert(t('Failed to start import'));
      }
    } catch (error) {
      console.error('Error running profile:', error);
      alert(t('Failed to start import'));
    }
  };

  const handleEditProfile = (profileId: number) => {
    // Navigate to new-import page with profile ID to edit
    onNavigate('new-import', profileId);
  };

  const handleDuplicateProfile = async (profileId: number) => {
    try {
      const response = await fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${profileId}/duplicate`), {
        method: 'POST',
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.errors?.[0] || t('Failed to duplicate profile'));
      }
      
      if (data.status === 'success') {
        alert(t('Profile duplicated successfully!'));
        fetchProfiles(); // Refresh list
      }
    } catch (error) {
      console.error('Error duplicating profile:', error);
      alert(t('Failed to duplicate profile'));
    }
  };

  const handleDeleteProfile = async (profileId: number, profileName: string) => {
    if (!confirm(t('Are you sure you want to delete profile "{name}"?', { name: profileName }))) {
      return;
    }

    try {
      const response = await fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${profileId}`), {
        method: 'DELETE',
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      if (!response.ok) {
        throw new Error(t('Failed to delete profile'));
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        alert(t('Profile deleted successfully!'));
        fetchProfiles();
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert(t('Failed to delete profile'));
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(paginatedProfiles.map(item => item.id));
      setSelectAll(true);
    }
  };

  const handleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedItems, id];
      setSelectedItems(newSelected);
      if (newSelected.length === paginatedProfiles.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert(t('Please select items to delete'));
      return;
    }

    if (!confirm(t('Are you sure you want to delete {count} profile(s)?', { count: selectedItems.length }))) {
      return;
    }

    try {
      const deletePromises = selectedItems.map(id =>
        fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${id}`), {
          method: 'DELETE',
          headers: {
            'X-WP-Nonce': getWpNonce()
          }
        })
      );

      await Promise.all(deletePromises);
      
      alert(t('{count} profile(s) deleted successfully!', { count: selectedItems.length }));
      setSelectedItems([]);
      setSelectAll(false);
      fetchProfiles();
    } catch (error) {
      console.error('Error deleting profiles:', error);
      alert(t('Failed to delete some profiles'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: t('Active') },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: t('Inactive') },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  // Filter and search profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || profile.type === filterType;
    const matchesStatus = filterStatus === 'all' || profile.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedItems([]);
    setSelectAll(false);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus]);

  // Get unique types for filter
  const availableTypes = ['all', ...Array.from(new Set(profiles.map(p => p.type)))];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-gray-900 mb-2">{t('Import Profiles')}</h1>
          <p className="text-gray-600">{t('Manage import profiles')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate('new-import');
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('Create Profile')}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('Search profiles...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                colorScheme: 'light'
              }}
            >
              <option value="all" style={{ backgroundColor: '#ffffff', color: '#000000' }}>{t('All Types')}</option>
              {availableTypes.filter(t => t !== 'all').map(type => (
                <option key={type} value={type} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                colorScheme: 'light'
              }}
            >
              <option value="all" style={{ backgroundColor: '#ffffff', color: '#000000' }}>{t('All Statuses')}</option>
              <option value="active" style={{ backgroundColor: '#ffffff', color: '#000000' }}>{t('Active')}</option>
              <option value="inactive" style={{ backgroundColor: '#ffffff', color: '#000000' }}>{t('Inactive')}</option>
            </select>
          </div>
        </div>

        {/* Active Filters Info */}
        {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span>{t('Active filters:')}</span>
            {searchQuery && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                {t('Search: "{query}"', { query: searchQuery })}
              </span>
            )}
            {filterType !== 'all' && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                {t('Type: {type}', { type: filterType })}
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                {t('Status: {status}', { status: filterStatus })}
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterStatus('all');
              }}
              className="ml-2 text-red-600 hover:text-red-700 font-medium"
            >
              {t('Clear all')}
            </button>
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-700 font-medium">
              {t('{count} item(s) selected', { count: selectedItems.length })}
            </div>
            <button
              onClick={handleBulkDelete}
              style={{ backgroundColor: '#d20c0b', color: '#ffffff' }}
              className="px-4 py-2 rounded-lg hover:opacity-90 text-sm font-medium flex items-center gap-2 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('Delete Selected')}</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Name')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Type')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Source')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Date & Time')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Last Run')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Status')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : paginatedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    {t('No profiles found. Create your first import profile!')}
                  </td>
                </tr>
              ) : paginatedProfiles.map((profile) => (
                <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(profile.id)}
                      onChange={() => handleSelectItem(profile.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-900">{profile.name}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {profile.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.source}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.createdAt}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{profile.lastRun}</td>
                  <td className="py-3 px-4">{getStatusBadge(profile.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRunProfile(profile.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title={t('Run')}
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditProfile(profile.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('Edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateProfile(profile.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={t('Duplicate')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(profile.id, profile.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('Delete')}
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
        <div>
          {t('Showing {start}-{end} of {total} profiles', { start: startIndex + 1, end: Math.min(endIndex, filteredProfiles.length), total: filteredProfiles.length })}
          {filteredProfiles.length !== profiles.length && (
            <span className="text-gray-500"> {t('(filtered from {total} total)', { total: profiles.length })}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('Previous')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 rounded ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('Next')}
          </button>
        </div>
      </div>

    </div>
  );
}