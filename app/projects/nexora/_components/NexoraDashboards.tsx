const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="nexora-metric"><span>{label}</span><b>{value}</b><i>↗ 12.5%</i></div>
);

export const NexoraDashboard = ({ compact = false }: { compact?: boolean }) => (
  <div className={`nexora-dashboard ${compact ? 'is-compact' : ''}`}>
    <aside><b>◉ NEXORA</b><span className="selected">Overview</span><span>Analytics</span><span>Reports</span><span>Projects</span><span>Users</span><span>Settings</span></aside>
    <div className="nexora-screen">
      <header><b>Overview</b><span>◌　◌　◌　◌</span></header>
      <div className="nexora-metrics"><Metric label="Total revenue" value="$24,980" /><Metric label="New users" value="1,248" /><Metric label="Active users" value="8,642" /><Metric label="Conversion rate" value="3.45%" /></div>
      <div className="nexora-chart"><span>Revenue</span><div className="chart-grid"><i /></div></div>
    </div>
  </div>
);

export const NexoraInsightBoard = () => (
  <div className="insight-board"><div className="insight-top"><b>Dashboard</b><span>◌　◌　◌</span></div><div className="insight-metrics"><Metric label="Users" value="8,642" /><Metric label="Sessions" value="17,842" /><Metric label="Bounce rate" value="32.6%" /><Metric label="Session time" value="4m 12s" /></div><div className="insight-charts"><div><span>Users over time</span><i className="bar-chart" /></div><div><span>Traffic by source</span><i className="donut-chart" /></div></div></div>
);

export const NexoraListBoard = () => <div className="list-board"><b>Projects</b><span>⌕　⊕</span><div className="list-head">Project　　　　　 Revenue　　　 Status</div>{['Website redesign', 'Mobile application', 'Design system'].map((item, index) => <div className="list-row" key={item}><i>●</i>{item}<small>{index === 1 ? 'In review' : 'In progress'}</small></div>)}</div>;

export const NexoraMapBoard = () => <div className="map-board"><b>Overview</b><div className="world-map">·　·　··　·<br />　··　　··　　·<br />··　　····　　··</div></div>;
