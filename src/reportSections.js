// src/reportSections.js
// Registry of all available report sections with metadata

export const REPORT_SECTIONS = {
  // Overview Statistics
  'overview-stats': {
    id: 'overview-stats',
    name: 'Overview Statistics',
    category: 'overview',
    description: 'Total swims, best times, first times, new standards',
    icon: 'BarChart3',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern', 'classic']
  },
  
  // Performance Metrics
  'bt-percentage': {
    id: 'bt-percentage',
    name: 'Best Time Percentage',
    category: 'overview',
    description: 'Large hero display of team best time percentage',
    icon: 'Target',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern', 'classic']
  },
  
  // Time Drops
  'time-drops': {
    id: 'time-drops',
    name: 'Biggest Time Drops',
    category: 'performance',
    description: 'Top swimmers by absolute time improvement',
    icon: 'TrendingDown',
    defaultEnabled: true,
    configurable: true,
    config: {
      limit: { type: 'number', label: 'Number to show', default: 5, min: 3, max: 20 }
    },
    availableIn: ['modern', 'classic']
  },
  
  'percent-drops': {
    id: 'percent-drops',
    name: 'Biggest Percentage Drops',
    category: 'performance',
    description: 'Top swimmers by percentage improvement',
    icon: 'Percent',
    defaultEnabled: true,
    configurable: true,
    config: {
      limit: { type: 'number', label: 'Number to show', default: 5, min: 3, max: 20 }
    },
    availableIn: ['modern']
  },
  
  // Standards & Achievements
  'records-broken': {
    id: 'records-broken',
    name: 'Team Records Broken',
    category: 'achievements',
    description: 'Team records broken during this meet',
    icon: 'Trophy',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern', 'classic']
  },
  
  'new-standards': {
    id: 'new-standards',
    name: 'New Time Standards',
    category: 'achievements',
    description: 'Swimmers who achieved new motivational times',
    icon: 'Award',
    defaultEnabled: true,
    configurable: true,
    config: {
      groupByLevel: { type: 'boolean', label: 'Group by standard level', default: true },
      showTimes: { type: 'boolean', label: 'Show times achieved', default: true }
    },
    availableIn: ['modern', 'classic']
  },
  
  'meet-cuts': {
    id: 'meet-cuts',
    name: 'New Meet Cuts',
    category: 'achievements',
    description: 'Swimmers who qualified for championship meets',
    icon: 'Trophy',
    defaultEnabled: true,
    configurable: true,
    config: {
      groupByMeet: { type: 'boolean', label: 'Group by meet name', default: true }
    },
    availableIn: ['modern', 'classic']
  },
  
  'records-broken': {
    id: 'records-broken',
    name: 'Team Records Broken',
    category: 'achievements',
    description: 'Team records broken during this meet',
    icon: 'Star',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern', 'classic']
  },
  
  // Analysis
  'stroke-performance': {
    id: 'stroke-performance',
    name: 'Performance by Stroke',
    category: 'analysis',
    description: 'Best time rates and average drops by stroke',
    icon: 'Activity',
    defaultEnabled: true,
    configurable: true,
    config: {
      showChart: { type: 'boolean', label: 'Show chart', default: true },
      showTable: { type: 'boolean', label: 'Show table', default: true }
    },
    availableIn: ['modern', 'classic']
  },
  
  'group-performance': {
    id: 'group-performance',
    name: 'Performance by Group',
    category: 'analysis',
    description: 'Best time rates by training group',
    icon: 'Users',
    defaultEnabled: true,
    configurable: true,
    config: {
      showChart: { type: 'boolean', label: 'Show chart', default: true }
    },
    availableIn: ['modern']
  },
  
  // Leaderboards
  'biggest-movers': {
    id: 'biggest-movers',
    name: 'Biggest Movers',
    category: 'leaderboards',
    description: 'Swimmers with most total time dropped',
    icon: 'Flame',
    defaultEnabled: true,
    configurable: true,
    config: {
      limit: { type: 'number', label: 'Number to show', default: 10, min: 5, max: 20 }
    },
    availableIn: ['modern', 'classic']
  },
  
  'swimmer-performance': {
    id: 'swimmer-performance',
    name: 'Individual Swimmer Performance',
    category: 'detailed',
    description: 'Detailed breakdown by swimmer',
    icon: 'Users',
    defaultEnabled: false,
    configurable: true,
    config: {
      minBestTimes: { type: 'number', label: 'Min best times to show', default: 1, min: 0, max: 10 }
    },
    availableIn: ['modern']
  },
  
  // Charts
  'standards-chart': {
    id: 'standards-chart',
    name: 'Standards Distribution Chart',
    category: 'charts',
    description: 'Pie chart showing distribution of new standards',
    icon: 'PieChart',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern']
  },
  
  'stroke-chart': {
    id: 'stroke-chart',
    name: 'Stroke Performance Chart',
    category: 'charts',
    description: 'Bar chart of best time rates by stroke',
    icon: 'BarChart',
    defaultEnabled: true,
    configurable: false,
    availableIn: ['modern']
  }
};

// Get sections by category
export const getSectionsByCategory = () => {
  const categories = {
    overview: [],
    performance: [],
    achievements: [],
    analysis: [],
    leaderboards: [],
    detailed: [],
    charts: []
  };
  
  Object.values(REPORT_SECTIONS).forEach(section => {
    if (categories[section.category]) {
      categories[section.category].push(section);
    }
  });
  
  return categories;
};

// Get default layout
export const getDefaultLayout = (format = 'modern') => {
  return {
    name: 'Default Layout',
    sections: Object.values(REPORT_SECTIONS)
      .filter(s => s.defaultEnabled && s.availableIn.includes(format))
      .map((s, index) => ({
        id: s.id,
        type: s.category,
        enabled: true,
        order: index,
        config: s.configurable ? Object.keys(s.config || {}).reduce((acc, key) => {
          acc[key] = s.config[key].default;
          return acc;
        }, {}) : {}
      }))
      .sort((a, b) => a.order - b.order)
  };
};

// Validate layout config
export const validateLayout = (layout) => {
  if (!layout || !Array.isArray(layout.sections)) {
    return { valid: false, error: 'Invalid layout structure' };
  }
  
  const validSectionIds = Object.keys(REPORT_SECTIONS);
  const invalidSections = layout.sections.filter(s => !validSectionIds.includes(s.id));
  
  if (invalidSections.length > 0) {
    return { 
      valid: false, 
      error: `Invalid section IDs: ${invalidSections.map(s => s.id).join(', ')}` 
    };
  }
  
  return { valid: true };
};

