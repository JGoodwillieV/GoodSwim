# Category Progress - Visual Guide

## What You'll See

### 1. Dashboard Widget

**Location**: Dashboard, above "Practice Test Sets"

```
┌────────────────────────────────────────────────┐
│ 🌊 Category Progress        [View Report]     │
│    Stroke improvement over time                │
├────────────────────────────────────────────────┤
│                                                │
│  Line Chart showing recent trends (30 days)   │
│  ───────────────────────────────────────────  │
│    Blue line (Freestyle)                      │
│    Purple line (Backstroke)                   │
│    Green line (Breaststroke)                  │
│    Amber line (Butterfly)                     │
│    Pink line (IM)                             │
│                                                │
├────────────────────────────────────────────────┤
│  Free    Back    Breast    Fly       IM       │
│  ↓2.5%   ↓1.8%   ↑0.3%    ↓3.2%    ↓1.5%    │
└────────────────────────────────────────────────┘
```

**Features**:
- Compact view of recent data
- One-click to full report
- Quick improvement indicators
- Shows trends at a glance

---

### 2. Reports Menu Card

**Location**: Reports section (8th card)

```
┌──────────────────────────────┐
│ 🌊                           │
│                              │
│ Category Progress            │
│                              │
│ Track stroke improvement     │
│ over the season with         │
│ line graphs.                 │
└──────────────────────────────┘
```

**Color**: Cyan/Blue
**Icon**: Activity (wave chart)

---

### 3. Full Report - Header

```
┌─────────────────────────────────────────────────┐
│ ← Category Progress Report                      │
│   Track improvement across stroke categories    │
│                                                  │
│  [✓ Pace per 100] ⓘ Normalized to compare      │
│                      different distances         │
└─────────────────────────────────────────────────┘
```

**Controls**:
- Back button (returns to Dashboard or Reports)
- Toggle: "Pace per 100" vs "Raw Average"
- Info tooltip explaining the mode

---

### 4. Full Report - Summary Cards

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ FREE     │  │ BACK     │  │ BREAST   │  ... (5)   │
│  │    15    │  │    12    │  │     8    │            │
│  │ sessions │  │ sessions │  │ sessions │            │
│  │ ↓ 2.5%   │  │ ↓ 1.8%   │  │ ↑ 0.3%   │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

**Color Coding**:
- Free: Blue background
- Back: Purple background
- Breast: Green background
- Fly: Amber background
- IM: Pink background

**Info Displayed**:
- Number of sessions recorded
- Improvement percentage
- Trend indicator (↓ improving, ↑ regressing)

---

### 5. Full Report - Main Chart

```
┌─────────────────────────────────────────────────┐
│ Progress Over Time                              │
│ Lower is better • Pace per 100 yards            │
├─────────────────────────────────────────────────┤
│                                                  │
│ 60s ─┐                                          │
│      │                                          │
│ 55s ─┤     ╱──╲                                │
│      │    ╱    ╲   ╭───╮                       │
│ 50s ─┤ ──╱      ╲─╯    ╰──                    │
│      │                    ╲                     │
│ 45s ─┤                     ╰──╮                │
│      │                         ╰──             │
│ 40s ─┴──────────────────────────────           │
│      Jan  Feb  Mar  Apr  May  Jun              │
│                                                  │
│  ── Free  ── Back  ── Breast  ── Fly  ── IM   │
└─────────────────────────────────────────────────┘
```

**Interactive Features**:
- Hover over points to see details
- Click legend to show/hide strokes
- Responsive to screen size
- Smooth animations

---

### 6. Full Report - Hover Tooltip

```
When you hover over a data point:

┌──────────────────────────┐
│ Mar 15                   │
│ ─────────────────────    │
│ 🔵 Freestyle             │
│    45.23s per 100        │
│    100yd × 5 • 12 swimmers│
│                          │
│ 🟣 Backstroke            │
│    52.18s per 100        │
│    50yd × 8 • 10 swimmers│
└──────────────────────────┘
```

**Information Shown**:
- Date of test set
- Stroke name
- Average pace
- Distance and reps
- Number of swimmers

---

### 7. Full Report - Expandable Stroke Section

```
┌─────────────────────────────────────────────────┐
│ ┌────┐                                          │
│ │ FR │ Freestyle               ↓ 2.5%  ▼       │
│ └────┘ 15 sessions recorded   improvement      │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 50 Free Sprint                            │ │
│  │ Mar 15 • 50yd × 6 • 12 swimmers          │ │
│  │                        1:03.45   63.45/100│ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 100 Free Test Set                         │ │
│  │ Mar 22 • 100yd × 4 • 14 swimmers         │ │
│  │                        1:05.12   65.12/100│ │
│  └───────────────────────────────────────────┘ │
│                                                  │
│  ... (more test sets)                           │
└─────────────────────────────────────────────────┘
```

**Click any stroke card to expand/collapse details**

Shows:
- Test set name
- Date, distance, reps
- Number of swimmers
- Average time
- Pace per 100

---

### 8. Empty State (No Data)

**Dashboard Widget**:
```
┌────────────────────────────────────┐
│ 🌊 Category Progress               │
│    Stroke improvement over time    │
├────────────────────────────────────┤
│                                    │
│         🌊                         │
│                                    │
│   No category data yet             │
│   Record test sets to track        │
│   stroke progress                  │
│                                    │
└────────────────────────────────────┘
```

**Full Report**:
```
┌────────────────────────────────────┐
│                                    │
│         🌊                         │
│                                    │
│   No Test Set Data Yet             │
│                                    │
│   Record test sets to see          │
│   category progress over time      │
│                                    │
└────────────────────────────────────┘
```

---

## Color Legend

### Stroke Colors (Consistent Throughout)

- **🔵 Freestyle**: Blue (#3b82f6)
  - Cards: bg-blue-100, text-blue-600
  - Chart line: Solid blue

- **🟣 Backstroke**: Purple (#8b5cf6)
  - Cards: bg-purple-100, text-purple-600
  - Chart line: Solid purple

- **🟢 Breaststroke**: Emerald (#10b981)
  - Cards: bg-emerald-100, text-emerald-600
  - Chart line: Solid green

- **🟡 Butterfly**: Amber (#f59e0b)
  - Cards: bg-amber-100, text-amber-600
  - Chart line: Solid amber

- **🔴 Individual Medley**: Pink (#ec4899)
  - Cards: bg-pink-100, text-pink-600
  - Chart line: Solid pink

### Improvement Indicators

- **↓ Green**: Improvement (times getting faster)
- **↑ Red**: Regression (times getting slower)
- **─ Gray**: No change

---

## Responsive Design

### Desktop View (Wide Screen)
```
┌──────────────────────────────────────────────────┐
│ [Summary Cards in Row: Free | Back | Breast ... ]│
│                                                   │
│ [       Large Chart (400px height)             ] │
│                                                   │
│ [Stroke Details - 3 columns]                     │
└──────────────────────────────────────────────────┘
```

### Tablet View (Medium Screen)
```
┌─────────────────────────────────┐
│ [Summary Cards: 2-3 per row]   │
│                                 │
│ [  Chart (300px height)      ] │
│                                 │
│ [Stroke Details - 2 columns]   │
└─────────────────────────────────┘
```

### Mobile View (Narrow Screen)
```
┌──────────────────────┐
│ [Cards: 2 per row]  │
│                      │
│ [Chart (240px)]     │
│                      │
│ [Details: 1 col]    │
└──────────────────────┘
```

---

## User Interactions

### Click Actions

1. **Dashboard Widget "View Report"**
   - Opens full Category Progress Report
   - Smooth transition

2. **Reports Menu Card**
   - Opens full Category Progress Report
   - Same view as from Dashboard

3. **Summary Cards (in full report)**
   - Click to expand stroke section
   - Shows all test sets for that stroke
   - Click again to collapse

4. **Toggle "Pace per 100"**
   - Switches chart between normalized and raw views
   - Updates all calculations instantly
   - Preserves user preference during session

5. **Back Button**
   - Returns to previous view
   - Dashboard if accessed from widget
   - Reports menu if accessed from Reports

### Hover Actions

1. **Chart Data Points**
   - Shows detailed tooltip
   - Displays date, pace, distance, swimmer count
   - Multiple strokes shown if on same date

2. **Cards and Buttons**
   - Subtle hover effects
   - Visual feedback (slight scaling, color change)

---

## Visual Hierarchy

### Information Priority

**1. Most Important** (Largest, Bold):
- Improvement percentages
- Number of sessions
- Chart lines

**2. Secondary** (Medium):
- Stroke names
- Dates
- Average times

**3. Supporting** (Small):
- Details (distance, reps, swimmer count)
- Tooltips
- Helper text

---

## Accessibility

### Visual Cues
- ✅ Color + Icons (not color alone)
- ✅ Clear labels
- ✅ Sufficient contrast ratios
- ✅ Large clickable areas

### Screen Reader Support
- ✅ Semantic HTML
- ✅ Descriptive text
- ✅ Proper heading structure

---

## Animation & Loading States

### Loading (While Fetching Data)
```
┌────────────────────────────────┐
│ ▓▓▓▓▓▓░░░░ (pulse animation)  │
│ ▓▓▓▓░░░░░░                     │
│ ▓▓▓▓▓▓▓▓░░                     │
└────────────────────────────────┘
```

### Transition (Opening Report)
- Smooth fade-in
- Chart animates from left to right
- Cards scale in with slight delay

### Hover Effects
- 0.2s transition
- Slight scale (1.05x)
- Shadow increase

---

## Tips for Best Visual Results

1. **Record Consistently**: More data points = smoother lines
2. **Similar Distances**: Easier to see trends visually
3. **Regular Intervals**: Weekly test sets show clear progression
4. **Complete Data**: Ensure all swimmers complete all reps

---

**Designed for**: Clarity, Ease of Use, and Professional Appearance

**Optimized for**: Quick insights at a glance + detailed analysis when needed

