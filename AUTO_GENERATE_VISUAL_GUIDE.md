# Auto-Generate Events - Visual Guide

## 🎨 User Interface Walkthrough

### Main Modal Layout

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✨ Auto-Generate Event Entries                           [X] ┃
┃     AI-powered event recommendations                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                 ┃
┃  🎯 Configuration                                              ┃
┃                                                                 ┃
┃  Quick Presets:                                                ┃
┃  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐┃
┃  │ Championship │ │  Dual Meet   │ │   B/C Meet   │ │Qualifying│┃
┃  │   🏆 Best 3  │ │ 📊 Balanced  │ │  🌱 Try 5    │ │ 🎯 Cuts  │┃
┃  │    events    │ │   4 events   │ │    events    │ │  2-3     │┃
┃  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘┃
┃                                                                 ┃
┃  Recommendation Mode:                                          ┃
┃  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         ┃
┃  │  Championship│ │   Balanced   │ │ Developmental│ (Selected)┃
┃  │  🏆 Best     │ │  📊 Mix      │ │  ⚡ New      │         ┃
┃  │    only      │ │  approach    │ │  events      │         ┃
┃  └──────────────┘ └──────────────┘ └──────────────┘         ┃
┃                                                                 ┃
┃  Max Events per Swimmer:                                       ┃
┃  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ] ← Click to select                 ┃
┃                                                                 ┃
┃  ☑ Focus on Standards Chasers                                 ┃
┃  Prioritize events close to achieving next standard           ┃
┃                                                                 ┃
┃  ─────────────────────────────────────────────────────────── ┃
┃                                                                 ┃
┃  Select Swimmers:              [Group] [Individual] ← Toggle   ┃
┃  🔍 [Search swimmers...]                    [Select All]      ┃
┃                                                                 ┃
┃  ┌─────────────────────────────────────────────────────────┐ ┃
┃  │ ☑ John Smith        14 years • M • Senior Group        │ ┃
┃  │ ☑ Jane Doe          12 years • F • Age Group           │ ┃
┃  │ ☐ Mike Johnson      15 years • M • Senior Group        │ ┃
┃  │ ☑ Sarah Williams    13 years • F • Age Group           │ ┃
┃  └─────────────────────────────────────────────────────────┘ ┃
┃                                                                 ┃
┃  3 swimmers selected                                           ┃
┃                                                                 ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  3 swimmers selected              [Cancel] [✨ Generate]       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### After Generation - Recommendations Display

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✨ Auto-Generate Event Entries                           [X] ┃
┃     AI-powered event recommendations                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                 ┃
┃  ✅ Recommendations Generated                                  ┃
┃  Generated 9 event entries for 3 swimmers.                     ┃
┃  Review below and click "Apply" to add them to the meet.       ┃
┃                                                                 ┃
┃  ┌─────────────────────────────────────────────────────────┐ ┃
┃  │ John Smith                              3                │ ┃
┃  │ 14 years • M • Senior Group           events             │ ┃
┃  ├─────────────────────────────────────────────────────────┤ ┃
┃  │                                                           │ ┃
┃  │ Event #12: 100 Freestyle                      Score: 87  │ ┃
┃  │ Seed Time: 52.34                                          │ ┃
┃  │ [Performance: 35/40] [Opportunity: 25/30] [Strategic: 17/20]│ ┃
┃  │ 📈 Improved 4.2% in last 90 days                        │ ┃
┃  │ 🎯 0.8s from AA standard                                │ ┃
┃  │ 🏆 Signature event (top 3)                              │ ┃
┃  │ Difficulty: 2.0/5                                         │ ┃
┃  │                                                           │ ┃
┃  │ Event #18: 50 Freestyle                       Score: 82  │ ┃
┃  │ Seed Time: 23.45                                          │ ┃
┃  │ [Performance: 30/40] [Opportunity: 28/30] [Strategic: 14/20]│ ┃
┃  │ 📈 Improved 2.8% in last 90 days                        │ ┃
┃  │ 🎯 1.2s from AAA standard                               │ ┃
┃  │ 🏆 Signature event (top 3)                              │ ┃
┃  │ Difficulty: 1.8/5                                         │ ┃
┃  │                                                           │ ┃
┃  │ Event #24: 200 Freestyle                      Score: 75  │ ┃
┃  │ Seed Time: 1:58.23                                        │ ┃
┃  │ [Performance: 28/40] [Opportunity: 20/30] [Strategic: 17/20]│ ┃
┃  │ 📈 Improved 1.8% in last 90 days                        │ ┃
┃  │ 🎯 2.5s from A standard                                 │ ┃
┃  │ ⚠️ May be close to another event                       │ ┃
┃  │ Difficulty: 3.0/5                                         │ ┃
┃  └─────────────────────────────────────────────────────────┘ ┃
┃                                                                 ┃
┃  [... more swimmers ...]                                       ┃
┃                                                                 ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ✅ 9 entries ready               [Back] [✅ Apply Recommendations]┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## 🎯 Scoring Visualization

### Score Breakdown Components

```
┌─────────────────────────────────────────────────────┐
│  Total Score: 87/100                        ⭐⭐⭐  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Performance: 35/40]  ← Recent improvement + level│
│    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  87.5%                    │
│                                                     │
│  [Opportunity: 25/30]  ← Standards/records close   │
│    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  83.3%                    │
│                                                     │
│  [Strategic: 17/20]    ← Event pairing & fit       │
│    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  85.0%                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Score Quality Indicators

```
90-100: ⭐⭐⭐ Excellent  (Green)
70-89:  ⭐⭐  Good       (Blue)
50-69:  ⭐   Decent     (Amber)
30-49:       Marginal   (Gray)
<30:         Weak       (Red)
```

## 🔍 Icon Legend

```
📈 TrendingUp    = Recent improvement indicator
🎯 Target        = Standards proximity / opportunity
🏆 Award         = Signature event / achievement
⚠️ AlertCircle   = Warning (spacing, conflicts)
✨ Sparkles      = AI-powered feature
✅ Check         = Completed / ready
🔄 Loader        = Processing
```

## 📊 Meet Type Preset Cards

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Championship   │  │   Dual Meet     │  │    B/C Meet     │
│      🏆        │  │       📊        │  │       🌱       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ Best 3 events   │  │ Balanced        │  │ Try 5 events    │
│ Standards focus │  │ 4 events        │  │ Experimentation │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     (Amber)              (Blue)              (Green)

┌─────────────────┐
│ Qualifying Meet │
│       🎯       │
├─────────────────┤
│ Cuts only       │
│ 2-3 events      │
└─────────────────┘
    (Purple)
```

## 🎨 Color Scheme

### Score Pills
```
High Score (75%+):   Green background (#dcfce7) + Green text (#15803d)
Good Score (50-75%): Blue background (#dbeafe) + Blue text (#1e40af)
Medium (25-50%):     Amber background (#fef3c7) + Amber text (#b45309)
Low Score (<25%):    Gray background (#f1f5f9) + Gray text (#475569)
```

### Alert Types
```
Success:  Green (#10b981) ✅
Warning:  Amber (#f59e0b) ⚠️
Error:    Red (#ef4444) ❌
Info:     Blue (#3b82f6) ℹ️
```

### Buttons
```
Primary:     Gradient Purple-to-Blue (#9333ea → #2563eb)
Secondary:   White with Blue text
Danger:      Red (#dc2626)
Success:     Green (#16a34a)
```

## 📱 Responsive Design

### Desktop View (Wide)
```
┌─────────────────────────────────────┐
│  Configuration & Selection          │
│  Side-by-side layout               │
│  Full details visible               │
└─────────────────────────────────────┘
```

### Mobile View (Narrow)
```
┌───────────────┐
│ Configuration │
├───────────────┤
│   Selection   │
├───────────────┤
│ Recommendations│
└───────────────┘
Stacked vertically
Scrollable sections
```

## 🎬 Animation Flow

### Generation Process
```
1. User clicks "Generate" ✨
   ↓
2. Button shows spinner 🔄
   ↓
3. Progress indicator (optional)
   ↓
4. Results fade in with slide effect
   ↓
5. Success checkmark ✅
```

### Interaction States
```
Button States:
- Default:    Solid with hover shadow
- Hover:      Slightly darker + lift
- Active:     Pressed down effect
- Disabled:   50% opacity + no pointer
- Loading:    Spinner animation
```

## 📐 Layout Specifications

### Modal Dimensions
```
Max Width:  6xl (72rem / 1152px)
Max Height: 90vh
Overflow:   Scroll within content area
Padding:    6 (1.5rem / 24px)
Rounded:    2xl (1rem / 16px)
```

### Section Spacing
```
Between sections:   6 (1.5rem)
Between elements:   4 (1rem)
Within cards:       3 (0.75rem)
Button gaps:        2 (0.5rem)
```

### Typography
```
Modal Title:     text-xl font-bold (20px, 700)
Section Header:  text-lg font-semibold (18px, 600)
Body Text:       text-sm (14px)
Small Text:      text-xs (12px)
Score Numbers:   text-lg font-bold (18px, 700)
```

## 🎯 User Flow Diagram

```
[Open Meets] → [Select Meet] → [Entries Tab]
                                     ↓
                            [Auto-Generate Button]
                                     ↓
                          ┌──────────────────┐
                          │  Configuration   │
                          │  - Preset select │
                          │  - Mode select   │
                          │  - Max events    │
                          │  - Standards?    │
                          └──────────────────┘
                                     ↓
                          ┌──────────────────┐
                          │ Swimmer Selection│
                          │  - Group/Indiv.  │
                          │  - Search        │
                          │  - Multi-select  │
                          └──────────────────┘
                                     ↓
                            [Generate Button]
                                     ↓
                          ┌──────────────────┐
                          │  Processing...   │
                          │     🔄          │
                          └──────────────────┘
                                     ↓
                          ┌──────────────────┐
                          │  Recommendations │
                          │  - Per swimmer   │
                          │  - Scores shown  │
                          │  - Reasons shown │
                          └──────────────────┘
                                     ↓
                     [Back]  or  [Apply Recommendations]
                        ↓                  ↓
                   [Adjust]          [Entries Created!]
```

## 💡 Visual Hierarchy

### Information Priority (Top to Bottom)

1. **Modal Title** - What is this?
2. **Quick Presets** - Fast configuration
3. **Mode Selection** - Main strategy choice
4. **Max Events** - Quantity control
5. **Standards Toggle** - Optional filter
6. **Swimmer Selection** - Who to process
7. **Action Buttons** - Execute or cancel

### Recommendation Card Priority

1. **Swimmer Name** - Who
2. **Event Count** - How many
3. **Event Name & Number** - What
4. **Total Score** - How good
5. **Seed Time** - Performance expectation
6. **Score Breakdown** - Why this score
7. **Reasons** - Detailed justification
8. **Warnings** - Potential issues

## 🎨 Design Philosophy

- **Progressive Disclosure**: Simple defaults, advanced options available
- **Visual Feedback**: Every action has clear visual response
- **Guided Flow**: Natural progression through steps
- **Smart Defaults**: Balanced mode selected by default
- **Clear Hierarchy**: Important info stands out
- **Consistent Icons**: Same icons mean same things
- **Color Meaning**: Colors convey status/priority
- **Responsive**: Works on all screen sizes

---

**This visual guide complements the technical documentation and helps understand the UI/UX design decisions.**

