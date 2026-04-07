import { Download, RotateCcw, FileText, AlertCircle, X, Calendar, Trash2, Square, Crown, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { t } from '../utils/i18n';
import LogsModal from './LogsModal';
import { ProBadge } from './ProBadge';

interface HistoryItem {
  id: number;
  jobId: number;
  date: string;
  profile: string;
  profileId?: number | null;
  type: string;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  status: string;
  duration: string;
}

interface ImportHistoryProps {
  onNavigate?: (tab: string, profileId?: number) => void;
}

export function ImportHistory({ onNavigate }: ImportHistoryProps = {}) {
  const isPro = Boolean((window as any).pifwcAdmin?.isPro);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, successful: 0, errors: 0, processed: 0 });
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [logsModalJobId, setLogsModalJobId] = useState<number | null>(null);
  const [abortJobId, setAbortJobId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [profiles, setProfiles] = useState<Array<{id: number, name: string}>>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchProfiles();
      setProfilesLoaded(true);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (profilesLoaded) {
      fetchHistory();
    }
  }, [profilesLoaded]);

  const fetchProfiles = async (): Promise<void> => {
    try {
      const response = await fetch(addCacheBuster('/wp-json/pifwc/v1/profiles'), {
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data.profiles) {
          const profilesList = data.data.profiles.map((p: any) => ({
            id: parseInt(p.id, 10),
            name: typeof p.name === 'string' ? p.name : ''
          }));
          setProfiles(profilesList);
          return;
        }
      }
      setProfiles([]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfiles([]);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/wp-json/pifwc/v1/import/jobs?limit=200', {
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data.jobs) {
        const formattedHistory = data.data.jobs.map((job: any) => {
          const profile = profiles.find(p => p.id === job.profile_id);
          const profileName = profile?.name ? profile.name.trim() : '';

          const typeRaw = typeof job.type === 'string' ? job.type : '';
          const typeLabel = typeRaw === 'scheduled' ? t('Scheduled') : t('Manual');
          return {
            id: job.id,
            jobId: job.job_id,
            date: job.started_at || '-',
            profile: profileName ? profileName : (job.profile_id ? t('Profile #') + job.profile_id : t('Quick Import')),
            profileId: job.profile_id,
            type: typeLabel,
            added: job.added || 0,
            updated: job.updated || 0,
            skipped: job.skipped || 0,
            errors: job.errors || 0,
            status: job.status || 'unknown',
            duration: typeof job.duration_seconds === 'number'
              ? formatDurationSeconds(job.duration_seconds)
              : formatDuration(job.started_at, job.finished_at)
          };
        });

        setHistory(formattedHistory);
        
        // Calculate stats
        const totalJobs = formattedHistory.length;
        const successfulJobs = formattedHistory.filter((h: HistoryItem) => h.status === 'completed').length;
        const errorJobs = formattedHistory.filter((h: HistoryItem) => h.status === 'failed').length;
        const totalProcessed = formattedHistory.reduce((sum: number, h: HistoryItem) => 
          sum + h.added + h.updated + h.skipped + h.errors, 0
        );

        setStats({
          total: totalJobs,
          successful: successfulJobs,
          errors: errorJobs,
          processed: totalProcessed
        });
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return '-';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatDurationSeconds = (seconds: number): string => {
    const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${minutes}m ${rest}s`;
  };

  const handleDownloadLog = async (historyId: number, jobId: number) => {
    try {
      const response = await fetch(`/wp-json/pifwc/v1/import/logs/${jobId}`, {
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data.logs) {
        // Create downloadable text file
        const logText = data.data.logs.map((log: any) => 
          `[${log.created_at}] ${log.level}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import-log-${jobId}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading log:', error);
      alert(t('Failed to download log file'));
    }
  };

  const handleViewLog = (jobId: number) => {
    setLogsModalJobId(jobId);
  };

  const handleRepeatImport = async (item: HistoryItem) => {
    if (!confirm(t('Are you sure you want to repeat this import?'))) {
      return;
    }
    
    // If there's a profile ID, navigate to New Import with that profile
    if (item.profileId) {
      if (typeof onNavigate === 'function') {
        onNavigate('new-import', item.profileId);
      } else {
        alert(t('Navigation not available. Please go to New Import and select profile: ') + item.profile);
      }
    } else {
      alert(t('Cannot repeat import: No profile associated with this import job.'));
    }
  };

  const handleAbortImport = async (jobId: number) => {
    if (!confirm(t('Stop this import?'))) {
      return;
    }

    try {
      setAbortJobId(jobId);
      const nonce = (window as any).wpApiSettings?.nonce || (window as any).pifwcAdmin?.nonce || '';
      const response = await fetch(`/wp-json/pifwc/v1/import/abort/${jobId}`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': nonce
        }
      });

      if (!response.ok) {
        throw new Error('Failed to stop import');
      }

      await fetchHistory();
    } catch (error) {
      console.error('Error aborting import:', error);
      alert(t('Failed to stop import'));
    } finally {
      setAbortJobId(null);
    }
  };

  const handleDeleteHistory = async (jobId: number) => {
    if (!confirm(t('Are you sure you want to delete this import record?'))) {
      return;
    }

    try {
      const response = await fetch(`/wp-json/pifwc/v1/import/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete history record');
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        alert(t('History record deleted successfully!'));
        fetchHistory(); // Refresh list
      }
    } catch (error) {
      console.error('Error deleting history:', error);
      alert(t('Failed to delete history record'));
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      setSelectedItems(paginatedHistory.map(item => item.id));
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
      if (newSelected.length === paginatedHistory.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert(t('Please select items to delete'));
      return;
    }

    if (!confirm(t('Are you sure you want to delete {count} import record(s)?', { count: selectedItems.length }))) {
      return;
    }

    try {
      const deletePromises = selectedItems.map(id =>
        fetch(`/wp-json/pifwc/v1/import/jobs/${id}`, {
          method: 'DELETE',
          headers: {
            'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
          }
        })
      );

      await Promise.all(deletePromises);
      
      alert(t('{count} record(s) deleted successfully!', { count: selectedItems.length }));
      setSelectedItems([]);
      setSelectAll(false);
      fetchHistory(); // Refresh list
    } catch (error) {
      console.error('Error deleting records:', error);
      alert(t('Failed to delete some records'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      success: { bg: 'bg-green-100', text: 'text-green-700', label: t('Success') },
      completed_with_errors: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t('Completed with Errors') },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: t('Error') },
      running: { bg: 'bg-blue-100', text: 'text-blue-700', label: t('Running') },
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: t('Pending') },
    };
    const style = styles[status as keyof typeof styles] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const filteredHistory = history.filter(item => {
    if (selectedProfile !== 'all' && item.profileId?.toString() !== selectedProfile) {
      return false;
    }
    if (selectedStatus !== 'all' && item.status !== selectedStatus) {
      return false;
    }
    if (startDate && endDate) {
      const itemDate = new Date(item.date);
      if (itemDate < startDate || itemDate > endDate) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedItems([]);
    setSelectAll(false);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-gray-900">{t('Import History')}</h1>
          {!isPro && <ProBadge />}
        </div>
        <p className="text-gray-600">{t('View import logs and history')}</p>
      </div>

      {!isPro && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-blue-800">
              {t('Advanced history filtering and automation tracking depend on the active plugin configuration.')}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('Profile')}</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={selectedProfile}
              onChange={(e) => {
                setSelectedProfile(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">{t('All Profiles')}</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id.toString()}>
                  {profile.name && profile.name.trim() ? profile.name : t('Profile #') + profile.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('Status')}</label>
            <select 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">{t('All Statuses')}</option>
              <option value="success">{t('Success')}</option>
              <option value="completed_with_errors">{t('Completed with Errors')}</option>
              <option value="error">{t('With Errors')}</option>
              <option value="running">{t('Running')}</option>
              <option value="pending">{t('Pending')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('Date Range')}</label>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => {
                setDateRange(update as [Date | null, Date | null]);
              }}
              monthsShown={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
              placeholderText={t('Select date range')}
              dateFormat="yyyy-MM-dd"
              isClearable={true}
              customInput={
                <button
                  type="button"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:border-gray-400"
                >
                  <span className={startDate || endDate ? "text-gray-900" : "text-gray-400"}>
                    {startDate && endDate
                      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                      : startDate
                      ? `${startDate.toLocaleDateString()} - ...`
                      : t('Select date range')}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </button>
              }
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => {
                setSelectedProfile('all');
                setSelectedStatus('all');
                setDateRange([null, null]);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              {t('Reset Filters')}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
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

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
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
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Date & Time')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Profile')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Type')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Added')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Updated')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Skipped')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Errors')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Status')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Duration')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    {t('No import history found')}
                  </td>
                </tr>
              ) : paginatedHistory.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{item.profile}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.type}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">
                    {item.added > 0 ? (
                      <span className="text-green-600">+{item.added}</span>
                    ) : (
                      item.added
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">
                    {item.updated > 0 ? (
                      <span className="text-blue-600">{item.updated}</span>
                    ) : (
                      item.updated
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">{item.skipped}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    {item.errors > 0 ? (
                      <span className="text-red-600">{item.errors}</span>
                    ) : (
                      <span className="text-gray-600">{item.errors}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.duration}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadLog(item.id, item.jobId)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('Download log')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewLog(item.jobId)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title={t('View log')}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {(item.status === 'running' || item.status === 'pending') && (
                        <button
                          onClick={() => void handleAbortImport(item.jobId)}
                          disabled={abortJobId === item.jobId}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title={t('Stop import')}
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === 'completed' && (
                        <button
                          onClick={() => handleRepeatImport(item)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title={t('Repeat import')}
                        >
                          <RotateCcw className="w-4 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteHistory(item.id)}
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

      {/* Pagination */}
      <div className="mb-6 flex items-center justify-between text-sm text-gray-600">
        <div>
          {t('Showing {start}-{end} of {total} records', { start: startIndex + 1, end: Math.min(endIndex, filteredHistory.length), total: filteredHistory.length })}
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
              className={`px-3 py-1 border rounded ${
                currentPage === page
                  ? 'bg-red-500 text-white border-red-500'
                  : 'border-gray-300 hover:bg-gray-50'
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">{t('Total Imports')}</div>
          <div className="text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">{t('Successful')}</div>
          <div className="text-green-600">{stats.successful}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">{t('With Errors')}</div>
          <div className="text-red-600">{stats.errors}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">{t('Products Processed')}</div>
          <div className="text-gray-900">{stats.processed.toLocaleString()}</div>
        </div>
      </div>

      {/* Logs Modal */}
      {logsModalJobId && (
        <LogsModal
          jobId={logsModalJobId}
          onClose={() => setLogsModalJobId(null)}
        />
      )}
    </div>
  );
}