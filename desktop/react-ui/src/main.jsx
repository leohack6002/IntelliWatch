import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Battery, Cpu, Gauge, HardDrive, MemoryStick, Minimize2, Network, ShieldAlert, Sparkles, Thermometer, Zap } from 'lucide-react';
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
    disk_percent: 46,
    battery_percent: 88
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
  const [packet, setPacket] = React.useState(fallback);
  const [history, setHistory] = React.useState([]);
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let socket;
    let retryTimer;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        retryTimer = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data);
        setPacket(next);
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
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return { packet, history, connected };
}

function formatBps(value = 0) {
  const mbps = value / 1024 / 1024;
  return `${mbps.toFixed(mbps >= 10 ? 0 : 1)} MB/s`;
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
      <strong>{value}</strong>
    </div>
  );
}

function Overlay() {
  const { packet, connected } = useTelemetry();
  const m = packet.metrics;
  const statusTone = statusColor(packet.status);

  return (
    <main className="overlay-shell fade-in" onDoubleClick={() => window.intelliwatch?.openDashboard()}>
      <button className="overlay-hit" onClick={() => window.intelliwatch?.openDashboard()} aria-label="Open IntelliWatch dashboard" />
      <section className="overlay-card">
        <div className="overlay-header">
          <div>
            <p className="eyebrow">IntelliWatch</p>
            <h1>Live Sentinel</h1>
          </div>
          <div className={`status-dot ${statusTone}`} title={packet.status} />
        </div>
        <MetricLine icon={Cpu} label="CPU" value={`${m.cpu_percent}%`} />
        <MetricLine icon={MemoryStick} label="RAM" value={`${m.ram_percent}%`} tone="green" />
        <MetricLine icon={Gauge} label="GPU" value={`${m.gpu_percent ?? 0}%`} />
        <MetricLine icon={Thermometer} label="TEMP" value={`${m.temperature_c ?? 0}C`} tone={m.temperature_c > 80 ? 'red' : 'yellow'} />
        <MetricLine icon={Network} label="NET" value={formatBps(m.network_down_bps)} />
        <div className="overlay-footer">
          <span className={connected ? 'live' : 'offline'}>{connected ? 'REAL-TIME' : 'SIMULATED'}</span>
          <strong>{packet.status.toUpperCase()}</strong>
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
  const { packet, history, connected } = useTelemetry();
  const m = packet.metrics;
  const chartRows = history.length ? history : [
    { time: 'now', cpu: m.cpu_percent, ram: m.ram_percent, gpu: m.gpu_percent, temp: m.temperature_c }
  ];
  const alerts = packet.alerts.length ? packet.alerts : [{ level: 'normal', message: 'No active alerts. System is within learned operating range.' }];
  const topProcesses = packet.processes?.slice(0, 8) ?? [];
  const suggestions = packet.ai?.insights ?? [];

  const healthLabel = useMemo(() => {
    if (packet.health_score >= 85) return 'Excellent';
    if (packet.health_score >= 70) return 'Watch';
    return 'Critical';
  }, [packet.health_score]);

  return (
    <main className="dashboard">
      <header className="dash-header">
        <div>
          <p className="eyebrow">AI-powered system monitoring</p>
          <h1>IntelliWatch Command Center</h1>
        </div>
        <div className="header-actions">
          <span className={connected ? 'connection on' : 'connection'}>{connected ? 'Engine online' : 'Waiting for engine'}</span>
          <button onClick={() => window.intelliwatch?.minimizeDashboard()}><Minimize2 size={16} /> Tray</button>
        </div>
      </header>

      <section className="hero-band">
        <div className="health-ring">
          <span>{packet.health_score}</span>
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
            <span>2s cadence</span>
          </div>
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
        </article>

        <aside className="panel insights">
          <div className="panel-title">
            <h2>AI Insights</h2>
            <Sparkles size={18} />
          </div>
          <div className={`ai-state ${packet.ai?.anomaly ? 'alert' : ''}`}>
            <Zap size={20} />
            <div>
              <strong>{packet.ai?.anomaly ? 'Anomaly detected' : 'Behavior normal'}</strong>
              <span>{Math.round((packet.ai?.confidence ?? 0.9) * 100)}% confidence</span>
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
      </section>
    </main>
  );
}

function App() {
  const route = window.location.hash.replace('#', '') || window.location.pathname;
  return route.includes('overlay') ? <Overlay /> : <Dashboard />;
}

createRoot(document.getElementById('root')).render(<App />);
