// src/ReportSectionComponents.jsx
// Individual report section components for dynamic rendering

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Trophy, TrendingDown, Award, Target, Activity, Users, Flame,
  Percent, Star
} from 'lucide-react';

const STANDARD_COLORS = {
  'AAAA': { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', hex: '#f43f5e' },
  'AAA': { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hex: '#a855f7' },
  'AA': { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
  'A': { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hex: '#eab308' },
  'BB': { bg: 'bg-slate-400', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hex: '#94a3b8' },
  'B': { bg: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#d97706' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ icon: Icon, label, value, subValue, color = 'blue', large = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${large ? 'col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-slate-800 ${large ? 'text-3xl' : 'text-2xl'} mt-0.5`}>{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

const ExpandableSection = ({ title, icon: Icon, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Icon size={20} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          {count !== undefined && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {count}
            </span>
          )}
        </div>
      </button>
      {isOpen && <div className="px-4 pb-4 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
};

// Section: Overview Stats
export const OverviewStatsSection = ({ data }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard icon={Activity} label="Total Swims" value={data.totalSwims} color="blue" />
    <StatCard
      icon={Trophy}
      label="Best Times"
      value={data.bestTimeCount}
      subValue={`${data.btPercent}% of swims`}
      color="green"
    />
    <StatCard icon={Flame} label="First Times" value={data.firstTimeCount} color="orange" />
    <StatCard icon={Award} label="New Standards" value={data.newStandards?.length || 0} color="purple" />
  </div>
);

// Section: BT Percentage Hero
export const BTPercentageSection = ({ data }) => (
  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wide opacity-90 mb-2">Team Best Time Rate</p>
      <p className="text-7xl font-black mb-3">{data.btPercent}%</p>
      <p className="text-lg opacity-90">
        {data.bestTimeCount} out of {data.totalSwims} swims
      </p>
    </div>
  </div>
);

// Section: Time Drops
export const TimeDropsSection = ({ data, config }) => {
  const limit = config?.limit || 5;
  const drops = data.topTimeDrops?.slice(0, limit) || [];

  return (
    <ExpandableSection title="🔥 Biggest Time Drops" icon={TrendingDown} count={drops.length}>
      <div className="space-y-3">
        {drops.map((drop, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-yellow-400 text-white' :
                idx === 1 ? 'bg-slate-300 text-white' :
                idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{drop.swimmer.name}</div>
                <div className="text-sm text-slate-500">{drop.event}</div>
                <div className="text-xs text-slate-400">{drop.oldTime} → {drop.newTime}</div>
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-600">-{drop.drop.toFixed(2)}s</div>
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};

// Section: Percent Drops
export const PercentDropsSection = ({ data, config }) => {
  const limit = config?.limit || 5;
  const drops = data.topPercentDrops?.slice(0, limit) || [];

  return (
    <ExpandableSection title="📊 Biggest Percentage Drops" icon={Percent} count={drops.length}>
      <div className="space-y-3">
        {drops.map((drop, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-yellow-400 text-white' :
                idx === 1 ? 'bg-slate-300 text-white' :
                idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{drop.swimmer.name}</div>
                <div className="text-sm text-slate-500">{drop.event}</div>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-600">{drop.dropPercent.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};

// Section: New Standards
export const NewStandardsSection = ({ data, config }) => {
  const groupByLevel = config?.groupByLevel ?? true;
  const showTimes = config?.showTimes ?? true;

  if (!data.newStandards || data.newStandards.length === 0) {
    return null;
  }

  return (
    <ExpandableSection title="🏆 New Time Standards" icon={Award} count={data.newStandards.length}>
      {groupByLevel ? (
        <div className="space-y-6">
          {['AAAA', 'AAA', 'AA', 'A', 'BB', 'B'].map(level => {
            const levelStandards = data.standardsByLevel?.[level] || [];
            if (levelStandards.length === 0) return null;

            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`${STANDARD_COLORS[level].bg} text-white px-3 py-1 rounded-full font-bold text-sm`}>
                    {level}
                  </span>
                  <span className="text-sm text-slate-500">{levelStandards.length} achieved</span>
                </div>
                <div className="space-y-2">
                  {levelStandards.map((ns, idx) => (
                    <div key={idx} className={`p-3 ${STANDARD_COLORS[level].light} rounded-xl border ${STANDARD_COLORS[level].border}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-800">{ns.swimmer.name}</span>
                          <span className="text-slate-500 ml-2">- {ns.event}</span>
                        </div>
                        {showTimes && <span className="font-mono text-slate-600">{ns.time}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {data.newStandards.map((ns, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-800">{ns.swimmer.name}</span>
                <span className="text-slate-500 ml-2">- {ns.event}</span>
                <span className={`ml-2 ${STANDARD_COLORS[ns.standard.split(' ').pop()]?.text || 'text-slate-600'} font-semibold`}>
                  {ns.standard.split(' ').pop()}
                </span>
              </div>
              {showTimes && <span className="font-mono text-slate-600">{ns.time}</span>}
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
};

// Section: Meet Cuts
export const MeetCutsSection = ({ data, config }) => {
  const groupByMeet = config?.groupByMeet ?? true;

  if (!data.meetCutsByMeet || Object.keys(data.meetCutsByMeet).length === 0) {
    return null;
  }

  return (
    <ExpandableSection title="🎯 New Meet Cuts" icon={Target} count={data.newMeetCuts?.length || 0}>
      {groupByMeet ? (
        <div className="space-y-6">
          {Object.entries(data.meetCutsByMeet).map(([meetName, cuts]) => (
            <div key={meetName}>
              <h4 className="font-bold text-slate-800 mb-3 text-lg border-b pb-2">{meetName}</h4>
              <div className="space-y-2">
                {cuts.map((cut, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800">{cut.swimmer.name}</span>
                        <span className="text-slate-500 ml-2">- {cut.event}</span>
                      </div>
                      <span className="font-mono text-blue-600">{cut.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.newMeetCuts.map((cut, idx) => (
            <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-800">{cut.swimmer.name}</span>
                  <span className="text-slate-500 ml-2">- {cut.event}</span>
                  <span className="text-blue-600 ml-2 text-sm">({cut.meetName})</span>
                </div>
                <span className="font-mono text-blue-600">{cut.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
};

// Section: Stroke Performance
export const StrokePerformanceSection = ({ data, config }) => {
  const showChart = config?.showChart ?? true;
  const showTable = config?.showTable ?? true;

  if (!data.strokeStats || Object.keys(data.strokeStats).length === 0) {
    return null;
  }

  const chartData = Object.entries(data.strokeStats).map(([stroke, stats]) => ({
    stroke,
    btRate: stats.btPercent
  }));

  return (
    <ExpandableSection title="🏊 Performance by Stroke" icon={Activity}>
      {showChart && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="stroke" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="btRate" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {showTable && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 font-semibold text-slate-700">Stroke</th>
              <th className="text-right py-2 font-semibold text-slate-700">Swims</th>
              <th className="text-right py-2 font-semibold text-slate-700">BT %</th>
              <th className="text-right py-2 font-semibold text-slate-700">Avg Drop</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.strokeStats).map(([stroke, stats]) => (
              <tr key={stroke} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-800">{stroke}</td>
                <td className="text-right py-2 text-slate-600">{stats.swims}</td>
                <td className="text-right py-2 text-emerald-600 font-semibold">{stats.btPercent}%</td>
                <td className="text-right py-2 text-slate-600">
                  {stats.avgDrop > 0 ? `-${stats.avgDrop.toFixed(2)}s` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ExpandableSection>
  );
};

// Section: Group Performance
export const GroupPerformanceSection = ({ data, config }) => {
  const showChart = config?.showChart ?? true;

  if (!data.groupStats || data.groupStats.length === 0) {
    return null;
  }

  const chartData = data.groupStats.map(g => ({
    group: g.name,
    btRate: g.btPercent
  }));

  return (
    <ExpandableSection title="👥 Performance by Group" icon={Users}>
      {showChart && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="group" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="btRate" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 font-semibold text-slate-700">Group</th>
            <th className="text-right py-2 font-semibold text-slate-700">Swimmers</th>
            <th className="text-right py-2 font-semibold text-slate-700">Swims</th>
            <th className="text-right py-2 font-semibold text-slate-700">BT %</th>
          </tr>
        </thead>
        <tbody>
          {data.groupStats.map((group, idx) => (
            <tr key={idx} className="border-b border-slate-100">
              <td className="py-2 font-medium text-slate-800">{group.name}</td>
              <td className="text-right py-2 text-slate-600">{group.swimmerCount}</td>
              <td className="text-right py-2 text-slate-600">{group.swims}</td>
              <td className="text-right py-2 text-emerald-600 font-semibold">{group.btPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ExpandableSection>
  );
};

// Section: Biggest Movers
export const BiggestMoversSection = ({ data, config }) => {
  const limit = config?.limit || 10;
  const movers = data.biggestMovers?.slice(0, limit) || [];

  return (
    <ExpandableSection title="🔥 Biggest Movers" icon={Flame} count={movers.length}>
      <div className="space-y-3">
        {movers.map((mover, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                idx === 0 ? 'bg-yellow-400 text-white' :
                idx === 1 ? 'bg-slate-300 text-white' :
                idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{mover.swimmer.name}</div>
                <div className="text-sm text-slate-500">
                  {mover.bestTimes} BT • Best: {mover.biggestDropEvent} (-{mover.biggestDrop.toFixed(2)}s)
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-600">-{mover.totalDrop.toFixed(2)}s</div>
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};

// Section: Team Records Broken
export const RecordsBrokenSection = ({ data }) => {
  const records = data.recordsBroken || [];
  
  if (records.length === 0) {
    return null; // Don't show section if no records broken
  }

  return (
    <ExpandableSection title="⭐ Team Records Broken" icon={Star} count={records.length}>
      <div className="space-y-4">
        {records.map((record, idx) => (
          <div key={idx} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Swimmer & Event */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{record.swimmer_name}</div>
                    <div className="text-sm text-slate-600">
                      {record.gender} {record.age_group} • {record.event}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right: Times */}
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">New Record</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono mb-2">
                  {record.time_display}
                </div>
                <div className="flex items-center gap-2 justify-end text-sm">
                  <span className="text-slate-500">Previous:</span>
                  <span className="font-mono text-slate-600 line-through">
                    {record.previous_time_display || 'N/A'}
                  </span>
                </div>
                {record.improvement_seconds && (
                  <div className="mt-1 text-xs font-semibold text-emerald-600">
                    ⬇️ Improved by {record.improvement_seconds.toFixed(2)}s
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};

// Export section mapping
export const SECTION_COMPONENTS = {
  'overview-stats': OverviewStatsSection,
  'bt-percentage': BTPercentageSection,
  'time-drops': TimeDropsSection,
  'percent-drops': PercentDropsSection,
  'new-standards': NewStandardsSection,
  'meet-cuts': MeetCutsSection,
  'records-broken': RecordsBrokenSection,
  'stroke-performance': StrokePerformanceSection,
  'group-performance': GroupPerformanceSection,
  'biggest-movers': BiggestMoversSection,
};

