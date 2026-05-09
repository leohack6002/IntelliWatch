import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Battery, Cpu, Gauge, HardDrive, MemoryStick, Minimize2, Network, Save, ShieldAlert, SlidersHorizontal, Sparkles, Thermometer, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './styles.css';

const wsUrl = import.meta.env.VITE_INTELLIWATCH_WS_URL || 'ws://127.0.0.1:8765';
const TELEMETRY_CACHE_KEY = 'intelliwatch:lastTelemetry';

const fallback = {
  timestamp: new Date().toISOString(),
  status: 'normal',
  health_score: 94,
  metrics: {
    cpu_percent: 34,
    ram_percent: 58,
    gpu_percent: 41,
    temperature_c: 61,
    network_down_bps: 12_000_000,
    network_up_bps: 1_400_000,
    network_adapter_type: 'WiFi',
    network_adapter_name: 'Wi-Fi',
    wifi_signal_percent: 85,
    disk_percent: 46,
    battery_percent: 88,
    battery_plugged: false,
    uptime_seconds: 19380
  },
  alerts: [],
  ai: {
    anomaly: false,
    confidence: 0.91,
    insights: ['System behavior is stable.', 'No optimization required right now.']
  },
  processes: []
};

function useTelemetry() {
  const [packet, setPacket] = React.useState(() => readCachedTelemetry());
  const [history, setHistory] = React.useState([]);
  const [connected, setConnected] = React.useState(false);
  const [reconnecting, setReconnecting] = React.useState(false);

  React.useEffect(() => {
    let socket;
    let retryTimer;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        setConnected(true);
        setReconnecting(false);
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnected(false);
        setReconnecting(true);
        retryTimer = setTimeout(connect, 5000);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data);
        setPacket(next);
        localStorage.setItem(TELEMETRY_CACHE_KEY, JSON.stringify(next));
        setHistory((rows) => {
          const point = {
            time: new Date(next.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            cpu: next.metrics.cpu_percent,
            ram: next.metrics.ram_percent,
            gpu: next.metrics.gpu_percent,
            temp: next.metrics.temperature_c
          };
          return [...rows.slice(-59), point];
        });
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return { packet, history, connected, reconnecting, hasData: Boolean(packet) };
}

function readCachedTelemetry() {
  try {
    const cached = localStorage.getItem(TELEMETRY_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function formatBps(value = 0) {
  const kbps = value / 1024;
  const mbps = kbps / 1024;
  if (mbps >= 1) return `${mbps.toFixed(mbps >= 10 ? 0 : 1)} MB/s`;
  return `${kbps.toFixed(kbps >= 10 ? 0 : 1)} KB/s`;
}

function formatUptime(seconds = 0) {
  // Convert backend uptime seconds into the compact "Xh Xm" overlay display.
  try {
    const safeSeconds = Math.max(Number(seconds) || 0, 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  } catch {
    return '0h 0m';
  }
}

function statusColor(status) {
  if (status === 'critical') return 'bg-danger text-danger';
  if (status === 'warning') return 'bg-amber text-amber';
  return 'bg-mint text-mint';
}

function MetricLine({ icon: Icon, label, value, tone = 'cyan' }) {
  return (
    <div className="metric-line">
      <div className={`metric-icon ${tone}`}><Icon size={15} /></div>
      <span>{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

function NetworkMetric({ metrics }) {
  const adapterType = metrics.network_adapter_type || 'NET';
  const signal = metrics.wifi_signal_percent;
  const label = adapterType === 'WiFi' && signal !== null && signal !== undefined
    ? `WiFi ${signal}%`
    : adapterType;

  return (
    <div className="metric-line network-metric">
      <div className="metric-icon cyan"><Network size={15} /></div>
      <strong className="metric-value network-values">
        <span className="network-row">
          <span>{label}</span>
          <span>{'\u2193'} {formatBps(metrics.network_down_bps)}</span>
        </span>
        <span className="network-row network-row-upload">
          <span>{'\u2191'} {formatBps(metrics.network_up_bps)}</span>
        </span>
      </strong>
    </div>
  );
}

function Overlay() {
  const { packet, connected, reconnecting } = useTelemetry();
  const overlayCardRef = React.useRef(null);
  const displayPacket = packet || fallback;
  const m = displayPacket.metrics;
  const statusTone = statusColor(displayPacket.status);
  const critical = displayPacket.status === 'critical';

  React.useEffect(() => {
    const card = overlayCardRef.current;
    if (!card || !window.intelliwatch?.resizeOverlayHeight) return undefined;

    const updateHeight = () => window.intelliwatch.resizeOverlayHeight(card.scrollHeight + 12);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, [m.battery_percent, reconnecting]);

  return (
    <main className="overlay-shell fade-in" onDoubleClick={() => window.intelliwatch?.openDashboard()}>
      <button className="overlay-hit" onClick={() => window.intelliwatch?.openDashboard()} aria-label="Open IntelliWatch dashboard" />
      <section className="overlay-card" ref={overlayCardRef}>
        <div className="overlay-header">
          <div>
            <p className="eyebrow">IntelliWatch</p>
            <h1>Live Sentinel</h1>
          </div>
          <div className={`status-dot ${statusTone} ${critical ? 'critical-pulse' : ''}`} title={displayPacket.status} />
        </div>
        {reconnecting && <span className="reconnect-badge">Reconnecting...</span>}
        <MetricLine icon={Cpu} label="CPU" value={`${m.cpu_percent}%`} />
        <MetricLine icon={MemoryStick} label="RAM" value={`${m.ram_percent}%`} tone="green" />
        <MetricLine icon={HardDrive} label="DISK" value={`${m.disk_percent ?? 0}%`} tone="yellow" />
        {m.battery_percent !== null && m.battery_percent !== undefined && (
          <MetricLine icon={Battery} label="BATTERY" value={`${m.battery_percent}%`} tone="green" />
        )}
        <MetricLine icon={Activity} label="UPTIME" value={formatUptime(m.uptime_seconds)} />
        <NetworkMetric metrics={m} />
        <div className="overlay-footer">
          <span className={connected ? 'live' : 'offline'}>{connected ? 'REAL-TIME' : 'RECONNECTING'}</span>
          <strong>{displayPacket.status.toUpperCase()}</strong>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <article className="stat-card">
      <Icon size={20} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </article>
  );
}

function GpuStatCard({ value }) {
  // Some Windows systems do not expose GPU telemetry through the current collectors.
  const gpuSupported = value !== 0 && value !== null && value !== undefined;
  return (
    <StatCard
      icon={Gauge}
      label="GPU"
      value={gpuSupported ? `${value}%` : 'Unavailable'}
      sub={gpuSupported ? 'Graphics load' : 'GPU monitoring not supported on this system'}
    />
  );
}

function Dashboard() {
  const { packet, history, connected, hasData } = useTelemetry();
  const displayPacket = packet || fallback;
  const m = displayPacket.metrics;
  const chartRows = history;
  const alerts = displayPacket.alerts.length ? displayPacket.alerts : [{ level: 'normal', message: 'No active alerts. System is within learned operating range.' }];
  const topProcesses = displayPacket.processes?.slice(0, 8) ?? [];
  const suggestions = displayPacket.ai?.insights ?? [];
  const storage = displayPacket.storage;

  const healthLabel = useMemo(() => {
    if (displayPacket.health_score >= 85) return 'Excellent';
    if (displayPacket.health_score >= 70) return 'Watch';
    return 'Critical';
  }, [displayPacket.health_score]);

  return (
    <main className="dashboard">
      <header className="dash-header">
        <div>
          <p className="eyebrow">AI-powered system monitoring</p>
          <h1>IntelliWatch Command Center</h1>
        </div>
        <div className="header-actions">
          <span className={connected ? 'connection on' : 'connection'}>{connected ? 'Engine online' : 'Connecting...'}</span>
          <button onClick={() => window.intelliwatch?.minimizeDashboard()}><Minimize2 size={16} /> Tray</button>
        </div>
      </header>

      <section className="hero-band">
        <div className="health-ring">
          <span>{displayPacket.health_score}</span>
          <small>{healthLabel}</small>
        </div>
        <StatCard icon={Cpu} label="CPU" value={`${m.cpu_percent}%`} sub="Processor load" />
        <StatCard icon={MemoryStick} label="RAM" value={`${m.ram_percent}%`} sub="Memory pressure" />
        <GpuStatCard value={m.gpu_percent} />
        <StatCard icon={Thermometer} label="Thermal" value={`${m.temperature_c ?? 0}C`} sub="Estimated sensor" />
        <StatCard icon={HardDrive} label="Disk" value={`${m.disk_percent}%`} sub="Primary volume" />
        <StatCard icon={Battery} label="Battery" value={`${m.battery_percent ?? 100}%`} sub="Laptop health" />
      </section>

      <section className="dash-grid">
        <article className="panel chart-panel">
          <div className="panel-title">
            <h2>Live Performance</h2>
            <span>{connected ? 'Live cadence' : 'Connecting...'}</span>
          </div>
          {hasData && chartRows.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartRows}>
              <defs>
                <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#25d6ff" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#25d6ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ram" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#62f6a8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#62f6a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="time" stroke="#657489" tick={{ fontSize: 11 }} />
              <YAxis stroke="#657489" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#07111f', border: '1px solid rgba(37,214,255,.25)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="cpu" stroke="#25d6ff" fill="url(#cpu)" strokeWidth={2} />
              <Area type="monotone" dataKey="ram" stroke="#62f6a8" fill="url(#ram)" strokeWidth={2} />
              <Area type="monotone" dataKey="gpu" stroke="#f5c84b" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">Connecting...</div>
          )}
        </article>

        <aside className="panel insights">
          <div className="panel-title">
            <h2>AI Insights</h2>
            <Sparkles size={18} />
          </div>
          <div className={`ai-state ${displayPacket.ai?.anomaly ? 'alert' : ''}`}>
            <Zap size={20} />
            <div>
              <strong>{displayPacket.ai?.anomaly ? 'Anomaly detected' : 'Behavior normal'}</strong>
              <span>{Math.round((displayPacket.ai?.confidence ?? 0.9) * 100)}% confidence</span>
            </div>
          </div>
          {suggestions.map((item) => <p className="insight-row" key={item}>{item}</p>)}
        </aside>

        <article className="panel alerts">
          <div className="panel-title">
            <h2>Intelligent Alerts</h2>
            <ShieldAlert size={18} />
          </div>
          {alerts.map((alert, index) => (
            <div className={`alert-row ${alert.level}`} key={`${alert.message}-${index}`}>
              <span>{alert.level}</span>
              <p>{alert.message}</p>
            </div>
          ))}
        </article>

        <article className="panel processes">
          <div className="panel-title">
            <h2>Active Processes</h2>
            <Activity size={18} />
          </div>
          <div className="process-head"><span>Name</span><span>CPU</span><span>RAM</span></div>
          {topProcesses.map((process) => (
            <div className="process-row" key={`${process.pid}-${process.name}`}>
              <span>{process.name}</span>
              <strong>{process.cpu_percent.toFixed(1)}%</strong>
              <strong>{process.memory_percent.toFixed(1)}%</strong>
            </div>
          ))}
        </article>
        <article className="panel storage-panel">
          <div className="panel-title">
            <h2>Storage</h2>
            <HardDrive size={18} />
          </div>
          {storage ? (
            <p className="insight-row">{formatBytes(storage.bytes)} used of {formatBytes(storage.max_bytes)} ({storage.percent}%).</p>
          ) : (
            <p className="insight-row">Connecting...</p>
          )}
        </article>
      </section>
    </main>
  );
}

function formatBytes(bytes = 0) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function SettingsPanel() {
  const [settings, setSettings] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    window.intelliwatch?.getSettings?.().then(setSettings);
  }, []);

  if (!settings) {
    return <main className="dashboard"><div className="settings-panel"><p>Loading settings...</p></div></main>;
  }

  const update = (path, value) => {
    setSaved(false);
    setSettings((current) => {
      const next = JSON.parse(JSON.stringify(current));
      let target = next;
      path.slice(0, -1).forEach((part) => { target = target[part]; });
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    const next = await window.intelliwatch?.saveSettings?.(settings);
    if (next) setSettings(next);
    setSaved(true);
  };

  return (
    <main className={`dashboard ${settings.theme === 'light' ? 'light-mode' : ''}`}>
      <section className="settings-panel">
        <div className="panel-title">
          <h2>Settings</h2>
          <SlidersHorizontal size={18} />
        </div>
        <label>Startup delay
          <select value={settings.startupDelay} onChange={(event) => update(['startupDelay'], Number(event.target.value))}>
            {[10, 30, 60].map((value) => <option key={value} value={value}>{value}s</option>)}
          </select>
        </label>
        <label>Monitoring interval
          <select value={settings.monitoringInterval} onChange={(event) => update(['monitoringInterval'], Number(event.target.value))}>
            {[2, 5, 10].map((value) => <option key={value} value={value}>{value}s</option>)}
          </select>
        </label>
        <div className="settings-grid">
          <label>CPU threshold <input type="number" value={settings.thresholds.cpu} onChange={(event) => update(['thresholds', 'cpu'], Number(event.target.value))} /></label>
          <label>RAM threshold <input type="number" value={settings.thresholds.ram} onChange={(event) => update(['thresholds', 'ram'], Number(event.target.value))} /></label>
          <label>Temp threshold <input type="number" value={settings.thresholds.temperature} onChange={(event) => update(['thresholds', 'temperature'], Number(event.target.value))} /></label>
        </div>
        <div className="settings-grid">
          {Object.keys(settings.monitors).map((name) => (
            <label className="toggle-row" key={name}>
              <input type="checkbox" checked={settings.monitors[name]} onChange={(event) => update(['monitors', name], event.target.checked)} />
              {name.toUpperCase()}
            </label>
          ))}
        </div>
        <label>Theme
          <select value={settings.theme} onChange={(event) => update(['theme'], event.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <button className="save-settings" onClick={save}><Save size={16} /> {saved ? 'Saved' : 'Save settings'}</button>
      </section>
    </main>
  );
}

function App() {
  const route = window.location.hash.replace('#', '') || window.location.pathname;
  if (route.includes('settings')) return <SettingsPanel />;
  return route.includes('overlay') ? <Overlay /> : <Dashboard />;
}

createRoot(document.getElementById('root')).render(<App />);
