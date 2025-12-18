// src/reportPDFGenerators.js
// PDF HTML generators for each report section

// Helper to abbreviate event names for PDF
const abbreviateEvent = (event) => {
  if (!event) return '';
  return event
    .replace('Freestyle', 'Free')
    .replace('Backstroke', 'Back')
    .replace('Breaststroke', 'Breast')
    .replace('Butterfly', 'Fly');
};

// Section: Overview Stats
export const generateOverviewStatsHTML = (data) => `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">Total Swims</div>
      <div class="value">${data.totalSwims}</div>
    </div>
    <div class="stat-card">
      <div class="label">Best Times</div>
      <div class="value">${data.bestTimeCount}</div>
      <div class="sub">${data.btPercent}% of swims</div>
    </div>
    <div class="stat-card">
      <div class="label">First Times</div>
      <div class="value">${data.firstTimeCount}</div>
    </div>
    <div class="stat-card">
      <div class="label">New Standards</div>
      <div class="value">${data.newStandards?.length || 0}</div>
    </div>
  </div>
`;

// Section: BT Percentage Hero
export const generateBTPercentageHTML = (data) => `
  <div class="hero">
    <div>
      <div style="font-size:12px;opacity:0.9;text-transform:uppercase">Team Best Time Rate</div>
      <div class="big-number">${data.btPercent}%</div>
      <div style="opacity:0.9">${data.bestTimeCount} out of ${data.totalSwims} swims</div>
    </div>
  </div>
`;

// Section: Time Drops
export const generateTimeDropsHTML = (data, config) => {
  const limit = config?.limit || 5;
  const drops = data.topTimeDrops?.slice(0, limit) || [];
  
  if (drops.length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">🔥 Biggest Time Drops</div>
    <div class="section-content">
      ${drops.map((drop, idx) => `
        <div class="item">
          <div>
            <span class="rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">${idx + 1}</span>
            <span class="name">${drop.swimmer.name}</span>
            <span class="event">- ${drop.event}</span>
          </div>
          <span class="drop">-${drop.drop.toFixed(2)}s</span>
        </div>
        <div class="details">${drop.oldTime} → ${drop.newTime}</div>
      `).join('')}
    </div>
  </div>
  `;
};

// Section: Percent Drops
export const generatePercentDropsHTML = (data, config) => {
  const limit = config?.limit || 5;
  const drops = data.topPercentDrops?.slice(0, limit) || [];
  
  if (drops.length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">📊 Biggest Percentage Drops</div>
    <div class="section-content">
      ${drops.map((drop, idx) => `
        <div class="item">
          <div>
            <span class="rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">${idx + 1}</span>
            <span class="name">${drop.swimmer.name}</span>
            <span class="event">- ${drop.event}</span>
          </div>
          <span class="drop">${drop.dropPercent.toFixed(1)}%</span>
        </div>
      `).join('')}
    </div>
  </div>
  `;
};

// Section: New Standards
export const generateNewStandardsHTML = (data, config) => {
  const groupByLevel = config?.groupByLevel ?? true;
  const showTimes = config?.showTimes ?? true;
  
  if (!data.newStandards || data.newStandards.length === 0) return '';
  
  if (groupByLevel) {
    return `
    <div class="section">
      <div class="section-header">🏆 New Time Standards Achieved</div>
      <div class="section-content">
        ${['AAAA', 'AAA', 'AA', 'A', 'BB', 'B'].filter(level => data.standardsByLevel?.[level]?.length > 0).map(level => `
          <div class="standard-group">
            <div style="margin-bottom:8px">
              <span class="badge badge-${level}">${level}</span>
              <span style="color:#64748b;font-size:14px">${data.standardsByLevel[level].length} achieved</span>
            </div>
            ${data.standardsByLevel[level].map(ns => `
              <div class="standard-item">
                <div>
                  <strong>${ns.swimmer.name}</strong>
                  <span style="color:#64748b">- ${ns.event}</span>
                </div>
                ${showTimes ? `<span style="font-family:monospace">${ns.time}</span>` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
    `;
  } else {
    return `
    <div class="section">
      <div class="section-header">🏆 New Time Standards Achieved</div>
      <div class="section-content">
        ${data.newStandards.map(ns => {
          const level = ns.standard.split(' ').pop();
          return `
            <div class="standard-item">
              <div>
                <strong>${ns.swimmer.name}</strong>
                <span style="color:#64748b">- ${ns.event}</span>
                <span class="badge badge-${level}">${level}</span>
              </div>
              ${showTimes ? `<span style="font-family:monospace">${ns.time}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
    `;
  }
};

// Section: Meet Cuts
export const generateMeetCutsHTML = (data, config) => {
  const groupByMeet = config?.groupByMeet ?? true;
  
  if (!data.meetCutsByMeet || Object.keys(data.meetCutsByMeet).length === 0) return '';
  
  if (groupByMeet) {
    return `
    <div class="section">
      <div class="section-header">🎯 New Meet Cuts</div>
      <div class="section-content">
        ${Object.entries(data.meetCutsByMeet).map(([meetName, cuts]) => {
          const cutsBySwimmer = {};
          cuts.forEach(cut => {
            const swimmerId = cut.swimmer.id;
            if (!cutsBySwimmer[swimmerId]) {
              cutsBySwimmer[swimmerId] = {
                name: cut.swimmer.name,
                events: []
              };
            }
            cutsBySwimmer[swimmerId].events.push(abbreviateEvent(cut.event));
          });
          
          const swimmersList = Object.values(cutsBySwimmer).sort((a, b) => a.name.localeCompare(b.name));
          
          return `
            <div style="margin-bottom: 24px;">
              <div style="font-weight: 700; font-size: 16px; margin-bottom: 12px; text-decoration: underline;">
                ${meetName}
              </div>
              ${swimmersList.map(s => `
                <div class="standard-item">
                  <strong>${s.name}:</strong> ${s.events.join(' ')}
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    </div>
    `;
  } else {
    return `
    <div class="section">
      <div class="section-header">🎯 New Meet Cuts</div>
      <div class="section-content">
        ${data.newMeetCuts.map(cut => `
          <div class="standard-item">
            <div>
              <strong>${cut.swimmer.name}</strong>
              <span style="color:#64748b">- ${cut.event}</span>
              <span style="color:#3b82f6;font-size:12px">(${cut.meetName})</span>
            </div>
            <span style="font-family:monospace;color:#3b82f6">${cut.time}</span>
          </div>
        `).join('')}
      </div>
    </div>
    `;
  }
};

// Section: Stroke Performance
export const generateStrokePerformanceHTML = (data, config) => {
  const showTable = config?.showTable ?? true;
  
  if (!data.strokeStats || Object.keys(data.strokeStats).length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">🏊 Performance by Stroke</div>
    <div class="section-content">
      ${showTable ? `
        <table>
          <thead>
            <tr>
              <th>Stroke</th>
              <th>Swims</th>
              <th>Best Time %</th>
              <th>Avg Drop</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(data.strokeStats).map(([stroke, stats]) => `
              <tr>
                <td><strong>${stroke}</strong></td>
                <td>${stats.swims}</td>
                <td>${stats.btPercent}%</td>
                <td>${stats.avgDrop > 0 ? '-' + stats.avgDrop.toFixed(2) + 's' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  </div>
  `;
};

// Section: Group Performance
export const generateGroupPerformanceHTML = (data, config) => {
  if (!data.groupStats || data.groupStats.length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">👥 Performance by Group</div>
    <div class="section-content">
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>Swimmers</th>
            <th>Swims</th>
            <th>Best Time %</th>
          </tr>
        </thead>
        <tbody>
          ${data.groupStats.map(group => `
            <tr>
              <td><strong>${group.name}</strong></td>
              <td>${group.swimmerCount}</td>
              <td>${group.swims}</td>
              <td>${group.btPercent}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
  `;
};

// Section: Biggest Movers
export const generateBiggestMoversHTML = (data, config) => {
  const limit = config?.limit || 10;
  const movers = data.biggestMovers?.slice(0, limit) || [];
  
  if (movers.length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">🔥 Biggest Movers (Total Time Dropped)</div>
    <div class="section-content">
      ${movers.map((mover, idx) => `
        <div class="item">
          <div>
            <span class="rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">${idx + 1}</span>
            <span class="name">${mover.swimmer.name}</span>
          </div>
          <span class="drop">-${mover.totalDrop.toFixed(2)}s</span>
        </div>
        <div class="details">${mover.bestTimes} BT • Best: ${mover.biggestDropEvent} (-${mover.biggestDrop.toFixed(2)}s)</div>
      `).join('')}
    </div>
  </div>
  `;
};

// Section: Team Records Broken
export const generateRecordsBrokenHTML = (data, config) => {
  const records = data.recordsBroken || [];
  
  if (records.length === 0) return '';
  
  return `
  <div class="section">
    <div class="section-header">🏆 Team Records Broken</div>
    <div class="section-content">
      ${records.map((record, idx) => `
        <div class="item" style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 2px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
          <div>
            <span class="name">${record.swimmer_name}</span>
            <span class="event">- ${abbreviateEvent(record.event)}</span>
          </div>
          <div style="text-align: right;">
            <div style="font-family: monospace; font-weight: 700; color: #d97706; font-size: 16px;">${record.time_display}</div>
            ${record.previous_time_display ? `<div style="font-size: 11px; color: #64748b;">Old: ${record.previous_time_display}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  `;
};

// Section: Big Movers Report Full PDF
export const generateBigMoversReportHTML = (data, config = {}) => {
  const { leaderboard = [], activeView = 'total', filters = {}, stats = {}, groupComparisons = [] } = data;
  const top10 = leaderboard.slice(0, 10);
  
  const getViewLabel = () => {
    switch (activeView) {
      case 'total': return 'Total Time Dropped';
      case 'percentage': return 'Percentage Improvement';
      case 'besttimes': return 'Most Best Times';
      case 'standards': return 'Standards Achieved';
      default: return 'Total Time Dropped';
    }
  };

  const getValue = (swimmer) => {
    switch (activeView) {
      case 'total': return `${swimmer.totalDrop.toFixed(2)}s`;
      case 'percentage': return `${swimmer.avgPercentDrop.toFixed(1)}%`;
      case 'besttimes': return swimmer.bestTimesCount;
      case 'standards': return swimmer.newStandardsCount;
      default: return swimmer.totalDrop.toFixed(2);
    }
  };

  const filtersHTML = `
    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      ${filters.timePeriod ? `<div style="font-size: 11px;"><strong>Period:</strong> ${filters.timePeriod}</div>` : ''}
      ${filters.gender && filters.gender !== 'all' ? `<div style="font-size: 11px;"><strong>Gender:</strong> ${filters.gender === 'M' ? 'Boys' : 'Girls'}</div>` : ''}
      ${filters.ageGroup && filters.ageGroup !== 'all' ? `<div style="font-size: 11px;"><strong>Age:</strong> ${filters.ageGroup}</div>` : ''}
      ${filters.trainingGroup && filters.trainingGroup !== 'all' ? `<div style="font-size: 11px;"><strong>Group:</strong> ${filters.trainingGroup}</div>` : ''}
      ${filters.strokeFilter && filters.strokeFilter !== 'all' ? `<div style="font-size: 11px;"><strong>Stroke:</strong> ${filters.strokeFilter}</div>` : ''}
    </div>
  `;

  const statsHTML = stats ? `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">${stats.totalDropped?.toFixed(1) || 0}s</div>
        <div style="font-size: 10px; text-transform: uppercase; opacity: 0.9;">Total Dropped</div>
      </div>
      <div style="background: #f0f9ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 4px;">${stats.avgDrop?.toFixed(2) || 0}s</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #2563eb;">Avg Drop</div>
      </div>
      <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #9333ea; margin-bottom: 4px;">${stats.totalBestTimes || 0}</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #9333ea;">Best Times</div>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #d97706; margin-bottom: 4px;">${stats.totalNewStandards || 0}</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #d97706;">New Standards</div>
      </div>
      <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #ea580c; margin-bottom: 4px;">${stats.biggestSingleDrop?.toFixed(2) || 0}s</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #ea580c;">Biggest Drop</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold; color: #475569; margin-bottom: 4px;">${stats.swimmers || 0}</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #64748b;">Swimmers</div>
      </div>
    </div>
  ` : '';

  const groupComparisonHTML = groupComparisons && groupComparisons.length > 0 ? `
    <div style="page-break-before: always; margin-top: 24px;">
      <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #06b6d4;">
        📊 Training Group Comparison
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
        ${groupComparisons.map((comp, idx) => `
          <div style="padding: 12px; border-radius: 8px; border: 2px solid ${idx === 0 ? '#10b981' : '#e2e8f0'}; background: ${idx === 0 ? '#f0fdf4' : 'white'};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
              <div>
                <div style="font-weight: bold; color: #1e293b; font-size: 13px;">${comp.group}</div>
                <div style="font-size: 10px; color: #64748b;">${comp.count} swimmer${comp.count !== 1 ? 's' : ''}</div>
              </div>
              ${idx === 0 ? '<div style="background: #10b981; color: white; padding: 2px 6px; border-radius: 12px; font-size: 9px; font-weight: bold;">TOP</div>' : ''}
            </div>
            <div style="display: grid; gap: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Avg Drop:</span>
                <span style="font-weight: bold; color: #10b981;">${comp.avgTotalDrop.toFixed(2)}s</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Avg %:</span>
                <span style="font-weight: bold; color: #2563eb;">${comp.avgPercentDrop.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Best Times:</span>
                <span style="font-weight: bold; color: #9333ea;">${comp.totalBestTimes}</span>
              </div>
              <div style="display: flex; justify-between;">
                <span style="color: #64748b;">Standards:</span>
                <span style="font-weight: bold; color: #d97706;">${comp.totalNewStandards}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const podiumHTML = top10.length >= 3 ? `
    <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f8fafc, #e0f2fe); border-radius: 12px; border: 1px solid #cbd5e1;">
      <div style="text-align: center; font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 20px;">
        🏆 Top 3 Performers
      </div>
      <div style="display: flex; justify-content: center; align-items: flex-end; gap: 16px;">
        <!-- 2nd Place -->
        ${top10[1] ? `
          <div style="flex: 1; max-width: 150px;">
            <div style="background: white; border: 2px solid #94a3b8; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 8px;">
              <div style="width: 48px; height: 48px; margin: 0 auto 8px; border-radius: 50%; background: linear-gradient(135deg, #cbd5e1, #94a3b8); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                ${top10[1].name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #1e293b; margin-bottom: 2px;">${top10[1].name}</div>
              <div style="font-size: 9px; color: #64748b; margin-bottom: 8px;">${top10[1].age} yrs • ${top10[1].group || 'N/A'}</div>
              <div style="font-size: 20px; font-weight: bold; color: #64748b;">${getValue(top10[1])}</div>
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                ${top10[1].eventsImproved} events • ${top10[1].bestTimesCount} best
              </div>
            </div>
            <div style="height: 80px; background: linear-gradient(135deg, #cbd5e1, #94a3b8); border-radius: 8px 8px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px;">
              <div style="width: 36px; height: 36px; background: #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; border: 3px solid white;">2</div>
            </div>
          </div>
        ` : ''}
        
        <!-- 1st Place -->
        ${top10[0] ? `
          <div style="flex: 1; max-width: 150px;">
            <div style="background: white; border: 2px solid #fbbf24; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 8px; transform: scale(1.1);">
              <div style="width: 48px; height: 48px; margin: 0 auto 8px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                ${top10[0].name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #1e293b; margin-bottom: 2px;">${top10[0].name}</div>
              <div style="font-size: 9px; color: #64748b; margin-bottom: 8px;">${top10[0].age} yrs • ${top10[0].group || 'N/A'}</div>
              <div style="font-size: 24px; font-weight: bold; color: #d97706;">${getValue(top10[0])}</div>
              <div style="font-size: 9px; color: #d97706; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid #fef3c7;">
                ${top10[0].eventsImproved} events • ${top10[0].bestTimesCount} best
              </div>
            </div>
            <div style="height: 100px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 8px 8px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px;">
              <div style="width: 40px; height: 40px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; border: 4px solid white;">1</div>
            </div>
          </div>
        ` : ''}
        
        <!-- 3rd Place -->
        ${top10[2] ? `
          <div style="flex: 1; max-width: 150px;">
            <div style="background: white; border: 2px solid #d97706; border-radius: 12px; padding: 12px; text-align: center; margin-bottom: 8px;">
              <div style="width: 48px; height: 48px; margin: 0 auto 8px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
                ${top10[2].name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #1e293b; margin-bottom: 2px;">${top10[2].name}</div>
              <div style="font-size: 9px; color: #64748b; margin-bottom: 8px;">${top10[2].age} yrs • ${top10[2].group || 'N/A'}</div>
              <div style="font-size: 20px; font-weight: bold; color: #b45309;">${getValue(top10[2])}</div>
              <div style="font-size: 9px; color: #b45309; text-transform: uppercase; margin-top: 8px; padding-top: 8px; border-top: 1px solid #fef3c7;">
                ${top10[2].eventsImproved} events • ${top10[2].bestTimesCount} best
              </div>
            </div>
            <div style="height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 8px 8px 0 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px;">
              <div style="width: 32px; height: 32px; background: #d97706; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; border: 3px solid white;">3</div>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const leaderboardHTML = top10.length > 0 ? `
    <div style="margin-top: 24px;">
      <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #10b981;">
        📋 Top ${Math.min(10, top10.length)} - ${getViewLabel()}
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        ${top10.map((swimmer, idx) => `
          <div style="padding: 12px; border-bottom: 1px solid #f1f5f9; ${idx % 2 === 0 ? 'background: #fafafa;' : 'background: white;'}">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="width: 24px; text-align: center; font-weight: bold; color: #94a3b8; font-size: 12px;">${idx + 1}</div>
              <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
                ${swimmer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: bold; color: #1e293b; font-size: 13px;">${swimmer.name}</div>
                <div style="font-size: 10px; color: #64748b;">${swimmer.age} yrs • ${swimmer.gender === 'M' ? 'Male' : 'Female'} • ${swimmer.group || 'Unassigned'}</div>
              </div>
              <div style="display: flex; gap: 16px; font-size: 11px;">
                <div style="text-align: center;">
                  <div style="font-weight: bold; color: #10b981;">${swimmer.totalDrop.toFixed(2)}s</div>
                  <div style="font-size: 9px; color: #94a3b8;">Total</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: bold; color: #2563eb;">${swimmer.avgPercentDrop.toFixed(1)}%</div>
                  <div style="font-size: 9px; color: #94a3b8;">Avg %</div>
                </div>
                <div style="text-align: center;">
                  <div style="font-weight: bold; color: #9333ea;">${swimmer.bestTimesCount}</div>
                  <div style="font-size: 9px; color: #94a3b8;">Best</div>
                </div>
                ${swimmer.newStandardsCount > 0 ? `
                  <div style="text-align: center;">
                    <div style="font-weight: bold; color: #d97706;">${swimmer.newStandardsCount}</div>
                    <div style="font-size: 9px; color: #94a3b8;">Stds</div>
                  </div>
                ` : ''}
              </div>
              <div style="font-size: 20px; font-weight: bold; color: #1e293b; min-width: 80px; text-align: right;">${getValue(swimmer)}</div>
            </div>
            ${swimmer.bestSingleDrop > 0 ? `
              <div style="margin-left: 68px; padding: 6px 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong style="color: #10b981;">Best Drop:</strong> ${swimmer.bestSingleDropEvent}</span>
                  <span style="font-weight: bold; color: #10b981;">${swimmer.bestSingleDrop.toFixed(2)}s</span>
                </div>
              </div>
            ` : ''}
            ${swimmer.improvements.length > 0 ? `
              <div style="margin-left: 68px; margin-top: 6px;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Event Improvements (Top 3)</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 4px;">
                  ${swimmer.improvements.slice(0, 3).map(imp => `
                    <div style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; font-size: 9px; display: flex; justify-content: space-between;">
                      <span style="color: #475569;">${imp.event}: ${imp.oldTime} → ${imp.newTime}</span>
                      <span style="color: #10b981; font-weight: bold;">-${imp.drop.toFixed(2)}s</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            ${swimmer.standardsAchieved && swimmer.standardsAchieved.length > 0 ? `
              <div style="margin-left: 68px; margin-top: 6px;">
                <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">⭐ New Standards</div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${swimmer.standardsAchieved.map(std => `
                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 3px 6px; border-radius: 4px; font-size: 9px;">
                      <strong style="color: #d97706;">${std.level}</strong> ${std.event} <span style="color: #94a3b8;">${std.time}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #10b981;">
        <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #0f172a; font-weight: bold;">
          📈 Big Movers Report
        </h1>
        <p style="margin: 0; color: #64748b; font-size: 13px;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      ${filtersHTML}
      ${statsHTML}
      ${podiumHTML}
      ${leaderboardHTML}
      ${groupComparisonHTML}
    </div>
  `;
};

// Mapping of section IDs to HTML generators
export const SECTION_HTML_GENERATORS = {
  'overview-stats': generateOverviewStatsHTML,
  'bt-percentage': generateBTPercentageHTML,
  'time-drops': generateTimeDropsHTML,
  'percent-drops': generatePercentDropsHTML,
  'new-standards': generateNewStandardsHTML,
  'meet-cuts': generateMeetCutsHTML,
  'records-broken': generateRecordsBrokenHTML,
  'stroke-performance': generateStrokePerformanceHTML,
  'group-performance': generateGroupPerformanceHTML,
  'biggest-movers': generateBiggestMoversHTML,
  'big-movers-full': generateBigMoversReportHTML,
};

