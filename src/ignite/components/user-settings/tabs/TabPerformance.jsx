import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const formatBytes = (bytes) => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const PROCESS_TYPE_LABELS = {
  Browser: 'Main Process',
  Tab: 'Renderer',
  GPU: 'GPU Process',
  Utility: 'Utility',
  Zygote: 'Zygote',
  'Pepper Plugin': 'Plugin',
};

const MemoryBar = ({ label, used, total, sub }) => {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color =
    pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(used)}
          {sub && <span className="ml-1 text-muted-foreground/60">/ {formatBytes(total)}</span>}
        </span>
      </div>
      {total > 0 && sub && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const ProcessCard = ({ process: proc, totalMemory }) => {
  // memory.workingSetSize is in KB
  const workingSet = (proc.memory?.workingSetSize || 0) * 1024;
  const peakWorkingSet = (proc.memory?.peakWorkingSetSize || 0) * 1024;
  const label = PROCESS_TYPE_LABELS[proc.type] || proc.type;
  const cpuPct = proc.cpu?.percentCPUUsage?.toFixed(1) ?? '0.0';

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {proc.name && proc.name !== proc.type && (
            <span className="text-xs text-muted-foreground">({proc.name})</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">PID {proc.pid}</span>
      </div>
      <MemoryBar label="Working Set" used={workingSet} total={totalMemory} sub />
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Peak: {formatBytes(peakWorkingSet)}</span>
        <span>CPU: {cpuPct}%</span>
        {proc.type === 'Tab' && (
          <span className="text-muted-foreground/60">
            Includes V8, Blink, image caches, DOM
          </span>
        )}
      </div>
    </div>
  );
};

const TabPerformance = () => {
  const [processes, setProcesses] = useState(null);
  const [jsMemory, setJsMemory] = useState(null);
  const [loading, setLoading] = useState(false);
  const isNative = !!window.IgniteNative;

  const refresh = useCallback(async () => {
    setLoading(true);

    // Browser JS heap (available in Chromium)
    if (performance.memory) {
      setJsMemory({
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      });
    }

    // Electron app metrics — all processes
    if (window.IgniteNative?.getMemoryUsage) {
      try {
        const data = await window.IgniteNative.getMemoryUsage();
        setProcesses(data);
      } catch {
        // not available
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const totalMemory = useMemo(() => {
    if (!processes) return 0;
    return processes.reduce((sum, p) => sum + (p.memory?.workingSetSize || 0) * 1024, 0);
  }, [processes]);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Performance</h2>
          <p className="text-sm text-muted-foreground">
            Process memory usage and runtime information.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Total memory across all processes */}
      {processes && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Total Memory (Working Set)
            </h3>
            <span className="text-lg font-bold text-foreground">{formatBytes(totalMemory)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Across {processes.length} process{processes.length !== 1 ? 'es' : ''}.
            Includes shared memory (DLLs, GPU textures) — Task Manager shows private working set which is lower.
          </p>
        </section>
      )}

      {/* JS Heap */}
      {jsMemory && (
        <section className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            JavaScript Heap (Renderer)
          </h3>
          <MemoryBar
            label="Used Heap"
            used={jsMemory.usedJSHeapSize}
            total={jsMemory.totalJSHeapSize}
            sub
          />
          <MemoryBar
            label="Allocated Heap"
            used={jsMemory.totalJSHeapSize}
            total={jsMemory.jsHeapSizeLimit}
            sub
          />
          <div className="pt-1">
            <StatRow label="Heap Limit" value={formatBytes(jsMemory.jsHeapSizeLimit)} />
          </div>
        </section>
      )}

      {/* Per-process breakdown */}
      {processes && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Processes
          </h3>
          <div className="space-y-2">
            {processes
              .sort((a, b) => (b.memory?.workingSetSize || 0) - (a.memory?.workingSetSize || 0))
              .map((proc) => (
                <ProcessCard key={proc.pid} process={proc} totalMemory={totalMemory} />
              ))}
          </div>
        </section>
      )}

      {/* Runtime Info */}
      <section className="space-y-2 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Runtime
        </h3>
        <StatRow label="Platform" value={isNative ? window.IgniteNative.platform : 'Web'} />
        {window.IgniteNative?.electronVersion && (
          <StatRow label="Electron" value={window.IgniteNative.electronVersion} />
        )}
        <StatRow label="User Agent" value={navigator.userAgent.split(' ').pop()} />
        <StatRow
          label="DOM Nodes"
          value={document.querySelectorAll('*').length.toLocaleString()}
        />
      </section>

      <p className="text-xs text-muted-foreground/60">
        Memory stats refresh every 5 seconds automatically.
      </p>
    </div>
  );
};

export default TabPerformance;
