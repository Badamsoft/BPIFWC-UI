import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, Edit, Trash2, Plus, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { t } from '../utils/i18n';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ScheduledImportsProps {
  prefillProfileId?: number | null;
  prefillNonce?: number;
}

export function ScheduledImports({ prefillProfileId, prefillNonce }: ScheduledImportsProps) {
  const isPro = !!(window as any).pifwcAdmin?.isPro;
  if (!isPro) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-gray-900 mb-4">{t('Scheduled Imports')}</h1>
            <p className="text-gray-600 mb-4">
              {t('Scheduled imports are not supported by the active plugin configuration.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  type ProfileOption = { id: number; name: string };
  type TimezonesResponse = { default_timezone?: string; timezones?: string[] };
  type ApiSchedule = {
    id: number;
    profile_id: number;
    profile_name: string;
    schedule: any;
    enabled: boolean;
    last_run?: any;
    next_run?: string | null;
  };

  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [runTimes, setRunTimes] = useState(['09:00']);
  const [runTimeDraft, setRunTimeDraft] = useState('09:00');
  const [isActive, setIsActive] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | null>(null);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [timezones, setTimezones] = useState<string[]>([]);
  const [defaultTimezone, setDefaultTimezone] = useState<string>('');
  const [timezonesLoading, setTimezonesLoading] = useState(false);
  const [timezonesError, setTimezonesError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runNowProfileId, setRunNowProfileId] = useState<number | null>(null);

  const [cronUrl, setCronUrl] = useState<string>('');
  const [cronTokenLoading, setCronTokenLoading] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const getNonce = () => (window as any).wpApiSettings?.nonce || (window as any).pifwcAdmin?.nonce || '';

  // Generate consistent color for profile based on profile_id
  const getProfileColor = (profileId: number) => {
    const hue = (profileId * 137.508) % 360; // Golden angle for good distribution
    return `hsl(${hue}, 70%, 85%)`; // Soft pastel colors
  };

  const getProfileTextColor = (profileId: number) => {
    const hue = (profileId * 137.508) % 360;
    return `hsl(${hue}, 70%, 35%)`; // Darker text for contrast
  };

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

  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true);
      setProfilesError(null);
      const data = await apiFetchJson('/wp-json/pifwc/v1/schedules/eligible-profiles');
      const list = (data?.data?.profiles || []) as any[];
      setProfiles(
        list.map((p) => ({
          id: Number(p.id),
          name: String(p.name || `Profile #${p.id}`)
        }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load profiles';
      setProfilesError(msg);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };

  const fetchTimezones = async () => {
    try {
      setTimezonesLoading(true);
      setTimezonesError(null);
      const data = await apiFetchJson('/wp-json/pifwc/v1/timezones');
      const payload = (data?.data || {}) as TimezonesResponse;
      const tz = Array.isArray(payload.timezones) ? payload.timezones.map((x) => String(x)) : [];
      setTimezones(tz);
      setDefaultTimezone(String(payload.default_timezone || ''));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load timezones';
      setTimezonesError(msg);
      setTimezones([]);
      setDefaultTimezone('');
    } finally {
      setTimezonesLoading(false);
    }
  };

  const fetchSchedules = async () => {
    const data = await apiFetchJson('/wp-json/pifwc/v1/schedules');
    setSchedules((data?.data?.schedules || []) as ApiSchedule[]);
  };

  const fetchCronToken = async () => {
    try {
      setCronTokenLoading(true);
      const data = await apiFetchJson('/wp-json/pifwc/v1/cron/token');
      const url = String(data?.data?.url || '');
      setCronUrl(url);
    } catch (e) {
      setCronUrl('');
    } finally {
      setCronTokenLoading(false);
    }
  };

  const regenerateCronToken = async () => {
    const confirmed = confirm(t('Regenerate cron token? Old cron URL will stop working.'));
    if (!confirmed) return;
    try {
      setCronTokenLoading(true);
      const data = await apiFetchJson('/wp-json/pifwc/v1/cron/token/regenerate', { method: 'POST' });
      const url = String(data?.data?.url || '');
      setCronUrl(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to regenerate token';
      setError(msg);
    } finally {
      setCronTokenLoading(false);
    }
  };

  const buildSchedulePayload = () => {
    const schedule_type = frequency;

    const payload: any = {
      enabled: isActive && schedule_type !== 'none',
      schedule_name: scheduleName,
      schedule_type,
      times: runTimes,
      notification_email: notificationEmail
    };

    if (timezone) {
      payload.timezone = timezone;
    }

    if (schedule_type === 'weekly') {
      payload.days = selectedDays;
    }

    if (schedule_type === 'monthly') {
      const d = Number(dayOfMonth);
      payload.days = [Number.isFinite(d) && d > 0 ? d : 1];
    }

    if (schedule_type === 'cron') {
      payload.cron_expression = cronExpression;
    }

    if (useDateRange) {
      if (scheduleStartDate) {
        payload.start_date = scheduleStartDate.toISOString().slice(0, 10);
      }
      if (scheduleEndDate) {
        payload.end_date = scheduleEndDate.toISOString().slice(0, 10);
      }
    }

    return payload;
  };

  const resetForm = () => {
    setEditingProfileId(null);
    setScheduleName('');
    setSelectedProfile('');
    setFrequency('weekly');
    setSelectedDays(['Mon']);
    setTimezone('');
    setRunTimes(['09:00']);
    setRunTimeDraft('09:00');
    setIsActive(true);
    setUseDateRange(false);
    setScheduleStartDate(null);
    setScheduleEndDate(null);
    setDayOfMonth('1');
    setCronExpression('0 0 * * *');
    setNotificationEmail('');
  };

  const openCreateModal = () => {
    resetForm();
    if (!profilesLoading && profiles.length === 0) {
      fetchProfiles();
    }
    if (!timezonesLoading && timezones.length === 0) {
      fetchTimezones();
    }
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (!prefillNonce || !prefillProfileId) {
      return;
    }

    resetForm();
    setEditingProfileId(null);
    setSelectedProfile(String(prefillProfileId));

    if (!profilesLoading && profiles.length === 0) {
      fetchProfiles();
    }
    if (!timezonesLoading && timezones.length === 0) {
      fetchTimezones();
    }

    setShowCreateModal(true);
  }, [prefillNonce]);

  const openEditModal = (schedule: ApiSchedule) => {
    const s = schedule.schedule || {};

    setEditingProfileId(schedule.profile_id);
    setSelectedProfile(String(schedule.profile_id));
    setScheduleName(String(s.schedule_name || ''));
    setIsActive(Boolean(s.enabled));

    const t = String(s.schedule_type || s.frequency || 'weekly');
    setFrequency(t);

    setTimezone(String(s.timezone || ''));

    const times = Array.isArray(s.times) ? s.times : Array.isArray(s.run_times) ? s.run_times : [];
    setRunTimes(times.length ? times.map((x: any) => String(x)) : ['09:00']);
    setRunTimeDraft('09:00');

    if (t === 'weekly') {
      const days = Array.isArray(s.days) ? s.days : [];
      const map: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
      const next = days
        .map((d: any) => (typeof d === 'number' ? map[d] : null))
        .filter((x: any) => Boolean(x));
      setSelectedDays(next.length ? next : ['Mon']);
    }

    if (t === 'monthly') {
      const days = Array.isArray(s.days) ? s.days : [];
      const d = days.length ? Number(days[0]) : 1;
      setDayOfMonth(String(d || 1));
    }

    if (t === 'cron') {
      setCronExpression(String(s.cron_expression || '0 0 * * *'));
    }

    const start = s.start_date ? new Date(String(s.start_date)) : null;
    const end = s.end_date ? new Date(String(s.end_date)) : null;
    const hasRange = Boolean(start || end);
    setUseDateRange(hasRange);
    setScheduleStartDate(start);
    setScheduleEndDate(end);

    setNotificationEmail(String(s.notification_email || ''));

    setShowCreateModal(true);
  };

  const saveSchedule = async (profileId: number) => {
    const payload = buildSchedulePayload();
    await apiFetchJson(`/wp-json/pifwc/v1/schedules/${profileId}?_nocache=${Date.now()}`, {
      method: 'POST',
      body: JSON.stringify({ schedule: payload })
    });
  };

  const setScheduleEnabled = async (profileId: number, enabled: boolean) => {
    await apiFetchJson(`/wp-json/pifwc/v1/schedules/${profileId}/${enabled ? 'enable' : 'disable'}`, {
      method: 'POST'
    });
  };

  const deleteSchedule = async (profileId: number) => {
    await apiFetchJson(`/wp-json/pifwc/v1/schedules/${profileId}`, {
      method: 'DELETE'
    });
  };

  const runNow = async (profileId: number) => {
    await apiFetchJson(`/wp-json/pifwc/v1/schedules/${profileId}/trigger`, {
      method: 'POST'
    });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([fetchProfiles(), fetchSchedules(), fetchTimezones(), fetchCronToken()]);
      } catch (e) {
        if (!isMounted) return;
        const msg = e instanceof Error ? e.message : 'Failed to load schedules';
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: t('Active') },
      paused: { bg: 'bg-gray-100', text: 'text-gray-700', label: t('Paused') },
      ongoing: { bg: 'bg-blue-100', text: 'text-blue-700', label: t('Ongoing') },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev: string[]) =>
      prev.includes(day) ? prev.filter((d: string) => d !== day) : [...prev, day]
    );
  };

  const normalizeTime = (value: string): string | null => {
    const v = value.trim();
    const match = v.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;

    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const addRunTime = (rawValue: string) => {
    const value = normalizeTime(rawValue);
    if (!value) return;

    if (runTimes.includes(value)) return;

    const next = [...runTimes, value]
      .map((t) => normalizeTime(t) || null)
      .filter((t): t is string => Boolean(t))
      .sort();

    setRunTimes(next);
    setRunTimeDraft('09:00');
  };

  const removeRunTime = (rawValue: string) => {
    const value = normalizeTime(rawValue);
    if (!value) return;
    setRunTimes(runTimes.filter((t) => t !== value));
  };

  const handleCreateSchedule = () => {
    (async () => {
      try {
        setError(null);
        const id = Number(selectedProfile || editingProfileId || 0);
        if (!id) {
          throw new Error(t('Please select a profile.'));
        }

        const normalizedTimes = runTimes
          .map((t) => normalizeTime(t) || null)
          .filter((t): t is string => Boolean(t));

        if (normalizedTimes.length !== runTimes.length || normalizedTimes.length === 0) {
          throw new Error(t('Invalid time format. Please use HH:MM (e.g. 09:00).'));
        }

        setRunTimes(normalizedTimes);

        await saveSchedule(id);
        await fetchSchedules();

        setShowCreateModal(false);
        resetForm();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save schedule';
        setError(msg);
      }
    })();
  };

  // Count schedules by status
  const allCount = schedules.length;
  const activeCount = schedules.filter((s: ApiSchedule) => !!s.enabled).length;
  const pausedCount = schedules.filter((s: ApiSchedule) => !s.enabled).length;

  const formatScheduleFrequency = (s: any) => {
    const scheduleType = String(s?.schedule_type || s?.frequency || '').toLowerCase();
    if (scheduleType === 'weekly') return t('Weekly');
    if (scheduleType === 'monthly') return t('Monthly');
    if (scheduleType === 'cron') return t('Cron');
    if (scheduleType === 'none') return t('Manual');
    if (scheduleType === 'daily') return t('Daily');
    if (scheduleType === 'hourly') return t('Hourly');
    if (scheduleType === 'custom') return t('Custom');
    return t('Schedule');
  };

  const formatScheduleTime = (s: any) => {
    const scheduleType = String(s?.schedule_type || s?.frequency || '').toLowerCase();
    if (scheduleType === 'cron') {
      return s?.cron_expression ? `Cron: ${String(s.cron_expression)}` : 'Cron';
    }

    const times = Array.isArray(s?.times) ? s.times : [];
    if (times.length) {
      return times.map((x: any) => String(x)).join(', ');
    }

    if (s?.time) {
      return String(s.time);
    }

    return '—';
  };

  const formatDateRange = (s: any) => {
    const start = s?.start_date ? String(s.start_date) : '';
    const end = s?.end_date ? String(s.end_date) : '';
    if (!start && !end) return t('Ongoing');
    if (start && end) return `${start} - ${end}`;
    if (start) return `${start} -`; 
    return `- ${end}`;
  };

  const scheduleRows = schedules.map((sch: ApiSchedule) => {
    const s = sch.schedule || {};
    const status = sch.enabled ? 'active' : 'paused';
    return {
      id: sch.profile_id,
      profileId: sch.profile_id,
      profile: sch.profile_name,
      frequency: formatScheduleFrequency(s),
      time: formatScheduleTime(s),
      status,
      lastRun: sch.last_run?.created_at || sch.last_run?.updated_at || 'Never',
      nextRun: sch.enabled ? (sch.next_run || '—') : 'Paused',
      dateRange: formatDateRange(s),
      raw: sch
    };
  });

  const filteredRows = scheduleRows
    .filter((row: (typeof scheduleRows)[number]) => {
      if (filterStatus === 'all') return true;
      return row.status === filterStatus;
    })
    .filter((row: (typeof scheduleRows)[number]) =>
      row.profile.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Calendar functions
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    // Returns 0 for Sunday, 1 for Monday, etc.
    const day = new Date(year, month, 1).getDay();
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getSchedulesForDay = (day: number) => {
    return schedules.filter((s: ApiSchedule) => {
      if (!s.enabled) return false;
      
      const schedule = s.schedule || {};
      const frequency = schedule.schedule_type || schedule.frequency || 'daily';
      const runTimes = schedule.times || schedule.run_times || ['09:00'];
      const days = schedule.days || [];
      const dayOfMonth = schedule.day_of_month || 1;
      
      // Check if this day matches the schedule
      const date = new Date(selectedYear, selectedMonth, day);
      const jsDay = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      
      if (frequency === 'daily') {
        return true;
      } else if (frequency === 'weekly') {
        // Days are stored as numbers: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
        // Convert JS day (0=Sun, 1=Mon, ..., 6=Sat) to our format (1=Mon, ..., 7=Sun)
        const ourDayNumber = jsDay === 0 ? 7 : jsDay;
        
        // Check if days contains numbers or strings
        if (days.length > 0 && typeof days[0] === 'number') {
          return days.includes(ourDayNumber);
        } else {
          // Fallback for string format
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][jsDay];
          return days.includes(dayName);
        }
      } else if (frequency === 'monthly') {
        return day === parseInt(String(dayOfMonth), 10);
      }
      
      return false;
    }).map(s => ({
      ...s,
      times: (s.schedule?.times || s.schedule?.run_times || ['09:00']).map((time: string) => time)
    }));
  };

  const hasScheduleOnDay = (day: number) => {
    return getSchedulesForDay(day).length > 0;
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, isCurrentMonth: false });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }

    return days;
  };

  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">{t('Scheduled Imports')}</h1>
        <p className="text-gray-600">{t('Manage automatic import schedules')}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-[260px]">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('Secure Cron URL')}</h3>
            <p className="text-xs text-gray-600 mb-3">
              {t('Use this in your server cron to guarantee scheduled imports run.')}
            </p>
          </div>
          <div className="flex-1 min-w-[280px]">
            <input
              value={cronUrl || (cronTokenLoading ? 'Loading…' : '')}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
              placeholder=""
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!cronUrl) return;
                navigator.clipboard?.writeText(cronUrl);
              }}
              disabled={!cronUrl}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 disabled:opacity-50"
            >
              {t('Copy')}
            </button>
            <button
              onClick={() => void regenerateCronToken()}
              disabled={cronTokenLoading}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {t('Regenerate')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-red-500 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('List of Schedules')}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 transition-colors ${
              activeTab === 'calendar'
                ? 'border-b-2 border-red-500 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('Schedule Calendar')}
          </button>
        </div>
      </div>

      {/* Filter Bar - Only for List Tab */}
      {activeTab === 'list' && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'all'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('All schedules')} ({allCount})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'active'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('Active')} ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'paused'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('Paused')} ({pausedCount})
            </button>
            
            {/* Search Box */}
            <div className="relative ml-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search by profile name...')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent w-64"
              />
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('Create Schedule')}
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {error && (
            <div className="p-4 border-b border-gray-200 bg-red-50 text-red-800 text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="p-4 border-b border-gray-200 bg-gray-50 text-gray-600 text-sm">
              {t('Loading...')}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Profile')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Frequency')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Time')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Date Range')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Last Run')}</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">{t('Next Run')}</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-600">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((schedule) => (
                    <tr key={schedule.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{schedule.profile}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded text-xs border border-red-200">
                          {schedule.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.time}</td>
                      <td className="py-3 px-4">{getStatusBadge(schedule.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.dateRange}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.lastRun}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.nextRun}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              (async () => {
                                try {
                                  if (!confirm(t('Run this import now?'))) return;
                                  setRunNowProfileId(schedule.profileId);
                                  await runNow(schedule.profileId);
                                  await fetchSchedules();
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : 'Failed to trigger import';
                                  setError(msg);
                                } finally {
                                  setRunNowProfileId(null);
                                }
                              })();
                            }}
                            disabled={runNowProfileId === schedule.profileId}
                            className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            title={t('Run now')}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(schedule.raw)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {schedule.status === 'active' ? (
                            <button
                              onClick={() => {
                                (async () => {
                                  try {
                                    await setScheduleEnabled(schedule.profileId, false);
                                    await fetchSchedules();
                                  } catch (e) {
                                    const msg = e instanceof Error ? e.message : 'Failed to pause schedule';
                                    setError(msg);
                                  }
                                })();
                              }}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title={t('Pause')}
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                (async () => {
                                  try {
                                    await setScheduleEnabled(schedule.profileId, true);
                                    await fetchSchedules();
                                  } catch (e) {
                                    const msg = e instanceof Error ? e.message : 'Failed to resume schedule';
                                    setError(msg);
                                  }
                                })();
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title={t('Resume')}
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              (async () => {
                                try {
                                  if (!confirm(t('Delete this schedule?'))) return;
                                  await deleteSchedule(schedule.profileId);
                                  await fetchSchedules();
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : 'Failed to delete schedule';
                                  setError(msg);
                                }
                              })();
                            }}
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
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-gray-900">{t('Schedule Calendar')}</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-gray-900">
              {monthNames[selectedMonth]} {selectedYear}
            </div>
            <button
              onClick={nextMonth}
              className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
            {generateCalendarDays().map((day, index) => {
              const isTodayFlag = isToday(day.day, selectedMonth, selectedYear);
              const daySchedules = day.day > 0 ? getSchedulesForDay(day.day) : [];
              const hasSchedules = daySchedules.length > 0;
              const showOverflow = daySchedules.length > 2;
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (day.day > 0 && hasSchedules) {
                      setSelectedDayForModal(day.day);
                      setShowDayModal(true);
                    }
                  }}
                  className={`min-h-[120px] border rounded p-1 text-left overflow-hidden ${
                    day.day < 1 || day.day > 31
                      ? 'bg-gray-50 text-gray-400'
                      : isTodayFlag
                      ? 'bg-blue-50 border-blue-500'
                      : hasSchedules
                      ? 'border-gray-300 hover:border-gray-400 cursor-pointer'
                      : 'border-gray-200'
                  }`}
                >
                  {day.day > 0 && day.day <= 31 && (
                    <>
                      <div className={`text-xs font-semibold mb-1 px-1 ${isTodayFlag ? 'text-blue-700' : 'text-gray-700'}`}>
                        {day.day}
                      </div>
                      <div className="space-y-0.5">
                        {daySchedules.slice(0, 2).map((schedule: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-[10px] px-1 py-0.5 rounded truncate"
                            style={{
                              backgroundColor: getProfileColor(schedule.profile_id),
                              color: getProfileTextColor(schedule.profile_id)
                            }}
                            title={`${schedule.schedule?.name || schedule.profile_name} - ${schedule.times.join(', ')}`}
                          >
                            <div className="font-medium truncate">
                              {schedule.times[0]}
                            </div>
                            <div className="truncate opacity-90">
                              {schedule.schedule?.name || schedule.profile_name}
                            </div>
                          </div>
                        ))}
                        {showOverflow && (
                          <div className="text-[10px] px-1 py-0.5 text-gray-600 font-medium">
                            +{daySchedules.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayModal && selectedDayForModal !== null && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('Schedules for')} {selectedDayForModal} {monthNames[selectedMonth]} {selectedYear}
              </h2>
              <button
                onClick={() => {
                  setShowDayModal(false);
                  setSelectedDayForModal(null);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {getSchedulesForDay(selectedDayForModal).length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('No scheduled imports for this day')}</p>
              ) : (
                <div className="space-y-3">
                  {getSchedulesForDay(selectedDayForModal).map((schedule: any) => {
                    const lastRunStatus = schedule.last_run?.status || 'pending';
                    const statusColors = {
                      completed: 'text-green-600',
                      failed: 'text-red-600',
                      running: 'text-blue-600',
                      pending: 'text-gray-600'
                    };
                    const statusIcons = {
                      completed: '✓',
                      failed: '✗',
                      running: '⟳',
                      pending: '○'
                    };
                    
                    return (
                      <div
                        key={schedule.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: getProfileTextColor(schedule.profile_id)
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {schedule.schedule?.name || schedule.profile_name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {t('Profile')}: {schedule.profile_name}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowDayModal(false);
                                openEditModal(schedule);
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                (async () => {
                                  try {
                                    await setScheduleEnabled(schedule.profile_id, !schedule.enabled);
                                    await fetchSchedules();
                                  } catch (e) {
                                    const msg = e instanceof Error ? e.message : 'Failed to toggle schedule';
                                    setError(msg);
                                  }
                                })();
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title={schedule.enabled ? t('Pause') : t('Resume')}
                            >
                              {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-2">{t('Runs on this day')}</p>
                          <div className="space-y-2">
                            {schedule.times.map((time: string, idx: number) => {
                              const scheduledDateTime = new Date(selectedYear, selectedMonth, selectedDayForModal || 1);
                              const [hours, minutes] = time.split(':');
                              scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              
                              const now = new Date();
                              const isPast = scheduledDateTime < now;
                              const isToday = selectedDayForModal === now.getDate() && 
                                             selectedMonth === now.getMonth() && 
                                             selectedYear === now.getFullYear();
                              
                              // Determine status based on schedule data
                              let status = 'scheduled';
                              let statusText = t('Scheduled');
                              let statusIcon = '○';
                              
                              // Check if this is currently running (next_run matches this time)
                              if (schedule.next_run) {
                                const nextRun = new Date(schedule.next_run);
                                const nextRunTime = `${String(nextRun.getHours()).padStart(2, '0')}:${String(nextRun.getMinutes()).padStart(2, '0')}`;
                                if (nextRunTime === time && 
                                    nextRun.getDate() === selectedDayForModal &&
                                    nextRun.getMonth() === selectedMonth &&
                                    nextRun.getFullYear() === selectedYear) {
                                  const timeDiff = now.getTime() - nextRun.getTime();
                                  // If within 5 minutes of scheduled time, consider it running
                                  if (timeDiff >= 0 && timeDiff < 5 * 60 * 1000) {
                                    status = 'running';
                                    statusText = t('Running');
                                    statusIcon = '⟳';
                                  }
                                }
                              }
                              
                              // Check if completed (past time on today or any past day)
                              if (status === 'scheduled' && isPast) {
                                if (isToday) {
                                  // Check last_run to see if it was successful
                                  if (schedule.last_run?.status === 'completed' || schedule.last_run?.status === 'completed_with_errors') {
                                    status = 'completed';
                                    statusText = t('Completed');
                                    statusIcon = '✓';
                                  } else if (schedule.last_run?.status === 'failed') {
                                    status = 'failed';
                                    statusText = t('Error');
                                    statusIcon = '✗';
                                  } else {
                                    status = 'completed';
                                    statusText = t('Completed');
                                    statusIcon = '✓';
                                  }
                                } else {
                                  // Past day - assume completed
                                  status = 'completed';
                                  statusText = t('Completed');
                                  statusIcon = '✓';
                                }
                              }
                              
                              const statusColors: Record<string, string> = {
                                scheduled: getProfileTextColor(schedule.profile_id),
                                running: '#2563eb',
                                completed: '#16a34a',
                                failed: '#dc2626'
                              };
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 rounded border"
                                  style={{
                                    backgroundColor: getProfileColor(schedule.profile_id),
                                    borderColor: getProfileTextColor(schedule.profile_id),
                                    opacity: status === 'completed' && isToday ? 0.7 : 1
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" style={{ color: getProfileTextColor(schedule.profile_id) }} />
                                    <span className="font-medium" style={{ color: getProfileTextColor(schedule.profile_id) }}>
                                      {time}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm" style={{ color: statusColors[status] }}>
                                      {statusIcon}
                                    </span>
                                    <span className="text-xs font-medium" style={{ color: statusColors[status] }}>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            {t('Frequency')}: <span className="font-medium text-gray-700">
                              {schedule.schedule?.frequency === 'daily' && t('Daily')}
                              {schedule.schedule?.frequency === 'weekly' && t('Weekly')}
                              {schedule.schedule?.frequency === 'monthly' && t('Monthly')}
                            </span>
                          </div>
                          {schedule.next_run && (
                            <div className="text-xs text-gray-500">
                              {t('Next run')}: <span className="font-medium text-gray-700">
                                {new Date(schedule.next_run).toLocaleString('en-US')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-gray-900">{editingProfileId ? t('Edit Schedule') : t('Create Schedule')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Schedule Name and Import Profile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    {t('Schedule name')}
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={t('Enter schedule name')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    {t('Import Profile')}
                  </label>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">
                      {profilesLoading
                        ? t('Loading profiles...')
                        : profilesError
                        ? t('Failed to load profiles')
                        : profiles.length === 0
                        ? t('No eligible profiles (run a successful manual import in New Import first)')
                        : t('Select a profile...')}
                    </option>
                    {profiles.map((p: ProfileOption) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm text-gray-700 mb-3">
                  {t('Frequency')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={frequency === 'weekly'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{t('Weekly')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="monthly"
                      checked={frequency === 'monthly'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{t('Monthly')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="cron"
                      checked={frequency === 'cron'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{t('Manual (cron expression)')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="none"
                      checked={frequency === 'none'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{t('None (manual only)')}</span>
                  </label>
                </div>
              </div>

              {/* Run on days */}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    {t('Run on days')}
                  </label>
                  <div className="flex gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          selectedDays.includes(day)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of Month - for Monthly */}
              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    {t('Day of month')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Cron Expression - for Manual */}
              {frequency === 'cron' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    {t('Cron expression')}
                  </label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 0 * * *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('Standard cron syntax: minute hour day month weekday')}
                  </p>
                </div>
              )}

              {/* Timezone */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {t('Time zone (defaults to WordPress setting)')}
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">
                    {timezonesLoading
                      ? t('Loading timezones...')
                      : timezonesError
                      ? t('Failed to load timezones')
                      : defaultTimezone
                      ? `WordPress default (${defaultTimezone})`
                      : 'WordPress default'}
                  </option>
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Run at times */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Run at times
                </label>
                <div className="wc-pce-time-chips" aria-label="Selected times">
                  {runTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className="button button-secondary wc-pce-time-chip"
                      onClick={() => removeRunTime(time)}
                      data-time-chip
                      data-time={time}
                      title="Remove time"
                    >
                      {time} ×
                    </button>
                  ))}
                </div>
                <div className="wc-pce-time-adder mt-3">
                  <input
                    type="time"
                    value={runTimeDraft}
                    onChange={(e) => setRunTimeDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRunTime(runTimeDraft);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => addRunTime(runTimeDraft)}
                  >
                    Add time
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                    className="w-4 h-4 text-red-500 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Set schedule date range</span>
                </label>
                
                {useDateRange && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Date
                      </label>
                      <DatePicker
                        selected={scheduleStartDate || undefined}
                        onChange={(date: Date | null) => setScheduleStartDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={scheduleEndDate || undefined}
                        onChange={(date: Date | null) => setScheduleEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                        minDate={scheduleStartDate || undefined}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {!useDateRange && (
                  <p className="text-xs text-gray-500 pl-6">
                    Schedule will run from today with no end date
                  </p>
                )}
              </div>

              {/* Notification Email */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-red-500 focus:ring-red-500 rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}