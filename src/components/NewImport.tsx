import { useState, useEffect, useRef, type ChangeEvent, type ComponentType } from 'react';
import {
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Play,
  X,
  Save,
  Link,
  Server,
  FileText,
  FileSpreadsheet,
  Code
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import { FieldMapping } from './FieldMapping';
import { DatePickerWithFooter } from './DatePickerWithFooter';
import { ImportProgress } from './ImportProgress';
import { addCacheBuster, getWpNonce } from '../utils/api';
import { t } from '../utils/i18n';
import { ProBadge } from './ProBadge';
import { LicenseActivationModal } from './LicenseActivationModal';

interface NewImportProps {
  onNavigate: (tab: string, profileId?: number) => void;
  editProfileId?: number | null;
  resetNonce?: number;
}

type SourceOption = {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  pro?: boolean;
};

type FormatOption = {
  id: string;
  name: string;
  pro?: boolean;
};

export function NewImport({ onNavigate, editProfileId, resetNonce }: NewImportProps) {
  const [isPro, setIsPro] = useState(Boolean((window as any).pifwcAdmin?.isPro));
  const isProAddonInstalled = Boolean((window as any).pifwcAdmin?.isProAddonInstalled ?? isPro);
  const upgradeUrl = (window as any).pifwcAdmin?.upgradeUrl
    || 'https://badamsoft.com/plugins/badamsoft-product-importer-for-woocommerce/';
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Start from step 1
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [updateMode, setUpdateMode] = useState<string>('both');
  const [comparisonKey, setComparisonKey] = useState<string>('sku');
  const [conflictBehavior, setConflictBehavior] = useState<string>('update');
  const [updatePreset, setUpdatePreset] = useState<string>('all');
  const [updateGroups, setUpdateGroups] = useState<Record<string, boolean>>({
    content: true,
    pricing: true,
    inventory: true,
    shipping: true,
    taxonomies: true,
    images: true,
    attributes: true,
    meta: true,
  });
  const [skipEmptyValues, setSkipEmptyValues] = useState<boolean>(true);
  const [skipManualChanges, setSkipManualChanges] = useState<boolean>(false);
  const [deleteMissingProducts, setDeleteMissingProducts] = useState<boolean>(false);
  const [updateImages, setUpdateImages] = useState<boolean>(true);
  const [postStatus, setPostStatus] = useState<string>('published');
  const [postDates, setPostDates] = useState<string>('as-specified');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [asSpecifiedDate, setAsSpecifiedDate] = useState<Date | null>(new Date());
  const [randomStartDate, setRandomStartDate] = useState<Date | null>(new Date());
  const [randomEndDate, setRandomEndDate] = useState<Date | null>(new Date());
  
  // File upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [showUploadedFiles, setShowUploadedFiles] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<any[]>([]);
  const [isLoadingUploadedFiles, setIsLoadingUploadedFiles] = useState(false);
  const [selectedUploadedFile, setSelectedUploadedFile] = useState<any>(null);
  
  // Preview data states
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  // Field mapping states
  const [fieldMappings, setFieldMappings] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [productType, setProductType] = useState<'simple' | 'variable' | 'grouped'>('simple');
  const [templateApplyBackup, setTemplateApplyBackup] = useState<any | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateAppliedProfileName, setTemplateAppliedProfileName] = useState<string | null>(null);

  const chunkRunnerStopRef = useRef(false);
  const startImportInFlightRef = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const syncProStatus = () => {
      setIsPro(Boolean((window as any).pifwcAdmin?.isPro));
    };

    window.addEventListener('pifwc_pro_activated', syncProStatus);
    window.addEventListener('pifwc_pro_deactivated', syncProStatus);

    return () => {
      window.removeEventListener('pifwc_pro_activated', syncProStatus);
      window.removeEventListener('pifwc_pro_deactivated', syncProStatus);
    };
  }, []);

  useEffect(() => {
    if (editProfileId) return;
    if (typeof resetNonce !== 'number') return;

    setCurrentStep(1);
    setSelectedSource('');
    setSelectedFormat('csv');

    setProfileName('');
    setSavedProfileId(null);
    setSaveSuccess(false);

    setSelectedSavedSource(null);
    setShowSavedSources(false);

    setUrlSource('');
    setUrlAuthType('none');
    setUrlUsername('');
    setUrlPassword('');

    setFtpHost('');
    setFtpPort('21');
    setFtpProtocol('ftp');
    setFtpUsername('');
    setFtpPassword('');
    setFtpPath('');

    setSheetsUrl('');
    setSheetsRange('A1:Z1000');
    setSheetsFirstRowHeaders(true);

    setApiUrl('');
    setApiMethod('GET');
    setApiHeaders('');
    setApiBody('');
    setApiAuthType('none');
    setApiAuthKey('');
    setApiUsername('');
    setApiPassword('');

    setIsUploading(false);
    setUploadError(null);
    setUploadedFile(null);

    setPreviewData(null);
    setIsLoadingPreview(false);
    setJsonItemsPath('');
    setXmlItemXPath('');

    setFieldMappings([]);
    setAttributes([]);
    setProductType('simple');

    setIsImportRunning(false);
    setShowProgress(false);
    setImportJobId(null);
    setImportStatus(null);
    setImportTotalRows(null);
    chunkRunnerStopRef.current = false;
  }, [resetNonce, editProfileId]);

  const getDefaultCategories = () => ([
    { id: 'cat_1', name: '', level: 0 },
    { id: 'cat_2', name: '', level: 0 },
    { id: 'cat_3', name: '', level: 0 },
    { id: 'cat_4', name: '', level: 0 },
    { id: 'cat_5', name: '', level: 0 },
  ]);

  const [categories, setCategories] = useState<any[]>(getDefaultCategories());

  const setCategoriesSafe = (next: any) => {
    setCategories((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      return Array.isArray(resolved) && resolved.length > 0
        ? resolved
        : getDefaultCategories();
    });
  };
  
  // Profile save states
  const [profileName, setProfileName] = useState('');
  const [savedProfileId, setSavedProfileId] = useState<number | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Import progress states
  const [importJobId, setImportJobId] = useState<number | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [isImportRunning, setIsImportRunning] = useState(false);
  const [importTotalRows, setImportTotalRows] = useState<number | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [savedSources, setSavedSources] = useState<any[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [selectedSavedSource, setSelectedSavedSource] = useState<number | null>(null);
  const [showSavedSources, setShowSavedSources] = useState(false);

  const [urlSource, setUrlSource] = useState('');
  const [urlAuthType, setUrlAuthType] = useState('none');
  const [urlUsername, setUrlUsername] = useState('');
  const [urlPassword, setUrlPassword] = useState('');

  const [ftpHost, setFtpHost] = useState('');
  const [ftpPort, setFtpPort] = useState('21');
  const [ftpProtocol, setFtpProtocol] = useState('ftp');
  const [ftpUsername, setFtpUsername] = useState('');
  const [ftpPassword, setFtpPassword] = useState('');
  const [ftpPath, setFtpPath] = useState('');

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsRange, setSheetsRange] = useState('A1:Z1000');
  const [sheetsFirstRowHeaders, setSheetsFirstRowHeaders] = useState(true);

  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiHeaders, setApiHeaders] = useState('');
  const [apiBody, setApiBody] = useState('');
  const [apiAuthType, setApiAuthType] = useState('none');
  const [apiAuthKey, setApiAuthKey] = useState('');
  const [apiUsername, setApiUsername] = useState('');
  const [apiPassword, setApiPassword] = useState('');

  const [jsonItemsPath, setJsonItemsPath] = useState('');
  const [xmlItemXPath, setXmlItemXPath] = useState('');

  const sources: SourceOption[] = [
    { id: 'upload', name: t('Upload File'), icon: Upload, description: t('Upload file from computer') },
    { id: 'url', name: t('Import from URL'), icon: Link, description: t('Fetch file from a direct URL') },
    { id: 'ftp', name: t('FTP / SFTP'), icon: Server, description: t('Connect to remote servers') },
    { id: 'sheets', name: t('Google Sheets'), icon: FileSpreadsheet, description: t('Sync from a spreadsheet') },
    { id: 'api', name: t('REST API'), icon: Code, description: t('Connect to REST API for product data') },
  ];
  const visibleSources = isPro ? sources : sources.filter((source) => source.id === 'upload');

  const handleSourceClick = (source: SourceOption) => {
    setSelectedSavedSource(null);
    setShowSavedSources(false);
    setUploadError(null);
    setSelectedSource(source.id);
  };

  const formats: FormatOption[] = [
    { id: 'csv', name: 'CSV' },
    { id: 'xml', name: 'XML', pro: true },
    { id: 'json', name: 'JSON', pro: true },
    { id: 'xlsx', name: 'XLSX', pro: true },
  ];
  const visibleFormats = isPro ? formats : formats.filter((format) => format.id === 'csv');

  const handleFormatClick = (format: FormatOption) => {
    setSelectedFormat(format.id);
  };

  const uploadAccept = isPro ? '.csv,.xml,.json,.xlsx,.xls,.yml,.yaml' : '.csv';
  const uploadFormatsLabel = isPro ? 'CSV, XML, JSON, XLSX' : 'CSV';

  const validateCsvOnly = (file: File): boolean => {
    if (isPro) {
      return true;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'csv') {
      setUploadError(t('Only CSV files are supported by the active plugin configuration.'));
      if (isProAddonInstalled) {
        setLicenseModalOpen(true);
      }
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isPro && selectedSource && selectedSource !== 'upload') {
      setSelectedSource('upload');
    }
  }, [isPro, selectedSource]);

  useEffect(() => {
    if (!isPro && selectedFormat !== 'csv') {
      setSelectedFormat('csv');
    }
  }, [isPro, selectedFormat]);

  const normalizeSourceType = (value?: string): string => {
    const raw = (value || '').toLowerCase();
    if (raw === 'google-sheets' || raw === 'google_sheets' || raw === 'sheets') {
      return 'sheets';
    }
    if (raw === 'sftp') {
      return 'sftp';
    }
    return raw;
  };

  const getEffectiveSourceType = () => {
    if (selectedSource === 'ftp') {
      return ftpProtocol === 'sftp' ? 'sftp' : 'ftp';
    }
    if (selectedSource === 'sheets') {
      return 'url';
    }
    return selectedSource || 'upload';
  };

  const buildSheetsExportUrl = (inputUrl: string, range?: string) => {
    const raw = inputUrl.trim();
    if (!raw) {
      return '';
    }

    const sheetIdMatch = raw.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const plainIdMatch = raw.match(/^[a-zA-Z0-9-_]+$/);
    const sheetId = sheetIdMatch?.[1] || (plainIdMatch ? raw : '');
    if (!sheetId) {
      return raw;
    }

    const gidMatch = raw.match(/[?&]gid=(\d+)/);
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (gidMatch?.[1]) {
      params.set('gid', gidMatch[1]);
    }
    if (range) {
      params.set('range', range);
    }

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?${params.toString()}`;
  };

  const sanitizeMaskedValue = (value?: string) => (value === '********' ? '' : value || '');

  const fetchSavedSources = async () => {
    setIsLoadingSources(true);
    try {
      const { restUrl, nonce } = (window as any).pifwcAdmin || {};
      if (!restUrl || !nonce) {
        throw new Error('WordPress API settings not found');
      }

      const response = await fetch(`${restUrl}sources`, {
        method: 'GET',
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        const sourcesData = data.data?.sources || data.data || [];
        setSavedSources(Array.isArray(sourcesData) ? sourcesData : []);
      } else {
        setSavedSources([]);
      }
    } catch (error) {
      setSavedSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  };

  const normalizeSavedHeaders = (headersValue: any) => {
    if (!headersValue) {
      return '';
    }
    if (typeof headersValue === 'string') {
      return headersValue;
    }
    try {
      return JSON.stringify(headersValue, null, 2);
    } catch (e) {
      return '';
    }
  };

  const getSavedSourceKind = (source: any): string => {
    const config = source?.config || {};
    let sourceType = normalizeSourceType(source?.type);
    if (sourceType === 'url' && (config.source_subtype === 'sheets' || config.sheets_range || config.range)) {
      sourceType = 'sheets';
    }
    if (sourceType === 'sftp') {
      sourceType = 'ftp';
    }
    return sourceType || 'url';
  };

  const getMatchingSavedSources = () => {
    const target = selectedSource === 'sheets' ? 'sheets' : selectedSource === 'ftp' ? 'ftp' : selectedSource;
    if (!target) return savedSources;
    return savedSources.filter((source) => getSavedSourceKind(source) === target);
  };

  const matchingSavedSources = getMatchingSavedSources();

  const applySavedSource = (source: any) => {
    if (!source) return;
    setSelectedSavedSource(source.id || null);
    const config = source.config || {};
    let sourceType = normalizeSourceType(source.type);
    if (sourceType === 'url' && (config.source_subtype === 'sheets' || config.sheets_range || config.range)) {
      sourceType = 'sheets';
    }
    if (sourceType === 'sftp') {
      sourceType = 'ftp';
    }
    if (sourceType) {
      setSelectedSource(sourceType);
    }

    if (sourceType === 'url') {
      setUrlSource(config.url || '');
      setUrlAuthType(config.auth_type || 'none');
      setUrlUsername(sanitizeMaskedValue(config.username));
      setUrlPassword(sanitizeMaskedValue(config.password));
    } else if (sourceType === 'ftp' || sourceType === 'sftp') {
      setFtpProtocol(sourceType === 'sftp' ? 'sftp' : 'ftp');
      setFtpHost(config.host || '');
      setFtpPort(config.port ? String(config.port) : (sourceType === 'sftp' ? '22' : '21'));
      setFtpUsername(config.username || '');
      setFtpPassword(sanitizeMaskedValue(config.password));
      setFtpPath(config.path || '');
    } else if (sourceType === 'sheets') {
      setSheetsUrl(config.url || config.source_url || '');
      setSheetsRange(config.range || config.sheets_range || 'A1:Z1000');
      if (typeof config.sheets_first_row_headers === 'boolean') {
        setSheetsFirstRowHeaders(config.sheets_first_row_headers);
      }
    } else if (sourceType === 'api') {
      setApiUrl(config.url || '');
      setApiMethod(config.method || 'GET');
      setApiHeaders(normalizeSavedHeaders(config.headers));
      setApiBody(config.body || '');
      setApiAuthType(config.auth_type || 'none');
      setApiAuthKey(sanitizeMaskedValue(config.auth_key));
      setApiUsername(config.username || '');
      setApiPassword(sanitizeMaskedValue(config.password));
    }
  };

  const fetchRemoteSource = async (endpoint: 'fetch' | 'fetch-api', payload: Record<string, any>) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const { restUrl, nonce } = (window as any).pifwcAdmin || {};
      if (!restUrl || !nonce) {
        throw new Error('WordPress API settings not found');
      }

      const response = await fetch(`${restUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setUploadedFile(data.data);
        const fmt = data.data?.format ? (data.data.format === 'yml' ? 'yaml' : data.data.format) : '';
        if (fmt) {
          setSelectedFormat(fmt);
        }
        await fetchPreview(data.data.file_id, fmt || undefined);
        setCurrentStep(2);
      } else {
        setUploadError(data.errors?.join(', ') || data.message || 'Failed to fetch file from source');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to fetch file from source');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchRemoteSource = async () => {
    if (selectedSource === 'url') {
      const url = urlSource.trim();
      if (!url) {
        setUploadError('Please enter a URL.');
        return;
      }
      await fetchRemoteSource('fetch', { url, auth_type: urlAuthType, username: urlUsername, password: urlPassword, source_id: selectedSavedSource || undefined });
      return;
    }

    if (selectedSource === 'sheets') {
      const exportUrl = buildSheetsExportUrl(sheetsUrl, sheetsRange);
      if (!exportUrl) {
        setUploadError('Please enter a Google Sheets URL.');
        return;
      }
      await fetchRemoteSource('fetch', { url: exportUrl, source_url: sheetsUrl.trim(), source_id: selectedSavedSource || undefined });
      return;
    }

    if (selectedSource === 'ftp') {
      if (!ftpHost.trim() || !ftpUsername.trim() || !ftpPath.trim()) {
        setUploadError('Please fill in host, username, and path.');
        return;
      }
      await fetchRemoteSource('fetch', {
        type: ftpProtocol === 'sftp' ? 'sftp' : 'ftp',
        host: ftpHost.trim(),
        port: ftpPort ? Number(ftpPort) : undefined,
        username: ftpUsername.trim(),
        password: ftpPassword,
        path: ftpPath.trim(),
        source_id: selectedSavedSource || undefined,
      });
      return;
    }

    if (selectedSource === 'api') {
      if (!apiUrl.trim()) {
        setUploadError('Please enter an API URL.');
        return;
      }
      await fetchRemoteSource('fetch-api', {
        url: apiUrl.trim(),
        method: apiMethod,
        headers: apiHeaders,
        body: apiBody,
        auth_type: apiAuthType,
        auth_key: apiAuthKey,
        username: apiUsername,
        password: apiPassword,
        source_id: selectedSavedSource || undefined,
      });
    }
  };

  const buildSourceType = () => {
    if (selectedSource === 'api') {
      return 'api';
    }
    return getEffectiveSourceType();
  };

  const buildSourceConfig = () => {
    const config: Record<string, any> = {
      file_id: uploadedFile?.file_id || uploadedFile?.id,
      file_name: uploadedFile?.original_name || uploadedFile?.name,
      format: selectedFormat,
      mode: updateMode,
      match_by: comparisonKey,
      postStatus,
      postDates,
    };

    if (selectedSavedSource) {
      config.source_id = selectedSavedSource;
    }

    if (selectedSource === 'url') {
      if (urlSource.trim()) {
        config.url = urlSource.trim();
      }
      if (urlAuthType && urlAuthType !== 'none') {
        config.auth_type = urlAuthType;
        config.username = urlUsername;
        config.password = urlPassword;
      }
    } else if (selectedSource === 'sheets') {
      if (sheetsUrl.trim()) {
        config.url = buildSheetsExportUrl(sheetsUrl, sheetsRange);
        config.source_url = sheetsUrl.trim();
        config.source_subtype = 'sheets';
        config.sheets_range = sheetsRange;
        config.sheets_first_row_headers = sheetsFirstRowHeaders;
      }
    } else if (selectedSource === 'ftp') {
      if (ftpHost.trim()) {
        config.host = ftpHost.trim();
      }
      if (ftpPort) {
        config.port = Number(ftpPort);
      }
      if (ftpUsername.trim()) {
        config.username = ftpUsername.trim();
      }
      if (ftpPassword) {
        config.password = ftpPassword;
      }
      if (ftpPath.trim()) {
        config.path = ftpPath.trim();
      }
    } else if (selectedSource === 'api') {
      if (apiUrl.trim()) {
        config.url = apiUrl.trim();
      }
      config.method = apiMethod;
      config.headers = apiHeaders;
      config.body = apiBody;
      config.auth_type = apiAuthType;
      config.auth_key = apiAuthKey;
      config.username = apiUsername;
      config.password = apiPassword;
    }

    if (jsonItemsPath.trim()) {
      config.items_path = jsonItemsPath.trim();
    }
    if (xmlItemXPath.trim()) {
      config.item_xpath = xmlItemXPath.trim();
    }

    return config;
  };

  const applyTemplateProfile = async (profileId: number) => {
    try {
      setIsApplyingTemplate(true);

      if ( ! templateApplyBackup ) {
        setTemplateApplyBackup({
          fieldMappings,
          attributes,
          categories,
          productType,
          updateMode,
          comparisonKey,
          conflictBehavior,
          updatePreset,
          updateGroups,
          skipEmptyValues,
          skipManualChanges,
          deleteMissingProducts,
          updateImages,
          postStatus,
          postDates,
          asSpecifiedDate,
          randomStartDate,
          randomEndDate,
        });
      }

      const response = await fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${profileId}`), {
        headers: {
          'X-WP-Nonce': getWpNonce()
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success' || !data.data) {
        throw new Error('Invalid profile data received');
      }

      const profile = data.data;
      setTemplateAppliedProfileName(profile.name || '');

      const options = profile.options || {};
      const sourceConfig = profile.source_config || {};

      const rawMode = options.mode || sourceConfig.updateMode || sourceConfig.mode || 'both';
      setUpdateMode(rawMode === 'new' ? 'create' : rawMode);
      setComparisonKey(options.match_by || sourceConfig.comparisonKey || sourceConfig.match_by || 'sku');
      setConflictBehavior(options.conflict_behavior || 'update');
      const updateRules = options.update_rules || options.updateRules || null;
      const nextPreset = updateRules?.preset || 'all';
      setUpdatePreset(nextPreset);
      const nextGroups = updateRules?.groups;
      if (nextGroups && typeof nextGroups === 'object') {
        setUpdateGroups((prev: Record<string, boolean>) => ({
          ...prev,
          ...nextGroups,
        }));
      }
      if (typeof updateRules?.skip_empty === 'boolean') {
        setSkipEmptyValues(updateRules.skip_empty);
      } else if (typeof options.skip_empty_values === 'boolean') {
        setSkipEmptyValues(options.skip_empty_values);
      } else if (typeof options.skip_empty === 'boolean') {
        setSkipEmptyValues(options.skip_empty);
      }

      setSkipManualChanges(!!(options.skip_manual_changes || options.do_not_overwrite_manual_changes));
      setDeleteMissingProducts(!!(options.delete_missing_products || options.delete_products_not_in_file || options.delete_products));
      if (typeof options.update_images === 'boolean') {
        setUpdateImages(options.update_images);
      }
      setPostStatus(options.post_status || sourceConfig.postStatus || sourceConfig.post_status || 'published');
      setPostDates(options.post_dates || sourceConfig.postDates || sourceConfig.post_dates || 'as-specified');

      const nextProductType = options.product_type || options.productType || 'simple';
      if (nextProductType === 'simple' || nextProductType === 'variable' || nextProductType === 'grouped') {
        setProductType(nextProductType);
      } else {
        setProductType('simple');
      }

      const mapping = profile.mapping || null;
      if (mapping && mapping.fields && Array.isArray(mapping.fields)) {
        setFieldMappings(mapping.fields);
      } else if (Array.isArray(mapping)) {
        setFieldMappings(mapping);
      } else {
        setFieldMappings([]);
      }

      if (mapping && mapping.attributes && Array.isArray(mapping.attributes)) {
        setAttributes(mapping.attributes);
      } else {
        setAttributes([]);
      }

      if (mapping && mapping.categories && Array.isArray(mapping.categories) && mapping.categories.length > 0) {
        setCategoriesSafe(mapping.categories);
      } else {
        setCategoriesSafe(getDefaultCategories());
      }
    } catch (error) {
      alert(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const undoTemplateApply = () => {
    if ( ! templateApplyBackup ) {
      return;
    }

    setFieldMappings(templateApplyBackup.fieldMappings || []);
    setAttributes(templateApplyBackup.attributes || []);
    setCategoriesSafe(templateApplyBackup.categories || getDefaultCategories());
    setProductType(templateApplyBackup.productType || 'simple');

    setUpdateMode(templateApplyBackup.updateMode || 'both');
    setComparisonKey(templateApplyBackup.comparisonKey || 'sku');
    setConflictBehavior(templateApplyBackup.conflictBehavior || 'update');
    setUpdatePreset(templateApplyBackup.updatePreset || 'all');
    setUpdateGroups(templateApplyBackup.updateGroups || {
      content: true,
      pricing: true,
      inventory: true,
      shipping: true,
      taxonomies: true,
      images: true,
      attributes: true,
      meta: true,
    });
    setSkipEmptyValues(!!templateApplyBackup.skipEmptyValues);
    setSkipManualChanges(!!templateApplyBackup.skipManualChanges);
    setDeleteMissingProducts(!!templateApplyBackup.deleteMissingProducts);
    setUpdateImages(typeof templateApplyBackup.updateImages === 'boolean' ? templateApplyBackup.updateImages : true);
    setPostStatus(templateApplyBackup.postStatus || 'published');
    setPostDates(templateApplyBackup.postDates || 'as-specified');
    setAsSpecifiedDate(templateApplyBackup.asSpecifiedDate || new Date());
    setRandomStartDate(templateApplyBackup.randomStartDate || new Date());
    setRandomEndDate(templateApplyBackup.randomEndDate || new Date());

    setTemplateApplyBackup(null);
    setTemplateAppliedProfileName(null);
  };

  const steps = [
    { number: 1, title: 'Data Source' },
    { number: 2, title: 'Format + Preview' },
    { number: 3, title: 'Field Mapping' },
    { number: 4, title: 'Update Logic' },
    { number: 5, title: 'Launch' },
  ];

  // Reset all import state when component mounts (user navigates to New Import)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // Reset import-related state when navigating back to New Import
      setCurrentStep(1);
      setIsImportRunning(false);
      setShowProgress(false);
      setImportJobId(null);
      setImportStatus('');
      setImportTotalRows(null);
      chunkRunnerStopRef.current = false;
    }
  }, []);

  // Load profile data when editing
  useEffect(() => {
    if (editProfileId) {
      loadProfileData(editProfileId);
    }
  }, [editProfileId]);

  const loadProfileData = async (profileId: number) => {
    try {
      setIsLoadingProfile(true);

      const response = await fetch(addCacheBuster(`/wp-json/pifwc/v1/profiles/${profileId}`), {
        headers: {
          'X-WP-Nonce': getWpNonce(),
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        const profile = data.data;
        
        // Set profile name
        setProfileName(profile.name || '');
        
        const sourceConfig = profile.source_config || {};
        let normalizedSource = normalizeSourceType(profile.source || profile.source_type || sourceConfig.source_type || 'upload');
        if (normalizedSource === 'url' && (sourceConfig.source_subtype === 'sheets' || sourceConfig.sheets_range || sourceConfig.range)) {
          normalizedSource = 'sheets';
        }
        setSelectedSource(normalizedSource || 'upload');
        setSelectedFormat(sourceConfig.format || 'csv');

        // Set options
        const options = profile.options || {};
        const rawMode = options.mode || sourceConfig.updateMode || sourceConfig.mode || 'both';
        setUpdateMode(rawMode === 'new' ? 'create' : rawMode);
        setComparisonKey(options.match_by || sourceConfig.comparisonKey || sourceConfig.match_by || 'sku');
        setConflictBehavior(options.conflict_behavior || 'update');
        const updateRules = options.update_rules || options.updateRules || null;
        const nextPreset = updateRules?.preset || 'all';
        setUpdatePreset(nextPreset);
        const nextGroups = updateRules?.groups;
        if (nextGroups && typeof nextGroups === 'object') {
          setUpdateGroups((prev: Record<string, boolean>) => ({
            ...prev,
            ...nextGroups,
          }));
        }
        if (typeof updateRules?.skip_empty === 'boolean') {
          setSkipEmptyValues(updateRules.skip_empty);
        } else if (typeof options.skip_empty_values === 'boolean') {
          setSkipEmptyValues(options.skip_empty_values);
        } else if (typeof options.skip_empty === 'boolean') {
          setSkipEmptyValues(options.skip_empty);
        }

        setSkipManualChanges(!!(options.skip_manual_changes || options.do_not_overwrite_manual_changes));
        setDeleteMissingProducts(!!(options.delete_missing_products || options.delete_products_not_in_file || options.delete_products));
        if (typeof options.update_images === 'boolean') {
          setUpdateImages(options.update_images);
        }
        setPostStatus(options.post_status || sourceConfig.postStatus || sourceConfig.post_status || 'published');
        setPostDates(options.post_dates || sourceConfig.postDates || sourceConfig.post_dates || 'as-specified');

        const nextProductType = options.product_type || options.productType || 'simple';
        if (nextProductType === 'simple' || nextProductType === 'variable' || nextProductType === 'grouped') {
          setProductType(nextProductType);
        } else {
          setProductType('simple');
        }
        
        if (sourceConfig.source_id) {
          setSelectedSavedSource(Number(sourceConfig.source_id));
        }

        if (normalizedSource === 'url') {
          setUrlSource(sourceConfig.url || sourceConfig.source_url || '');
          setUrlAuthType(sourceConfig.auth_type || 'none');
          setUrlUsername(sanitizeMaskedValue(sourceConfig.username));
          setUrlPassword(sanitizeMaskedValue(sourceConfig.password));
        } else if (normalizedSource === 'ftp' || normalizedSource === 'sftp') {
          setFtpProtocol(normalizedSource === 'sftp' ? 'sftp' : 'ftp');
          setFtpHost(sourceConfig.host || '');
          setFtpPort(sourceConfig.port ? String(sourceConfig.port) : (normalizedSource === 'sftp' ? '22' : '21'));
          setFtpUsername(sourceConfig.username || '');
          setFtpPassword(sanitizeMaskedValue(sourceConfig.password));
          setFtpPath(sourceConfig.path || '');
        } else if (normalizedSource === 'sheets') {
          setSheetsUrl(sourceConfig.source_url || sourceConfig.url || '');
          setSheetsRange(sourceConfig.sheets_range || sourceConfig.range || 'A1:Z1000');
          if (typeof sourceConfig.sheets_first_row_headers === 'boolean') {
            setSheetsFirstRowHeaders(sourceConfig.sheets_first_row_headers);
          }
        } else if (normalizedSource === 'api') {
          setApiUrl(sourceConfig.url || '');
          setApiMethod(sourceConfig.method || 'GET');
          setApiHeaders(normalizeSavedHeaders(sourceConfig.headers));
          setApiBody(sourceConfig.body || '');
          setApiAuthType(sourceConfig.auth_type || 'none');
          setApiAuthKey(sanitizeMaskedValue(sourceConfig.auth_key));
          setApiUsername(sourceConfig.username || '');
          setApiPassword(sanitizeMaskedValue(sourceConfig.password));
        }

        if (sourceConfig.items_path) {
          setJsonItemsPath(String(sourceConfig.items_path));
        }
        if (sourceConfig.item_xpath) {
          setXmlItemXPath(String(sourceConfig.item_xpath));
        }

        // If there's a file_id, load the file info
        if (sourceConfig.file_id) {
          setUploadedFile({
            id: sourceConfig.file_id,
            name: sourceConfig.file_name || 'Uploaded file',
            size: sourceConfig.file_size || 0
          });
          
          // Load preview data for the file
          await loadFilePreview(sourceConfig.file_id, sourceConfig.format || undefined);
        } else {
        }
        
        // Set field mappings and attributes if available
        if (profile.mapping) {
          
          // Check if mapping has fields array
          if (profile.mapping.fields && Array.isArray(profile.mapping.fields)) {
            setFieldMappings(profile.mapping.fields);
          } else if (Array.isArray(profile.mapping)) {
            // Legacy format: mapping is an array
            setFieldMappings(profile.mapping);
          } else {
          }
          
          // Set attributes if available
          if (profile.mapping.attributes && Array.isArray(profile.mapping.attributes)) {
            setAttributes(profile.mapping.attributes);
          } else {
          }

          // Set categories mapping if available
          if (profile.mapping.categories && Array.isArray(profile.mapping.categories) && profile.mapping.categories.length > 0) {
            setCategories(profile.mapping.categories);
          } else {
            setCategories(getDefaultCategories());
          }
        } else {
        }
        
        // Move to step 2 (Format + Preview) for editing
        setCurrentStep(2);
      } else {
        throw new Error('Invalid profile data received');
      }
    } catch (error) {
      alert(`Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Reset to step 1 on error
      setCurrentStep(1);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadFilePreview = async (fileId: string, formatOverride?: string) => {
    await fetchPreview(fileId, formatOverride);
  };

  // Fetch list of uploaded files
  const fetchUploadedFiles = async () => {
    setIsLoadingUploadedFiles(true);
    try {
      const { restUrl, nonce } = (window as any).pifwcAdmin || {};
      if (!restUrl || !nonce) {
        throw new Error('WordPress API settings not found');
      }

      const response = await fetch(`${restUrl}uploaded-files?limit=50`, {
        method: 'GET',
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setUploadedFilesList(data.data?.files || []);
      } else {
      }
    } catch (error) {
    } finally {
      setIsLoadingUploadedFiles(false);
    }
  };

  // Handle selection of previously uploaded file
  const handleSelectUploadedFile = async (file: any) => {
    setSelectedUploadedFile(file);
    setUploadedFile({
      file_id: file.file_id,
      original_name: file.original_name,
      file_path: file.file_path,
    });
    
    // Auto-detect format from extension
    const extension = file.extension?.toLowerCase();
    const formatMap: Record<string, string> = {
      csv: 'csv',
      xml: 'xml',
      json: 'json',
      xlsx: 'xlsx',
      xls: 'xlsx',
      yml: 'yaml',
      yaml: 'yaml',
    };
    const detectedFormat = extension ? formatMap[extension] : '';
    if (detectedFormat) {
      setSelectedFormat(detectedFormat);
    }
    
    // Load preview
    await loadFilePreview(file.file_id, detectedFormat || undefined);
  };

  // Handle file upload
  const handleFileUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateCsvOnly(file)) {
      if (event?.target) {
        event.target.value = '';
      }
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // @ts-ignore - pifwcAdmin is defined globally by WordPress
      const { restUrl, nonce } = window.pifwcAdmin || {};
      
      if (!restUrl || !nonce) {
        throw new Error('WordPress API settings not found');
      }

      const response = await fetch(`${restUrl}upload`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': nonce,
        },
        body: formData,
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setUploadedFile(data.data);
        const fmt = data.data?.format ? (data.data.format === 'yml' ? 'yaml' : data.data.format) : '';
        if (fmt) {
          setSelectedFormat(fmt);
        }
        // Fetch preview data
        await fetchPreview(data.data.file_id, fmt || undefined);
        setCurrentStep(2); // Move to next step
      } else {
        setUploadError(data.errors?.join(', ') || 'Upload failed');
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch preview data
  const fetchPreview = async (fileId: string, formatOverride?: string) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    
    try {
      // @ts-ignore
      const { restUrl, nonce } = window.pifwcAdmin || {};

      const effectiveFormat = (formatOverride || selectedFormat || '').trim();
      
      const params = new URLSearchParams();
      params.set('file_id', fileId);
      params.set('rows', '20');
      if (effectiveFormat) {
        params.set('format', effectiveFormat);
      }
      const lowerFormat = effectiveFormat.toLowerCase();
      if (lowerFormat === 'json' && jsonItemsPath.trim()) {
        params.set('items_path', jsonItemsPath.trim());
      }
      if (lowerFormat === 'xml' && xmlItemXPath.trim()) {
        params.set('item_xpath', xmlItemXPath.trim());
      }
      const response = await fetch(`${restUrl}preview?${params.toString()}`, {
        method: 'GET',
        headers: {
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setPreviewData(data.data);
      } else {
        const msg = Array.isArray(data?.errors) && data.errors.length
          ? data.errors.join(', ')
          : (typeof data?.message === 'string' ? data.message : 'Failed to load preview');
        setPreviewError(msg);
        setPreviewData(null);
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview');
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: any) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!validateCsvOnly(file)) {
        return;
      }
      // Create a fake event object to reuse handleFileUpload
      const fakeEvent = {
        target: {
          files: [file]
        }
      };
      await handleFileUpload(fakeEvent);
    }
  };

  // Show loading state while loading profile
  if (isLoadingProfile) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <button
                onClick={() => setCurrentStep(step.number)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 ${
                  currentStep === step.number
                    ? 'bg-red-500 text-white'
                    : currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">{step.title}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-4 ${
                currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Select Data Source</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleSources.map((source) => {
          const Icon = source.icon;
          return (
            <button
              type="button"
              key={source.id}
              onClick={() => handleSourceClick(source)}
              className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                selectedSource === source.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-gray-900 mb-1">{source.name}</h3>
              <p className="text-sm text-gray-600">{source.description}</p>
            </button>
          );
        })}
      </div>

      {selectedSource === 'upload' && (
        <div className="mt-6">
          {/* Toggle between uploaded files and new upload */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => {
                setShowUploadedFiles(true);
                if (uploadedFilesList.length === 0) {
                  fetchUploadedFiles();
                }
              }}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                showUploadedFiles ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h4 className="text-gray-900 font-medium mb-1">Use Uploaded File</h4>
              <p className="text-sm text-gray-600">Select from previously uploaded files</p>
            </button>
            
            <button
              onClick={() => setShowUploadedFiles(false)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                !showUploadedFiles ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <h4 className="text-gray-900 font-medium mb-1">Upload New File</h4>
              <p className="text-sm text-gray-600">Upload file from your computer</p>
            </button>
          </div>

          {showUploadedFiles ? (
            <div className="p-6 border-2 border-gray-300 rounded-lg">
              <h4 className="text-gray-900 font-medium mb-4">Select Previously Uploaded File</h4>
              {isLoadingUploadedFiles ? (
                <div className="text-center py-8 text-gray-600">Loading files...</div>
              ) : uploadedFilesList.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No uploaded files found</div>
              ) : (
                <div 
                  className="overflow-y-auto border-2 border-gray-200 rounded-lg p-2"
                  style={{ maxHeight: '160px' }}
                >
                  <div className="space-y-2">
                    {uploadedFilesList.map((file: any) => (
                      <button
                        key={file.file_id}
                        onClick={() => handleSelectUploadedFile(file)}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                          selectedUploadedFile?.file_id === file.file_id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{file.original_name}</div>
                            <div className="text-sm text-gray-600">
                              {file.extension?.toUpperCase()} • {(file.size / 1024).toFixed(2)} KB • {new Date(file.upload_time * 1000).toLocaleDateString()}
                            </div>
                          </div>
                          {selectedUploadedFile?.file_id === file.file_id && (
                            <Check className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-red-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-900 mb-2">Drag & drop file here or click to select</p>
              <p className="text-sm text-gray-600 mb-4">Supported formats: {uploadFormatsLabel}</p>
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {uploadError}
                </div>
              )}
              
              {uploadedFile && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                  ✓ File uploaded: {uploadedFile.original_name}
                </div>
              )}
              
              <input
                type="file"
                id="file-upload"
                accept={uploadAccept}
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className={`inline-block px-6 py-2 rounded-lg cursor-pointer ${
                  isUploading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Select File'}
              </label>
            </div>
          )}
        </div>
      )}

      {selectedSource === 'url' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-gray-900 font-medium">Fetch from URL</h4>
            <button
              type="button"
              onClick={() => {
                setShowSavedSources((prev) => {
                  const next = !prev;
                  if (next && savedSources.length === 0) {
                    fetchSavedSources();
                  }
                  return next;
                });
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {showSavedSources ? 'Hide Saved Sources' : 'Use Saved Source'}
            </button>
          </div>

          {showSavedSources && (
            <div className="p-4 border border-gray-200 rounded-lg">
              {isLoadingSources ? (
                <div className="text-sm text-gray-600">Loading sources...</div>
              ) : matchingSavedSources.length === 0 ? (
                <div className="text-sm text-gray-600">No saved sources found.</div>
              ) : (
                <div className="space-y-2">
                  {matchingSavedSources.map((source: any) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => applySavedSource(source)}
                      className={`w-full p-3 border rounded-lg text-left ${
                        selectedSavedSource === source.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{source.name || `Source #${source.id}`}</div>
                      <div className="text-xs text-gray-500">{(source.type || '').toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm text-gray-600">File URL</label>
            <input
              type="url"
              value={urlSource}
              onChange={(e) => setUrlSource(e.target.value)}
              placeholder="https://example.com/products.csv"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Authentication</label>
              <select
                value={urlAuthType}
                onChange={(e) => setUrlAuthType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="none">None</option>
                <option value="basic">Basic</option>
              </select>
            </div>
            {urlAuthType !== 'none' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Username</label>
                  <input
                    type="text"
                    value={urlUsername}
                    onChange={(e) => setUrlUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Password</label>
                  <input
                    type="password"
                    value={urlPassword}
                    onChange={(e) => setUrlPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleFetchRemoteSource()}
            disabled={isUploading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isUploading ? 'Fetching...' : 'Fetch File'}
          </button>
        </div>
      )}

      {selectedSource === 'ftp' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-gray-900 font-medium">Connect via FTP / SFTP</h4>
            <button
              type="button"
              onClick={() => {
                setShowSavedSources((prev) => {
                  const next = !prev;
                  if (next && savedSources.length === 0) {
                    fetchSavedSources();
                  }
                  return next;
                });
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {showSavedSources ? 'Hide Saved Sources' : 'Use Saved Source'}
            </button>
          </div>

          {showSavedSources && (
            <div className="p-4 border border-gray-200 rounded-lg">
              {isLoadingSources ? (
                <div className="text-sm text-gray-600">Loading sources...</div>
              ) : matchingSavedSources.length === 0 ? (
                <div className="text-sm text-gray-600">No saved sources found.</div>
              ) : (
                <div className="space-y-2">
                  {matchingSavedSources.map((source: any) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => applySavedSource(source)}
                      className={`w-full p-3 border rounded-lg text-left ${
                        selectedSavedSource === source.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{source.name || `Source #${source.id}`}</div>
                      <div className="text-xs text-gray-500">{(source.type || '').toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Protocol</label>
              <select
                value={ftpProtocol}
                onChange={(e) => setFtpProtocol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="ftp">FTP</option>
                <option value="sftp">SFTP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Port</label>
              <input
                type="number"
                value={ftpPort}
                onChange={(e) => setFtpPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Host</label>
              <input
                type="text"
                value={ftpHost}
                onChange={(e) => setFtpHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Username</label>
              <input
                type="text"
                value={ftpUsername}
                onChange={(e) => setFtpUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Password</label>
              <input
                type="password"
                value={ftpPassword}
                onChange={(e) => setFtpPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Remote Path</label>
              <input
                type="text"
                value={ftpPath}
                onChange={(e) => setFtpPath(e.target.value)}
                placeholder="/exports/products.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleFetchRemoteSource()}
            disabled={isUploading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isUploading ? 'Fetching...' : 'Fetch File'}
          </button>
        </div>
      )}

      {selectedSource === 'sheets' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-gray-900 font-medium">Google Sheets</h4>
            <button
              type="button"
              onClick={() => {
                setShowSavedSources((prev) => {
                  const next = !prev;
                  if (next && savedSources.length === 0) {
                    fetchSavedSources();
                  }
                  return next;
                });
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {showSavedSources ? 'Hide Saved Sources' : 'Use Saved Source'}
            </button>
          </div>

          {showSavedSources && (
            <div className="p-4 border border-gray-200 rounded-lg">
              {isLoadingSources ? (
                <div className="text-sm text-gray-600">Loading sources...</div>
              ) : matchingSavedSources.length === 0 ? (
                <div className="text-sm text-gray-600">No saved sources found.</div>
              ) : (
                <div className="space-y-2">
                  {matchingSavedSources.map((source: any) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => applySavedSource(source)}
                      className={`w-full p-3 border rounded-lg text-left ${
                        selectedSavedSource === source.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{source.name || `Source #${source.id}`}</div>
                      <div className="text-xs text-gray-500">{(source.type || '').toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm text-gray-600">Google Sheets URL or ID</label>
            <input
              type="text"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Range</label>
              <input
                type="text"
                value={sheetsRange}
                onChange={(e) => setSheetsRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                id="sheets-first-row"
                type="checkbox"
                checked={sheetsFirstRowHeaders}
                onChange={(e) => setSheetsFirstRowHeaders(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="sheets-first-row" className="text-sm text-gray-700">First row has headers</label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleFetchRemoteSource()}
            disabled={isUploading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isUploading ? 'Fetching...' : 'Fetch File'}
          </button>
        </div>
      )}

      {selectedSource === 'api' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-gray-900 font-medium">REST API</h4>
            <button
              type="button"
              onClick={() => {
                setShowSavedSources((prev) => {
                  const next = !prev;
                  if (next && savedSources.length === 0) {
                    fetchSavedSources();
                  }
                  return next;
                });
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {showSavedSources ? 'Hide Saved Sources' : 'Use Saved Source'}
            </button>
          </div>

          {showSavedSources && (
            <div className="p-4 border border-gray-200 rounded-lg">
              {isLoadingSources ? (
                <div className="text-sm text-gray-600">Loading sources...</div>
              ) : matchingSavedSources.length === 0 ? (
                <div className="text-sm text-gray-600">No saved sources found.</div>
              ) : (
                <div className="space-y-2">
                  {matchingSavedSources.map((source: any) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => applySavedSource(source)}
                      className={`w-full p-3 border rounded-lg text-left ${
                        selectedSavedSource === source.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{source.name || `Source #${source.id}`}</div>
                      <div className="text-xs text-gray-500">{(source.type || '').toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm text-gray-600">API URL</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/products"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Method</label>
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Auth Type</label>
              <select
                value={apiAuthType}
                onChange={(e) => setApiAuthType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="none">None</option>
                <option value="basic">Basic</option>
                <option value="bearer">Bearer</option>
                <option value="apikey">API Key</option>
              </select>
            </div>
            {apiAuthType === 'apikey' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">API Key</label>
                <input
                  type="text"
                  value={apiAuthKey}
                  onChange={(e) => setApiAuthKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
            {apiAuthType === 'basic' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Username</label>
                <input
                  type="text"
                  value={apiUsername}
                  onChange={(e) => setApiUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
            {apiAuthType === 'basic' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Password</label>
                <input
                  type="password"
                  value={apiPassword}
                  onChange={(e) => setApiPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
            {apiAuthType === 'bearer' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Bearer Token</label>
                <input
                  type="text"
                  value={apiAuthKey}
                  onChange={(e) => setApiAuthKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Headers (JSON or key:value per line)</label>
            <textarea
              value={apiHeaders}
              onChange={(e) => setApiHeaders(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          {apiMethod !== 'GET' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">Body</label>
              <textarea
                value={apiBody}
                onChange={(e) => setApiBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleFetchRemoteSource()}
            disabled={isUploading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isUploading ? 'Fetching...' : 'Fetch Data'}
          </button>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Format and Data Preview</h2>
      
      <div className="mb-6">
        <label className="block text-sm text-gray-600 mb-2">File Format</label>
        <div className="flex gap-2">
          {visibleFormats.map((format) => {
            return (
              <button
                key={format.id}
                onClick={() => handleFormatClick(format)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  selectedFormat === format.id
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
                }`}
              >
                {format.name}
              </button>
            );
          })}
        </div>
      </div>


      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Delimiter</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>Comma (,)</option>
            <option>Semicolon (;)</option>
            <option>Tab</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Encoding</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>UTF-8</option>
            <option>Windows-1251</option>
            <option>ISO-8859-1</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Currency</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>USD ($)</option>
            <option>EUR (€)</option>
            <option>RUB (₽)</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-gray-900 mb-3">
          Preview (first {previewData?.display_rows || 20} rows)
          {isLoadingPreview && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
        </h3>
        {previewData && previewData.rows && previewData.rows.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {previewData.headers.map((header: string, index: number) => (
                    <th key={index} className="px-4 py-2 text-left text-sm text-gray-600 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="border-t border-gray-200">
                    {row.map((cell: any, colIndex: number) => (
                      <td key={colIndex} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                        {cell || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            {isLoadingPreview
              ? 'Loading preview...'
              : (previewError ? previewError : 'No preview data available')}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Update Logic</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-600 mb-3">Import Mode</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="updateMode"
                value="create"
                checked={updateMode === 'create'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Only New Products</div>
                <p className="text-sm text-gray-600">Add only new products, skip existing ones</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
              <input
                type="radio"
                name="updateMode"
                value="update"
                checked={updateMode === 'update'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Only Update</div>
                <div className="text-sm text-gray-600">Update only existing products</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
              <input
                type="radio"
                name="updateMode"
                value="both"
                checked={updateMode === 'both'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Update + Add</div>
                <div className="text-sm text-gray-600">Update existing and add new</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Comparison Key</label>
          <select
            value={comparisonKey}
            onChange={(e) => setComparisonKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="sku">SKU</option>
            <option value="id">ID</option>
            <option value="title">Product Title</option>
            <option value="ean">EAN</option>
            <option value="gtin">GTIN</option>
            <option value="custom">Custom Field</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Conflict Behavior</label>
          <select
            value={conflictBehavior}
            onChange={(e) => setConflictBehavior(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="update">Update existing product</option>
            <option value="skip">Skip product</option>
            <option value="duplicate">Create duplicate</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">What to do when a product with the same unique identifier exists.</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-600">When product exists: what to update?</label>
          <select
            value={updatePreset}
            onChange={(e) => {
              const next = e.target.value;
              setUpdatePreset(next);
              if (next === 'all') {
                setUpdateGroups({
                  content: true,
                  pricing: true,
                  inventory: true,
                  shipping: true,
                  taxonomies: true,
                  images: true,
                  attributes: true,
                  meta: true,
                });
              } else if (next === 'prices_stock') {
                setUpdateGroups({
                  content: false,
                  pricing: true,
                  inventory: true,
                  shipping: false,
                  taxonomies: false,
                  images: false,
                  attributes: false,
                  meta: false,
                });
              } else if (next === 'prices') {
                setUpdateGroups({
                  content: false,
                  pricing: true,
                  inventory: false,
                  shipping: false,
                  taxonomies: false,
                  images: false,
                  attributes: false,
                  meta: false,
                });
              } else if (next === 'stock') {
                setUpdateGroups({
                  content: false,
                  pricing: false,
                  inventory: true,
                  shipping: false,
                  taxonomies: false,
                  images: false,
                  attributes: false,
                  meta: false,
                });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={updateMode === 'create'}
          >
            <option value="all">Update all fields</option>
            <option value="prices_stock">Update only prices & stock</option>
            <option value="prices">Update only prices</option>
            <option value="stock">Update only stock</option>
            <option value="custom">Custom</option>
          </select>

          {updatePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 p-4 border border-gray-200 rounded-lg">
              {(
                [
                  { key: 'content', label: 'Content (title, descriptions, slug, status)' },
                  { key: 'pricing', label: 'Pricing (regular/sale price)' },
                  { key: 'inventory', label: 'Inventory (stock qty/status/manage stock)' },
                  { key: 'shipping', label: 'Shipping (weight/dimensions)' },
                  { key: 'taxonomies', label: 'Taxonomies (categories/tags/brands)' },
                  { key: 'images', label: 'Images (featured + gallery)' },
                  { key: 'attributes', label: 'Attributes' },
                  { key: 'meta', label: 'Meta / ACF' },
                ] as const
              ).map((g) => (
                <label key={g.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={!!updateGroups[g.key]}
                    disabled={updateMode === 'create'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUpdateGroups((prev) => ({
                        ...prev,
                        [g.key]: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-gray-900 text-sm">{g.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={skipEmptyValues}
              disabled={updateMode === 'create'}
              onChange={(e) => setSkipEmptyValues(e.target.checked)}
            />
            <span className="text-gray-900">Skip empty values when updating</span>
          </label>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={skipManualChanges}
              disabled={updateMode === 'create'}
              onChange={(e) => setSkipManualChanges(e.target.checked)}
            />
            <span className="text-gray-900">Do not overwrite manually changed fields</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={deleteMissingProducts}
              disabled={updateMode === 'create'}
              onChange={(e) => setDeleteMissingProducts(e.target.checked)}
            />
            <span className="text-gray-900">Delete products not in file</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={updateImages}
              onChange={(e) => setUpdateImages(e.target.checked)}
            />
            <span className="text-gray-900">Update images</span>
          </label>
        </div>
      </div>
    </div>
  );

  const handleSaveProfile = async () => {
    if (!previewData || (fieldMappings.length === 0 && attributes.length === 0)) {
      alert('Please ensure you have uploaded a file and mapped at least one field or attribute.');
      return;
    }

    if (!profileName.trim()) {
      alert('Please enter a profile name.');
      return;
    }

    const safeCategories = Array.isArray(categories) && categories.length > 0
      ? categories
      : getDefaultCategories();

    const profile = {
      name: profileName,
      source_type: buildSourceType(),
      mapping: {
        fields: fieldMappings,
        attributes: attributes,
        categories: safeCategories
      },
      source_config: buildSourceConfig(),
      options: {
        mode: updateMode,
        match_by: comparisonKey,
        conflict_behavior: conflictBehavior,
        update_rules: {
          preset: updatePreset,
          groups: updateGroups,
          skip_empty: skipEmptyValues,
        },
        skip_manual_changes: skipManualChanges,
        delete_missing_products: deleteMissingProducts,
        update_images: updateImages,
        product_type: productType,
        post_status: postStatus,
        post_dates: postDates,
      }
    };

    const upsertProfile = async (name: string): Promise<number> => {
      const isEditing = !!editProfileId;
      const existingId = editProfileId || savedProfileId;
      const shouldUpdate = isEditing || !!existingId;
      const url = addCacheBuster(shouldUpdate
        ? `/wp-json/pifwc/v1/profiles/${existingId}`
        : '/wp-json/pifwc/v1/profiles');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        },
        body: JSON.stringify({
          ...profile,
          name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save profile');
      }

      const data = await response.json();
      const returnedId = data?.data?.profile_id;
      return (shouldUpdate ? (existingId as number) : (returnedId as number));
    };

    try {
      const profileId = await upsertProfile(profileName);
      setSavedProfileId(profileId);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      setCurrentStep(5);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save profile: ${errorMsg}`);
    }
  };

  const handleStartImport = async () => {
    if (!previewData) return;

    if (startImportInFlightRef.current) return;
    startImportInFlightRef.current = true;

    try {
      setIsImportRunning(true);
      setImportStatus('processing');
      chunkRunnerStopRef.current = false;
      const safeCategories = Array.isArray(categories) && categories.length > 0
        ? categories
        : getDefaultCategories();

      const upsertProfile = async (name: string): Promise<number> => {
        const isEditing = !!editProfileId;
        const existingId = editProfileId || savedProfileId;
        const shouldUpdate = isEditing || !!existingId;
        const url = shouldUpdate
          ? `/wp-json/pifwc/v1/profiles/${existingId}`
          : '/wp-json/pifwc/v1/profiles';

        const profile = {
          name,
          source_type: buildSourceType(),
          mapping: {
            fields: fieldMappings,
            attributes: attributes,
            categories: safeCategories
          },
          source_config: buildSourceConfig(),
          options: {
            mode: updateMode,
            match_by: comparisonKey,
            conflict_behavior: conflictBehavior,
            update_rules: {
              preset: updatePreset,
              groups: updateGroups,
              skip_empty: skipEmptyValues,
            },
            skip_manual_changes: skipManualChanges,
            delete_missing_products: deleteMissingProducts,
            update_images: updateImages,
            product_type: productType,
            post_status: postStatus,
            post_dates: postDates,
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
          },
          body: JSON.stringify(profile)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save profile');
        }

        const data = await response.json();
        const returnedId = data?.data?.profile_id;
        return (shouldUpdate ? (existingId as number) : (returnedId as number));
      };

      // 1. Create/update profile (reuse editProfileId or last saved profile id to prevent duplicates)
      const name = profileName.trim() || `Quick Import ${new Date().toISOString()}`;
      const profileId = await upsertProfile(name);
      setSavedProfileId(profileId);

      // 2. Start chunked import
      const nonce = (window as any).wpApiSettings?.nonce || '';

      const extractHttpError = async (response: Response): Promise<string> => {
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await response.json().catch(() => null);
            const message = json?.errors?.[0] || json?.message;
            if (message) {
              return String(message);
            }
          }
        } catch (e) {
          // ignore
        }

        const statusLine = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
        const text = await response.text().catch(() => '');
        const snippet = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
        return snippet ? `${statusLine}: ${snippet}` : statusLine;
      };

      const startResponse = await fetch('/wp-json/pifwc/v1/import/chunk/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({
          profile_id: profileId,
          mode: updateMode,
          match_by: comparisonKey
        })
      });

      if (!startResponse.ok) {
        const msg = await extractHttpError(startResponse);
        throw new Error(msg || 'Failed to start import');
      }

      const startJson = await startResponse.json();
      const jobId = startJson?.data?.job_id;
      if (!jobId) {
        throw new Error(startJson?.errors?.[0] || 'Failed to get job ID');
      }

      const backgroundEnqueued = !!startJson?.data?.background_enqueued;

      setImportJobId(jobId);
      setImportTotalRows(null);
      setShowProgress(true);
      setImportStatus('processing');

      if (backgroundEnqueued) {
        return;
      }

      // 3. Drive the import via backend async process (Action Scheduler) instead of browser loop
      const processAsyncUrl = `/wp-json/pifwc/v1/import/process-async/${jobId}`;
      
      try {
        const asyncResp = await fetch(processAsyncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce
          }
        });

        if (!asyncResp.ok) {
           const msg = await extractHttpError(asyncResp);
           throw new Error(msg || 'Failed to start background processing');
        }
      } catch (e) {
        throw new Error(`Background process start failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      setIsImportRunning(false); // UI state is handled by ImportProgress component mostly, but we can reset the "starting" state
    } catch (error) {
      setImportStatus('failed');
      setIsImportRunning(false);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start import: ${errorMsg}`);
    } finally {
      startImportInFlightRef.current = false;
    }
  };

  const handleStopImport = async () => {
    chunkRunnerStopRef.current = true;
    const nonce = (window as any).wpApiSettings?.nonce || '';
    const jobId = importJobId;
    if (!jobId) {
      setIsImportRunning(false);
      setShowProgress(false);
      setImportJobId(null);
      setImportStatus('');
      return;
    }

    try {
      await fetch(`/wp-json/pifwc/v1/import/abort/${jobId}`, {
        method: 'POST',
        headers: {
          'X-WP-Nonce': nonce
        }
      });
    } catch (e) {
      // ignore
    } finally {
      setImportStatus('aborted');
      setIsImportRunning(false);
      setShowProgress(false);
      setImportJobId(null);
    }
  };

  const handleImportComplete = (data: any) => {
    if (typeof data?.total_rows === 'number') {
      setImportTotalRows(data.total_rows);
    }
    if (typeof data?.status === 'string') {
      setImportStatus(data.status);
    } else {
      setImportStatus('completed');
    }
    setIsImportRunning(false);
  };

  const handleImportError = (error: string) => {
    setImportStatus('failed');
    setIsImportRunning(false);
  };

  const renderStep5 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Launch Import</h2>

      <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-900 mb-3">Import Parameters</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="text-gray-900">{selectedSource === 'upload' ? 'Upload File' : 'Not selected'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="text-gray-900">{selectedFormat.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File:</span>
                  <span className="text-gray-900">{previewData?.original_name || 'No file'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rows:</span>
                  <span className="text-gray-900">{
                    (importTotalRows && importTotalRows > 0)
                      ? importTotalRows
                      : (previewData?.total_rows ?? previewData?.totalRows ?? previewData?.rows?.length ?? 0)
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mapped Fields:</span>
                  <span className="text-gray-900">{fieldMappings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode:</span>
                  <span className="text-gray-900">{updateMode === 'both' ? 'Update + Add' : updateMode === 'update' ? 'Update Only' : 'Add Only'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Comparison Key:</span>
                  <span className="text-gray-900">{comparisonKey.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conflict Behavior:</span>
                  <span className="text-gray-900">{conflictBehavior.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {showProgress && importJobId && (
              <ImportProgress
                jobId={importJobId}
                onAbort={() => void handleStopImport()}
                onProgress={(data) => {
                  if (typeof data?.total_rows === 'number') {
                    setImportTotalRows(data.total_rows);
                  }
                  if (typeof data?.status === 'string') {
                    setImportStatus(data.status);
                  }
                }}
                onComplete={handleImportComplete}
                onError={handleImportError}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-sm text-gray-600 mb-2">Profile Name (optional)</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Example: Products from Supplier A"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={isImportRunning}
          />
          {saveSuccess && (
            <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Profile saved successfully!
            </div>
          )}
        </div>

        <button 
          onClick={handleSaveProfile}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={!previewData || fieldMappings.length === 0 || isImportRunning}
        >
          <Save className="w-5 h-5" />
          Save Profile
        </button>

      </div>

    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return (
        <FieldMapping
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
          previewData={previewData}
          mappings={fieldMappings}
          setMappings={setFieldMappings}
          attributes={attributes}
          setAttributes={setAttributes}
          categories={categories}
          setCategories={setCategoriesSafe}
          productType={productType}
          setProductType={setProductType}
          onApplyTemplateProfile={applyTemplateProfile}
          onUndoTemplateApply={undoTemplateApply}
          canUndoTemplateApply={!!templateApplyBackup}
          isApplyingTemplate={isApplyingTemplate}
          templateAppliedProfileName={templateAppliedProfileName}
        />
      );
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <div className={currentStep === 3 ? '' : 'p-8 bg-gray-50'}>
      <div className={currentStep === 3 ? 'p-8 bg-gray-50' : ''}>
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900 mb-2">New Import</h1>
          <p className="text-gray-500">Import creation wizard - step {currentStep} of 5</p>
        </div>

        {renderStepIndicator()}
      </div>
      
      {renderCurrentStep()}

      {currentStep !== 3 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            (() => {
              const isActuallyRunning = isImportRunning || (!!importJobId && showProgress);
              return isActuallyRunning ? (
                <button
                  onClick={() => void handleStopImport()}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 min-w-[160px] font-medium"
                >
                  <X className="w-5 h-5" />
                  Stop Import
                </button>
              ) : (
                <button
                  onClick={() => void handleStartImport()}
                  disabled={!previewData || fieldMappings.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[160px] font-medium"
                >
                  <Play className="w-5 h-5" />
                  Start Import
                </button>
              );
            })()
          )}
        </div>
      )}

    </div>
  );
}