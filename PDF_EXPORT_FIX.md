# PDF Export Dynamic Layout Fix

## Problem
The PDF export was not respecting custom layouts properly:
1. Only some sections were being included in PDFs
2. Sections were hardcoded with conditional rendering rather than dynamic generation
3. PDFs were missing sections that appeared in the dashboard view

## Solution
Completely refactored the PDF generation system to be truly dynamic:

### 1. Created Section HTML Generators (`src/reportPDFGenerators.js`)
- Extracted each section's HTML generation into a dedicated function
- All 9 section types now have individual HTML generators:
  - `generateOverviewStatsHTML()` - Stats cards
  - `generateBTPercentageHTML()` - Hero banner
  - `generateTimeDropsHTML()` - Top time drops with configurable limit
  - `generatePercentDropsHTML()` - Percentage improvements
  - `generateNewStandardsHTML()` - New standards (grouped or flat)
  - `generateMeetCutsHTML()` - Championship qualifications
  - `generateStrokePerformanceHTML()` - Performance by stroke
  - `generateGroupPerformanceHTML()` - Performance by group
  - `generateBiggestMoversHTML()` - Total time dropped leaders

- Each generator respects section configuration (limits, display options, etc.)

### 2. Updated Modern Format PDF Generator
**Before:** Hardcoded sections with `isSectionEnabled()` checks
```javascript
${isSectionEnabled('overview-stats') ? `...hardcoded HTML...` : ''}
${isSectionEnabled('time-drops') ? `...hardcoded HTML...` : ''}
```

**After:** Dynamic loop through enabled sections
```javascript
const sectionsHTML = enabledSections.map(section => {
  const generator = SECTION_HTML_GENERATORS[section.id];
  return generator(data, section.config || {});
}).filter(html => html).join('\n');
```

### 3. Updated Classic Format PDF Generator
- Maintains classic format's unique text-based style
- Still respects layout configuration
- Shows only enabled sections in the specified order

## Benefits

✅ **Complete Layout Respect:** PDFs now include ALL enabled sections from the layout  
✅ **Correct Order:** Sections appear in the order specified by the layout  
✅ **Configuration Support:** Section configs (limits, display options) are respected  
✅ **Maintainable:** Adding new sections only requires creating one generator function  
✅ **Consistent:** Dashboard view and PDF export now match perfectly

## Example Usage

**Scenario:** Coach creates layout with only these sections:
1. Overview Stats
2. BT Percentage
3. Top 10 Time Drops (instead of default 5)
4. New Standards
5. Biggest Movers (15 instead of default 10)

**Result:** 
- Dashboard shows exactly those 5 sections in that order
- PDF export shows exactly those 5 sections in that order
- Time Drops shows 10 swimmers (not 5)
- Biggest Movers shows 15 swimmers (not 10)

## Files Modified
- `src/MeetReportGenerator.jsx` - Updated both PDF generators
- `src/reportPDFGenerators.js` - New file with section HTML generators

## Testing Checklist
- [x] Modern format PDF includes all enabled sections
- [x] Classic format PDF includes all enabled sections
- [x] Section order matches layout configuration
- [x] Section configs (limits) are respected
- [x] No lint errors
- [ ] Build succeeds
- [ ] PDF exports correctly on live deployment

