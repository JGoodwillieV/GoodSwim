// src/utils/timeStandardsHelper.js
// Shared utilities for fetching time standards from both the default
// `time_standards` table and custom standards from `team_standard_selections`
// + `time_standard_entries`.

import { supabase } from '../supabase';

const STANDARD_ORDER = [
  'Nationals', 'US JR', 'Winter JR', 'Futures', 'NCSA JR', 'Sectionals',
  'VSI SC', 'VSI AG', 'AAAA', 'AAA', 'AA', 'A', 'BB', 'B'
];

function sortDefaultNames(names) {
  return [...names].sort((a, b) => {
    const aIdx = STANDARD_ORDER.indexOf(a);
    const bIdx = STANDARD_ORDER.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

async function fetchDefaultStandardNames() {
  let allNames = [];
  let page = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data: batch, error } = await supabase
      .from('time_standards')
      .select('name')
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error || !batch || batch.length === 0) {
      keepFetching = false;
    } else {
      allNames = [...allNames, ...batch.map(d => d.name)];
      page++;
      if (batch.length < 1000) keepFetching = false;
    }
  }

  return [...new Set(allNames)];
}

async function fetchTeamSelections(teamId) {
  if (!teamId) return [];

  const { data: selections } = await supabase
    .from('team_standard_selections')
    .select('set_id, time_standard_sets(id, name)')
    .eq('team_id', teamId);

  return selections || [];
}

// Returns { defaultNames: string[], customOptions: Array<{value, label, setName}> }
// customOptions use the encoding `custom::<set_id>::<standard_name>` as the value.
export async function fetchCombinedStandardNames(teamId) {
  const [uniqueDefaults, selections] = await Promise.all([
    fetchDefaultStandardNames(),
    fetchTeamSelections(teamId),
  ]);

  const sortedDefaults = sortDefaultNames(uniqueDefaults);

  const customOptions = [];

  if (selections.length > 0) {
    const setIds = selections.map(s => s.set_id);

    const { data: entries } = await supabase
      .from('time_standard_entries')
      .select('set_id, standard_name')
      .in('set_id', setIds);

    if (entries) {
      const bySet = {};
      entries.forEach(e => {
        if (!bySet[e.set_id]) bySet[e.set_id] = new Set();
        bySet[e.set_id].add(e.standard_name);
      });

      selections.forEach(sel => {
        const setName = sel.time_standard_sets?.name || 'Custom Set';
        const names = bySet[sel.set_id];
        if (!names) return;
        [...names].sort().forEach(stdName => {
          customOptions.push({
            value: `custom::${sel.set_id}::${stdName}`,
            label: `${setName} — ${stdName}`,
            setName,
          });
        });
      });
    }
  }

  return { defaultNames: sortedDefaults, customOptions };
}

// Fetch standards for a selected dropdown value + course.
// Returns rows normalized to the `time_standards` shape (with `name` field).
export async function fetchStandardsBySelection(selectedValue, course) {
  if (selectedValue.startsWith('custom::')) {
    const parts = selectedValue.split('::');
    const setId = parts[1];
    const standardName = parts.slice(2).join('::');

    const { data } = await supabase
      .from('time_standard_entries')
      .select('*, time_standard_sets!inner(name)')
      .eq('set_id', setId)
      .eq('standard_name', standardName)
      .eq('course', course);

    return (data || []).map(entry => ({
      ...entry,
      name: entry.standard_name,
      _source: 'custom',
      _setName: entry.time_standard_sets?.name,
    }));
  }

  const { data } = await supabase
    .from('time_standards')
    .select('*')
    .eq('name', selectedValue)
    .eq('course', course);

  return (data || []).map(entry => ({ ...entry, _source: 'default' }));
}

// Fetch ALL standards from both tables (for reports that analyze everything).
// Custom entries are normalized to have a `name` field matching `standard_name`.
export async function fetchAllCombinedStandards(teamId) {
  const { data: defaults } = await supabase.from('time_standards').select('*');

  let allStandards = (defaults || []).map(s => ({ ...s, _source: 'default' }));

  if (teamId) {
    const selections = await fetchTeamSelections(teamId);

    if (selections.length > 0) {
      const setIds = selections.map(s => s.set_id);

      const { data: customEntries } = await supabase
        .from('time_standard_entries')
        .select('*, time_standard_sets!inner(name)')
        .in('set_id', setIds);

      if (customEntries) {
        const normalized = customEntries.map(entry => ({
          ...entry,
          name: entry.standard_name,
          _source: 'custom',
          _setName: entry.time_standard_sets?.name,
        }));
        allStandards = [...allStandards, ...normalized];
      }
    }
  }

  return allStandards;
}
