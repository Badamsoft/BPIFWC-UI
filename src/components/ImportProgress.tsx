import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ProgressData {
  job_id: number;
  status: string;
  total_rows: number;
  processed: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  progress: number;
  current_row: number;
  started_at?: string | null;
  finished_at?: string | null;
  timestamp: number;
}

interface ImportProgressProps {
  jobId: number;
  onComplete?: (data: ProgressData) => void;
  onError?: (error: string) => void;
  onProgress?: (data: ProgressData) => void;
  onAbort?: () => void;
}

export function ImportProgress({ jobId, onComplete, onError, onProgress, onAbort }: ImportProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionHint, setConnectionHint] = useState<string | null>(null);
  const [startedAtEpoch, setStartedAtEpoch] = useState<number | null>(null);
  const [finishedAtEpoch, setFinishedAtEpoch] = useState<number | null>(null);
  const [nowEpoch, setNowEpoch] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [serverSkewSeconds, setServerSkewSeconds] = useState<number | null>(null);
  const progressRef = useRef<ProgressData | null>(null);
  const pumpInFlightRef = useRef(false);
  const lastProgressChangeAtRef = useRef<number>(Date.now());
  const lastProcessedRef = useRef<number>(0);
  const lastStatusRef = useRef<string>('');
  const pumpDelayMsRef = useRef<number>(7000);
  const pumpFailuresRef = useRef<number>(0);
  const onCompleteRef = useRef<ImportProgressProps['onComplete']>(onComplete);
  const onErrorRef = useRef<ImportProgressProps['onError']>(onError);
  const onProgressRef = useRef<ImportProgressProps['onProgress']>(onProgress);
  const didCompleteRef = useRef(false);

  const toNumber = (value: any): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeProgress = (raw: any, fallbackJobId: number): ProgressData => {
    const unwrapped = raw?.data ?? raw;
    const processed = toNumber(
      unwrapped?.processed ??
        (toNumber(unwrapped?.added) + toNumber(unwrapped?.updated) + toNumber(unwrapped?.skipped) + toNumber(unwrapped?.errors))
    );

    return {
      job_id: toNumber(unwrapped?.job_id ?? unwrapped?.id ?? fallbackJobId),
      status: unwrapped?.status ?? 'pending',
      total_rows: toNumber(unwrapped?.total_rows ?? 0),
      processed,
      added: toNumber(unwrapped?.added ?? 0),
      updated: toNumber(unwrapped?.updated ?? 0),
      skipped: toNumber(unwrapped?.skipped ?? 0),
      errors: toNumber(unwrapped?.errors ?? 0),
      progress: toNumber(unwrapped?.progress ?? 0),
      current_row: toNumber(unwrapped?.current_row ?? processed),
      started_at: unwrapped?.started_at ?? null,
      finished_at: unwrapped?.finished_at ?? null,
      timestamp: toNumber(unwrapped?.timestamp ?? Math.floor(Date.now() / 1000))
    };
  };

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!progress) return;
    const processed = toNumber((progress as any).processed);
    const status = String((progress as any).status ?? '');
    if (processed !== lastProcessedRef.current || status !== lastStatusRef.current) {
      lastProcessedRef.current = processed;
      lastStatusRef.current = status;
      lastProgressChangeAtRef.current = Date.now();
      pumpFailuresRef.current = 0;
      pumpDelayMsRef.current = 7000;
    }
  }, [progress]);

  useEffect(() => {
    if (!progress) return;
    const clientNow = Math.floor(Date.now() / 1000);
    const skew = toNumber(progress.timestamp) - clientNow;
    setServerSkewSeconds(skew);
    setStartedAtEpoch((prev: number | null) => {
      if (prev !== null) return prev;
      return toNumber(progress.timestamp);
    });
  }, [progress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
  }, [onComplete, onError, onProgress]);

  const parseToEpochSeconds = (value?: string | null): number | null => {
    if (!value) return null;
    const ms = Date.parse(value.replace(' ', 'T'));
    if (Number.isNaN(ms)) return null;
    return Math.floor(ms / 1000);
  };

  const formatElapsed = (seconds: number): string => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    didCompleteRef.current = false;
    setProgress(null);
    setError(null);
    setConnectionHint(null);
    setIsConnected(false);
    setStartedAtEpoch(null);
    setFinishedAtEpoch(null);
    setServerSkewSeconds(null);
    const nonce = (window as any).wpApiSettings?.nonce as string | undefined;
    const url = nonce
      ? `/wp-json/pifwc/v1/import/progress/${jobId}?_wpnonce=${encodeURIComponent(nonce)}`
      : `/wp-json/pifwc/v1/import/progress/${jobId}`;

    const eventSource = new EventSource(url);

    let pollId: number | null = null;
    let pollDelayMs = 1000;
    const minPollDelayMs = 1000;
    const maxPollDelayMs = 15000;
    const stopPolling = () => {
      if (pollId) {
        window.clearTimeout(pollId);
        pollId = null;
      }
    };

    let didFail = false;
    const fail = (message: string) => {
      if (didFail) return;
      didFail = true;
      stopPolling();
      setError(message);
      setIsConnected(false);
      onErrorRef.current?.(message);
      eventSource.close();
    };

    const completeOnce = (data: ProgressData) => {
      if (didCompleteRef.current) return;
      didCompleteRef.current = true;
      stopPolling();
      setIsConnected(false);
      onCompleteRef.current?.(data);
      eventSource.close();
    };

    let pollFailures = 0;
    const fetchStatus = async (): Promise<ProgressData | null> => {
      try {
        const statusUrl = nonce
          ? `/wp-json/pifwc/v1/import/status/${jobId}?_wpnonce=${encodeURIComponent(nonce)}`
          : `/wp-json/pifwc/v1/import/status/${jobId}`;
        const response = await fetch(statusUrl, {
          headers: {
            'X-WP-Nonce': nonce || ''
          }
        });
        if (!response.ok) {
          pollFailures++;
          if (pollFailures >= 3) {
            setConnectionHint(`Status polling failed (HTTP ${response.status})`);
          }
          pollDelayMs = Math.min(maxPollDelayMs, Math.max(minPollDelayMs, pollDelayMs * 2));
          return null;
        }
        const json = await response.json();
        const raw = json?.data;
        if (!raw) {
          pollFailures++;
          pollDelayMs = Math.min(maxPollDelayMs, Math.max(minPollDelayMs, pollDelayMs * 2));
          return null;
        }

        pollFailures = 0;
        setConnectionHint(null);
        pollDelayMs = minPollDelayMs;

        return normalizeProgress(raw, jobId);
      } catch (e) {
        pollDelayMs = Math.min(maxPollDelayMs, Math.max(minPollDelayMs, pollDelayMs * 2));
        return null;
      }
    };

    const pollOnce = async () => {
      const status = await fetchStatus();
      if (!status) return;

      setProgress(status);
      onProgressRef.current?.(status);
      setServerSkewSeconds(toNumber(status.timestamp) - Math.floor(Date.now() / 1000));
      setStartedAtEpoch((prev: number | null) => {
        if (prev !== null) return prev;
        return toNumber(status.timestamp);
      });

      const st = status.status;
      const isComplete = st === 'completed' || st === 'completed_with_errors';
      const hasFailed = st === 'failed' || st === 'aborted';
      if (isComplete) {
        setFinishedAtEpoch((prev: number | null) => {
          if (prev !== null) return prev;
          return toNumber(status.timestamp);
        });
        completeOnce(status);
      } else if (hasFailed) {
        setFinishedAtEpoch((prev: number | null) => {
          if (prev !== null) return prev;
          return toNumber(status.timestamp);
        });
        fail('Import failed');
      }
    };

    const scheduleNextPoll = () => {
      if (pollId) {
        window.clearTimeout(pollId);
        pollId = null;
      }

      pollId = window.setTimeout(async () => {
        await pollOnce();
        if (!didCompleteRef.current && !didFail) {
          scheduleNextPoll();
        }
      }, pollDelayMs);
    };

    const startPolling = () => {
      if (pollId) return;
      pollDelayMs = minPollDelayMs;
      void pollOnce().finally(() => {
        if (!didCompleteRef.current && !didFail) {
          scheduleNextPoll();
        }
      });
    };

    const bootstrapPollTimeout = window.setTimeout(() => {
      if (!progressRef.current) {
        startPolling();
      }
    }, 1500);

    const pumpOnce = async () => {
      if (pumpInFlightRef.current) return;
      const last = progressRef.current;
      const st = last?.status;
      const isTerminal = st === 'completed' || st === 'completed_with_errors' || st === 'failed' || st === 'aborted';
      if (isTerminal) return;

      const now = Date.now();
      const staleMs = 15000;
      if (now - lastProgressChangeAtRef.current < staleMs) return;

      pumpInFlightRef.current = true;
      try {
        const pumpUrl = `/wp-json/pifwc/v1/import/pump/${jobId}`;
        const resp = await fetch(pumpUrl, {
          method: 'POST',
          headers: {
            'X-WP-Nonce': nonce || ''
          }
        });
        if (!resp.ok) {
          pumpFailuresRef.current += 1;
          pumpDelayMsRef.current = Math.min(60000, Math.max(7000, pumpDelayMsRef.current * 2));
        } else {
          pumpFailuresRef.current = 0;
          pumpDelayMsRef.current = 7000;
        }
      } catch (e) {
        pumpFailuresRef.current += 1;
        pumpDelayMsRef.current = Math.min(60000, Math.max(7000, pumpDelayMsRef.current * 2));
      } finally {
        pumpInFlightRef.current = false;
      }
    };

    let pumpId: number | null = null;
    const scheduleNextPump = () => {
      if (pumpId) {
        window.clearTimeout(pumpId);
        pumpId = null;
      }

      pumpId = window.setTimeout(async () => {
        await pumpOnce();
        if (!didCompleteRef.current && !didFail) {
          scheduleNextPump();
        }
      }, pumpDelayMsRef.current);
    };

    void pumpOnce().finally(() => {
      if (!didCompleteRef.current && !didFail) {
        scheduleNextPump();
      }
    });

    eventSource.addEventListener('progress', (event) => {
      const raw = JSON.parse(event.data);
      const data = normalizeProgress(raw, jobId);
      setProgress(data);
      onProgressRef.current?.(data);
      setIsConnected(true);
      stopPolling();
      setServerSkewSeconds(toNumber(data.timestamp) - Math.floor(Date.now() / 1000));
      setStartedAtEpoch((prev: number | null) => {
        if (prev !== null) return prev;
        return toNumber(data.timestamp);
      });
      setFinishedAtEpoch((prev: number | null) => {
        if (prev !== null) return prev;
        const st = data.status;
        const isTerminal = st === 'completed' || st === 'completed_with_errors' || st === 'failed' || st === 'aborted';
        if (!isTerminal) return null;
        return toNumber(data.timestamp);
      });
    });

    eventSource.addEventListener('message', (event) => {
      try {
        const raw = JSON.parse((event as MessageEvent).data);
        const data = normalizeProgress(raw, jobId);
        setProgress(data);
        onProgressRef.current?.(data);
        setIsConnected(true);
        stopPolling();
        setServerSkewSeconds(toNumber(data.timestamp) - Math.floor(Date.now() / 1000));
        setStartedAtEpoch((prev: number | null) => {
          if (prev !== null) return prev;
          return toNumber(data.timestamp);
        });
        setFinishedAtEpoch((prev: number | null) => {
          if (prev !== null) return prev;
          const st = data.status;
          const isTerminal = st === 'completed' || st === 'completed_with_errors' || st === 'failed' || st === 'aborted';
          if (!isTerminal) return null;
          return toNumber(data.timestamp);
        });
      } catch (e) {
        // ignore
      }
    });

    eventSource.addEventListener('complete', (event) => {
      const raw = JSON.parse(event.data);
      const normalized = normalizeProgress(raw, jobId);

      setProgress(normalized);
      onProgressRef.current?.(normalized);
      setFinishedAtEpoch((prev: number | null) => {
        if (prev !== null) return prev;
        return toNumber(normalized.timestamp);
      });
      completeOnce(normalized);
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const rawData = (event as MessageEvent).data;
        const errorData = rawData ? JSON.parse(rawData) : null;
        if (errorData?.message === 'Job not found') {
          fail('Job not found');
          return;
        }
        setIsConnected(false);
        eventSource.close();
        startPolling();
      } catch (e) {
        setIsConnected(false);
        eventSource.close();
        startPolling();
      }
    });

    eventSource.addEventListener('close', () => {
      const lastStatus = progressRef.current?.status;
      const isTerminal =
        lastStatus === 'completed' ||
        lastStatus === 'completed_with_errors' ||
        lastStatus === 'failed' ||
        lastStatus === 'aborted';
      if (isTerminal) {
        stopPolling();
        eventSource.close();
        return;
      }

      setIsConnected(false);
      eventSource.close();
      startPolling();
    });

    return () => {
      window.clearTimeout(bootstrapPollTimeout);
      if (pumpId) {
        window.clearTimeout(pumpId);
        pumpId = null;
      }
      stopPolling();
      eventSource.close();
    };
  }, [jobId]);

  useEffect(() => {
    if (finishedAtEpoch !== null) {
      setNowEpoch(finishedAtEpoch);
      return;
    }
    const id = window.setInterval(() => {
      const clientNow = Math.floor(Date.now() / 1000);
      setNowEpoch(clientNow + (serverSkewSeconds ?? 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [finishedAtEpoch, serverSkewSeconds]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Connecting to import stream...</span>
        </div>
        {connectionHint && (
          <div className="mt-2 text-sm text-blue-700">
            {connectionHint}
          </div>
        )}
      </div>
    );
  }

  const isComplete = progress.status === 'completed' || progress.status === 'completed_with_errors';
  const hasFailed = progress.status === 'failed' || progress.status === 'aborted';
  const isRunning = !isComplete && !hasFailed;

  const addedCount = toNumber((progress as any).added);
  const updatedCount = toNumber((progress as any).updated);
  const skippedCount = toNumber((progress as any).skipped);
  const errorsCount = toNumber((progress as any).errors);
  const processedCount = toNumber((progress as any).processed);
  const totalRowsCount = toNumber((progress as any).total_rows);
  const currentRowCount = toNumber((progress as any).current_row);

  const imported = addedCount + updatedCount;

  const clamp = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  };

  const computeProgressPercent = (): number => {
    const backendProgressRaw = toNumber((progress as any).progress);
    const rowBasedProcessed = currentRowCount > 0 ? currentRowCount : processedCount;

    let pct = 0;

    if (totalRowsCount > 0) {
      pct = (rowBasedProcessed / totalRowsCount) * 100;
    } else {
      pct = backendProgressRaw;
      if (pct > 0 && pct <= 1) {
        pct = pct * 100;
      }
    }

    if (isComplete) {
      pct = 100;
    } else {
      pct = clamp(pct, 0, 99.9);
    }

    return clamp(pct, 0, 100);
  };

  const progressPercent = computeProgressPercent();
  const endEpoch = finishedAtEpoch ?? nowEpoch;
  const elapsedSeconds = startedAtEpoch !== null ? endEpoch - startedAtEpoch : 0;
  const statusLabel =
    progress.status === 'completed'
      ? 'Completed'
      : progress.status === 'completed_with_errors'
      ? 'Completed with errors'
      : progress.status === 'failed'
      ? 'Failed'
      : progress.status === 'aborted'
      ? 'Aborted'
      : progress.status === 'running'
      ? 'Running'
      : progress.status === 'pending'
      ? 'Pending'
      : progress.status;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Import Progress
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{statusLabel}</span>
          {isConnected && !isComplete && !hasFailed && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {onAbort && isRunning && (
            <button
              type="button"
              onClick={onAbort}
              data-pifwc-stop-import
              style={{ background: '#dc2626', backgroundColor: '#dc2626', color: '#ffffff' }}
              className="px-3 py-1.5 !bg-red-600 !text-white rounded-md hover:!bg-red-700 text-sm font-medium"
            >
              Stop Import
            </button>
          )}
          {isComplete && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          {hasFailed && (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Row {currentRowCount} of {totalRowsCount}
          </span>
          <span className="font-medium text-gray-900">
            {progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              display: 'block',
              backgroundColor: isComplete ? '#16a34a' : hasFailed ? '#dc2626' : '#d20c0b'
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">{imported}</div>
          <div className="text-xs text-gray-600">Imported</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">{processedCount}/{totalRowsCount}</div>
          <div className="text-xs text-gray-600">Processed</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900">{formatElapsed(elapsedSeconds)}</div>
          <div className="text-xs text-gray-600">Elapsed</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-700">
            {addedCount}
          </div>
          <div className="text-xs text-green-600">Added</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-700">
            {updatedCount}
          </div>
          <div className="text-xs text-blue-600">Updated</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-700">
            {skippedCount}
          </div>
          <div className="text-xs text-yellow-600">Skipped</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-700">
            {errorsCount}
          </div>
          <div className="text-xs text-red-600">Errors</div>
        </div>
      </div>

      {/* Status Message */}
      {isComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Import completed successfully!
            </span>
          </div>
        </div>
      )}

      {hasFailed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Import failed. Check logs for details.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
