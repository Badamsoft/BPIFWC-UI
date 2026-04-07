import { ImportProgress } from './ImportProgress';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { StatsCard } from './StatsCard';
import { Clock, FolderOpen, Calendar, AlertTriangle, Plus, FileText, History as HistoryIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { t } from '../utils/i18n';

interface ImportDashboardProps {
  onNavigate: (tab: string) => void;
}

interface RecentImport {
  date: string;
  profile: string;
  type: string;
  status: string;
  added: number;
  updated: number;
  errors: number;
}

type ProfileItem = { id: number; name: string; is_active?: boolean };

type DashboardStats = {
  lastImportLabel: string;
  lastImportSubtitle: string;
  activeProfilesCount: number;
  scheduledProfilesCount: number;
  scheduledImportsCount: number;
  nextRunLabel: string;
  errorsLast24h: number;
  erroredRunsLast24h: number;
  queueCount: number;
  licenseLabel: string;
  cronLabel: string;
  cronOk: boolean;
  queueOk: boolean;
};

export function ImportDashboard({ onNavigate }: ImportDashboardProps) {
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const isPro = !!(window as any).pifwcAdmin?.isPro;
  const [stats, setStats] = useState<DashboardStats>({
    lastImportLabel: '-',
    lastImportSubtitle: '',
    activeProfilesCount: 0,
    scheduledProfilesCount: 0,
    scheduledImportsCount: 0,
    nextRunLabel: '-',
    errorsLast24h: 0,
    erroredRunsLast24h: 0,
    queueCount: 0,
    licenseLabel: '-',
    cronLabel: '-',
    cronOk: true,
    queueOk: true,
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const isPro = !!(window as any).pifwcAdmin?.isPro;
        const nonce = (window as any).wpApiSettings?.nonce || (window as any).pifwcAdmin?.nonce || '';
        const restUrl = (window as any).pifwcAdmin?.restUrl || '/wp-json/pifwc/v1/';

        const emptySchedulesRes = {
          ok: true,
          json: async () => ({ data: { schedules: [] } }),
        } as unknown as Response;

        const emptyLicenseRes = {
          ok: true,
          json: async () => ({ data: { is_pro: false } }),
        } as unknown as Response;

        const [profilesRes, jobsRes, schedulesRes, healthRes, licenseRes] = await Promise.all([
          fetch(addCacheBuster(`${restUrl}profiles?limit=1000`), { headers: { 'X-WP-Nonce': nonce } }),
          fetch(`${restUrl}import/jobs?limit=50`, { headers: { 'X-WP-Nonce': nonce } }),
          isPro
            ? fetch(`${restUrl}schedules`, { headers: { 'X-WP-Nonce': nonce } })
            : Promise.resolve(emptySchedulesRes),
          fetch(`${restUrl}health`, { headers: { 'X-WP-Nonce': nonce } }),
          isPro
            ? fetch(`${restUrl}license/info`, { headers: { 'X-WP-Nonce': nonce } })
            : Promise.resolve(emptyLicenseRes),
        ]);

        const profilesJson = profilesRes.ok ? await profilesRes.json().catch(() => null) : null;
        const jobsJson = jobsRes.ok ? await jobsRes.json().catch(() => null) : null;
        const schedulesJson = schedulesRes.ok ? await schedulesRes.json().catch(() => null) : null;
        const healthJson = healthRes.ok ? await healthRes.json().catch(() => null) : null;
        const licenseJson = licenseRes.ok ? await licenseRes.json().catch(() => null) : null;

        const profileItems: ProfileItem[] = Array.isArray(profilesJson?.data?.profiles)
          ? profilesJson.data.profiles.map((p: any) => ({
              id: Number(p.id),
              name: typeof p.name === 'string' ? p.name : '',
              is_active: Boolean(p.is_active),
            }))
          : [];

        const jobs = Array.isArray(jobsJson?.data?.jobs) ? jobsJson.data.jobs : [];
        const schedules = Array.isArray(schedulesJson?.data?.schedules) ? schedulesJson.data.schedules : [];

        const parseMysql = (value: any): Date | null => {
          if (!value || typeof value !== 'string') return null;
          const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
          if (!m) return null;
          const year = Number(m[1]);
          const month = Number(m[2]);
          const day = Number(m[3]);
          const hour = Number(m[4]);
          const minute = Number(m[5]);
          const second = Number(m[6]);
          if (![year, month, day, hour, minute, second].every(Number.isFinite)) return null;
          return new Date(year, month - 1, day, hour, minute, second);
        };

        const formatRelativeRu = (date: Date | null): string => {
          if (!date) return '-';
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          if (!Number.isFinite(diffMs)) return '-';
          const diffSec = Math.floor(diffMs / 1000);
          if (diffSec < 30) return t('just now');
          const diffMin = Math.floor(diffSec / 60);
          if (diffMin < 60) return `${diffMin} ${t('min ago')}`;
          const diffHr = Math.floor(diffMin / 60);
          if (diffHr < 24) return `${diffHr} ${t('h ago')}`;
          const diffDay = Math.floor(diffHr / 24);
          return `${diffDay} ${t('d ago')}`;
        };

        const formatUntilRu = (date: Date | null): string => {
          if (!date) return '-';
          const now = new Date();
          const diffMs = date.getTime() - now.getTime();
          if (!Number.isFinite(diffMs)) return '-';
          const diffSec = Math.floor(diffMs / 1000);
          if (diffSec <= 0) return t('now');
          const diffMin = Math.floor(diffSec / 60);
          if (diffMin < 60) return `${t('in')} ${diffMin} ${t('min')}`;
          const diffHr = Math.floor(diffMin / 60);
          if (diffHr < 24) return `${t('in')} ${diffHr} ${t('h')}`;
          const diffDay = Math.floor(diffHr / 24);
          return `${t('in')} ${diffDay} ${t('d')}`;
        };

        const lastJob = jobs.length ? jobs[0] : null;
        const lastStartedAt = parseMysql(lastJob?.started_at);
        const lastProcessed = typeof lastJob?.processed === 'number'
          ? lastJob.processed
          : (Number(lastJob?.added || 0) + Number(lastJob?.updated || 0) + Number(lastJob?.skipped || 0) + Number(lastJob?.errors || 0));

        const activeProfilesCount = profileItems.filter((p) => p.is_active).length;
        const enabledSchedules = schedules.filter((s: any) => Boolean(s.enabled));
        const scheduledImportsCount = enabledSchedules.length;
        const nextRunDates: Date[] = enabledSchedules
          .map((s: any): Date | null => parseMysql(s.next_run))
          .filter((d: Date | null): d is Date => Boolean(d));
        const nextRun = nextRunDates.length
          ? new Date(Math.min(...nextRunDates.map((d: Date) => d.getTime())))
          : null;

        const now = new Date();
        const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const jobsLast24h = jobs.filter((j: any) => {
          const d = parseMysql(j.started_at);
          return d ? d.getTime() >= since24h.getTime() : false;
        });
        const errorsLast24h = jobsLast24h.reduce((sum: number, j: any) => sum + Number(j.errors || 0), 0);
        const erroredRunsLast24h = jobsLast24h.filter((j: any) => Number(j.errors || 0) > 0).length;

        const queueCount = jobs.filter((j: any) => {
          const st = typeof j.status === 'string' ? j.status : '';
          return st === 'running' || st === 'pending' || st === 'processing';
        }).length;

        const licenseLabel = (() => {
          const info = licenseJson?.data;
          if (info && typeof info === 'object') {
            const isPro = Boolean(info.is_pro);
            return isPro ? t('Commercial add-on active') : t('Default configuration');
          }
          const isPro = Boolean(healthJson?.data?.is_pro);
          return isPro ? t('Commercial add-on active') : t('Default configuration');
        })();

        const cronOk = scheduledImportsCount === 0 || Boolean(nextRun);
        const cronLabel = scheduledImportsCount === 0 ? t('No tasks') : cronOk ? t('Active') : t('Not scheduled');

        const queueOk = queueCount === 0;

        const formattedImports: RecentImport[] = jobs.slice(0, 5).map((job: any) => {
          const profile = profileItems.find((p) => p.id === job.profile_id);
          const profileName = profile?.name ? profile.name.trim() : '';
          const typeRaw = typeof job.type === 'string' ? job.type : '';
          const typeLabel = typeRaw === 'scheduled' ? t('Scheduled') : t('Manual');
          return {
            date: job.started_at || '-',
            profile: profileName ? profileName : (job.profile_id ? `Profile #${job.profile_id}` : t('Quick Import')),
            type: typeLabel,
            status: job.status || 'unknown',
            added: job.added || 0,
            updated: job.updated || 0,
            errors: job.errors || 0,
          };
        });

        if (!isMounted) return;
        setProfiles(profileItems);
        setRecentImports(formattedImports);
        setStats({
          lastImportLabel: formatRelativeRu(lastStartedAt),
          lastImportSubtitle: lastJob ? `${t('processed')} ${lastProcessed} ${t('rows')}` : '',
          activeProfilesCount,
          scheduledProfilesCount: enabledSchedules.length,
          scheduledImportsCount,
          nextRunLabel: scheduledImportsCount ? formatUntilRu(nextRun) : '-',
          errorsLast24h,
          erroredRunsLast24h,
          queueCount,
          licenseLabel,
          cronLabel,
          cronOk,
          queueOk,
        });
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      completed_with_errors: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700',
      aborted: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: t('Success'),
      completed_with_errors: t('Has Errors'),
      failed: t('Error'),
      aborted: t('Stopped'),
      running: t('In Progress'),
      pending: t('Pending')
    };
    return labels[status] || status;
  };

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl text-gray-900 mb-2">{t('Import Dashboard')}</h1>
        <p className="text-gray-500">{t('WooCommerce product import management')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={t('Last Import')}
          value={stats.lastImportLabel}
          icon={Clock}
          color="red"
          subtitle={stats.lastImportSubtitle}
        />
        <StatsCard
          title={t('Active Profiles')}
          value={stats.activeProfilesCount}
          icon={FolderOpen}
          color="green"
          subtitle={`${stats.scheduledProfilesCount} ${t('scheduled')}`}
        />
        {isPro && (
          <StatsCard
            title={t('Scheduled Imports')}
            value={stats.scheduledImportsCount}
            icon={Calendar}
            color="purple"
            subtitle={stats.scheduledImportsCount ? `${t('Next')} ${stats.nextRunLabel}` : ''}
          />
        )}
        <StatsCard
          title={t('Errors in 24 hours')}
          value={stats.errorsLast24h}
          icon={AlertTriangle}
          color="orange"
          subtitle={stats.erroredRunsLast24h ? `${stats.erroredRunsLast24h} ${t('import(s) with errors')}` : ''}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg text-gray-900 mb-4">{t('Quick Actions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('new-import')}
            className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white rounded-lg transition-colors text-left hover:bg-red-600"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">{t('New Import')}</span>
          </button>
          <button
            onClick={() => onNavigate('profiles')}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg border border-red-500 hover:bg-gray-50 transition-colors text-left"
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-sm">{t('Profiles')}</span>
          </button>
          {isPro && (
            <button
              onClick={() => onNavigate('scheduled-imports')}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg border border-red-500 hover:bg-gray-50 transition-colors text-left"
            >
              <Calendar className="w-5 h-5" />
              <span className="flex-1 text-sm">{t('Schedule')}</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg border border-red-500 hover:bg-gray-50 transition-colors text-left"
          >
            <FileText className="w-5 h-5" />
            <span className="text-sm">{t('Logs')}</span>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg text-gray-900 mb-4">{t('System Status')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${stats.cronOk ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
            <div>
              <p className="text-sm text-gray-500">{t('Cron')}</p>
              <p className="text-gray-900">{stats.cronLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm text-gray-500">{t('License')}</p>
              <p className="text-gray-900">{stats.licenseLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${stats.queueOk ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
            <div>
              <p className="text-sm text-gray-500">{t('Import Queue')}</p>
              <p className="text-gray-900">
                {stats.queueCount ? `${stats.queueCount} ${t('job(s) in progress')}` : t('Empty')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Imports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-gray-900">{t('Recent Operations')}</h2>
          <button
            onClick={() => onNavigate('history')}
            className="text-sm text-red-500 hover:text-red-600"
          >
            {t('View All')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm text-gray-500">{t('Date')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">{t('Profile')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">{t('Type')}</th>
                <th className="text-left py-3 px-4 text-sm text-gray-500">{t('Status')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">{t('Added')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">{t('Updated')}</th>
                <th className="text-right py-3 px-4 text-sm text-gray-500">{t('Errors')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : recentImports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    {t('No import data')}
                  </td>
                </tr>
              ) : (
                recentImports.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-500">{item.date}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.profile}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{item.type}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}