# Auto-Generate Events Feature

## Overview

The Auto-Generate Events feature uses AI-powered recommendations to automatically suggest and create event entries for swimmers committed to meets. The system analyzes historical performance, improvement trends, standards proximity, team records, and strategic factors to recommend the best events for each swimmer.

## 🎯 Key Features

### 1. **Multi-Tier Scoring System**

The recommendation engine uses a comprehensive scoring system based on multiple factors:

#### **Tier 1: Core Eligibility (10 points)**
- Age group matching
- Gender matching
- Event availability at the meet
- Previous swim history

#### **Tier 2: Performance Score (0-40 points)**
- **Recent Improvement (0-15 points)**
  - 5%+ improvement in last 90 days: 15 points
  - 2-5% improvement: 10 points
  - 0-2% improvement: 5 points
  
- **Standards Level Achieved (0-15 points)**
  - AAAA: 15 points
  - AAA: 12 points
  - AA: 10 points
  - A: 8 points
  - BB: 6 points
  - B: 4 points

#### **Tier 3: Opportunity Score (0-30 points)**
- **Standards Proximity**
  - Within 3 seconds of next standard: +15 points
  - Within 5% of next standard: +10 points
  
- **Team Record Proximity**
  - Within 3 seconds of team record: +10 points
  - Within 5% of team record: +5 points
  - Already holds record: +5 points
  
- **New Event Bonus** (developmental mode only)
  - First time swimming event: +10 points

#### **Tier 4: Strategic Score (0-20 points)**
- **Signature Events** (top 3 by standards): +10 points
- **Event Pairing Intelligence**: +0-5 points based on:
  - Avoiding multiple distance events
  - Complementary events (same stroke, different distance)
  - Stroke versatility

### 2. **Event Pairing Intelligence**

The system prevents poor event combinations:

- **Avoids back-to-back distance events**
  - Prevents scheduling multiple 200+ yard events close together
  - Penalizes multiple IM events
  
- **Rewards complementary events**
  - Bonus for same stroke, different distances (e.g., 50 Free + 100 Free)
  - Bonus for stroke variety
  
- **Session spacing checks**
  - Warns about events too close together in the same session
  - In Championship mode, automatically avoids back-to-back events

### 3. **Event Difficulty Rating**

Each event is rated on a 1-5 difficulty scale:

- **Distance-based**: 50s are easier than 500s
- **Stroke multipliers**:
  - Butterfly/IM: 1.3-1.4x
  - Breaststroke: 1.2x
  - Backstroke/Freestyle: 1.0x

This helps coaches understand the physical demand of the event lineup.

### 4. **Recommendation Modes**

Three modes optimized for different meet types:

#### **Championship Mode**
- Focuses on best events only
- Filters out new events (no previous times)
- Avoids events with spacing conflicts
- Emphasizes signature events and standards chasers
- **Ideal for**: Conference championships, JOs, Regionals

#### **Balanced Mode** (Default)
- Mix of best and developmental events
- Considers both performance and opportunity
- Balanced approach to event selection
- **Ideal for**: Regular season meets, dual meets

#### **Developmental Mode**
- Encourages trying new events
- Bonus points for first-time events
- More exploratory recommendations
- **Ideal for**: B/C meets, intrasquad meets, early season

### 5. **Meet Type Presets**

Quick-select presets for common meet scenarios:

- **Championship Meet**: Championship mode, 3 events max, standards focus
- **Dual Meet**: Balanced mode, 4 events, general approach
- **B/C Meet**: Developmental mode, 5 events, experimentation
- **Qualifying Meet**: Championship mode, 2-3 events, cuts only

### 6. **Group vs Individual Generation**

- **Group Mode**: Generate entries for multiple swimmers at once
  - Select multiple swimmers via checkboxes
  - "Select All" option available
  - Ideal for full team entry creation
  
- **Individual Mode**: Generate entries for one swimmer
  - Radio button selection
  - More detailed focus on a single swimmer
  - Great for reviewing/refining individual entries

### 7. **Detailed Recommendations Display**

Each recommendation shows:

- **Event details**: Number, name, seed time
- **Total score**: Overall recommendation strength
- **Score breakdown**: Performance, Opportunity, Strategic scores
- **Improvement indicators**: Recent time drops and percentages
- **Standards proximity**: Distance to next motivational standard
- **Team record status**: Proximity to or holding of records
- **Signature event badges**: Top 3 events highlighted
- **Spacing warnings**: Alerts for potential scheduling conflicts
- **Difficulty rating**: 1-5 scale for event difficulty

## 🚀 How to Use

### Step 1: Open Meets Manager
1. Navigate to "Meets" from the main menu
2. Select your meet
3. Go to the "Entries" tab

### Step 2: Ensure Swimmers Are Committed
- Swimmers must first commit to the meet (or parents must commit them)
- Only committed swimmers will appear in the auto-generate modal

### Step 3: Click "Auto-Generate"
- Click the purple "Auto-Generate" button in the Entries tab
- The AI-powered modal will open

### Step 4: Configure Settings

**Quick Preset (Optional)**
- Choose a meet type preset for instant configuration
- Championship, Dual, B/C, or Qualifying Meet

**Or Customize Manually:**

1. **Select Mode**:
   - Championship: Best events only
   - Balanced: Mix approach
   - Developmental: Try new events

2. **Set Max Events**: Choose 2-5 events per swimmer

3. **Standards Focus** (Optional):
   - Enable "Focus on Standards Chasers"
   - Prioritizes events close to achieving next standard

### Step 5: Select Swimmers

**Group Mode:**
- Check boxes next to swimmers you want
- Use "Select All" for entire team
- Search bar to filter swimmers

**Individual Mode:**
- Switch to Individual tab
- Select one swimmer with radio button
- Great for detailed review

### Step 6: Generate Recommendations
- Click "Generate Recommendations"
- AI analyzes each swimmer's history, standards, and opportunities
- View detailed recommendations with scoring breakdown

### Step 7: Review Recommendations

For each swimmer, you'll see:
- Number of events recommended
- Each event with detailed scoring
- Reasons for each recommendation
- Any warnings (spacing conflicts, etc.)

### Step 8: Apply or Adjust
- **Apply**: Click "Apply Recommendations" to add all entries to the meet
- **Back**: Go back to adjust settings and regenerate
- **Cancel**: Close without making changes

## 💡 Best Practices

### Championship Meets
- Use Championship mode
- Set max events to 3-4
- Enable "Focus on Standards Chasers"
- Review spacing warnings carefully
- Prioritize signature events

### Developmental Meets
- Use Developmental mode
- Set max events to 4-5
- Allow new events (system will recommend them)
- Less concern about spacing
- Focus on variety and growth

### Dual Meets
- Use Balanced mode
- Set max events to 4
- Balance team scoring needs with individual development
- Mix of strong and developmental events

### Early Season
- More developmental approach
- Try new events to see what works
- Build event history for better recommendations later
- 4-5 events per swimmer acceptable

### Taper/End of Season
- Championship mode
- Narrow focus to best 2-3 events
- Maximize standards opportunities
- Avoid fatigue with smart spacing

## 📊 Understanding the Scores

### Total Score Range: 10-100 points

- **90+**: Excellent recommendation, strong in all areas
- **70-89**: Good recommendation, solid choice
- **50-69**: Decent recommendation, worth considering
- **30-49**: Marginal recommendation, may be developmental
- **Below 30**: Weak recommendation, likely filtered out

### Score Component Breakdown

**Performance Score (0-40)**
- Shows recent improvement and standards achieved
- Higher = stronger historical performance

**Opportunity Score (0-30)**
- Shows proximity to standards/records
- Higher = closer to next achievement

**Strategic Score (0-20)**
- Shows event fit and pairing quality
- Higher = better fits overall lineup strategy

## 🎨 UI Features

- **Color-coded score pills**: Visual indicators of score strength
- **Icon indicators**: 
  - 📈 Improvement trends
  - 🎯 Standards proximity
  - 🏆 Signature events
  - ⚠️ Spacing warnings
- **Gradient buttons**: Visual hierarchy and appeal
- **Meet type presets**: Quick configuration cards
- **Search functionality**: Easy swimmer filtering
- **Group/Individual toggle**: Flexible selection modes

## 🔧 Technical Details

### Data Sources
- `results` table: Historical swim times
- `time_standards` table: Motivational standards (B through AAAA)
- `team_records` table: Team records by age group
- `meet_events` table: Available events at the meet
- `meet_commitments` table: Committed swimmers

### Algorithm Flow
1. Load meet events and filter by eligibility (age/gender)
2. Load swimmer's historical results and best times
3. Load applicable time standards and team records
4. Calculate improvement trajectory over last 90 days
5. Calculate standards proximity for each event
6. Score each eligible event across 4 tiers
7. Add signature event bonuses (top 3 by standards)
8. Apply event pairing intelligence
9. Check for spacing conflicts
10. Sort by total score
11. Intelligently select top N events with good pairing
12. Return recommendations with detailed reasoning

### Performance Considerations
- Processes swimmers sequentially to avoid overload
- Caches standards and team records per swimmer
- Efficient database queries with proper filtering
- Average processing time: ~1-2 seconds per swimmer

## 📝 Future Enhancements (from PDF)

Potential additions for future versions:

- **Historical Meet Performance**: Track how swimmers perform at specific venues
- **Seasonal Timing Intelligence**: Early vs mid vs late season adjustments
- **Training Group Patterns**: Sprint vs distance group tendencies
- **Relay Considerations**: Ensure relay swimmers have supporting individual events
- **Coach Notes Integration**: Manual overrides and preferences
- **Learning System**: Track when coach deviates from recommendations to improve algorithm

## ❓ FAQ

**Q: What if a swimmer has no historical times?**
A: In Developmental mode, new events receive bonus points. In Championship mode, they're filtered out.

**Q: Can I override the recommendations?**
A: Yes! After reviewing, you can manually add/remove events in the regular Entries interface.

**Q: How does it handle relay-only swimmers?**
A: Currently focused on individual events. Relay-specific logic is planned for future versions.

**Q: What if two events are in the same session?**
A: The system checks event numbers and warns about close spacing. Championship mode avoids back-to-back events.

**Q: Can I save my preferred settings?**
A: Currently settings are session-based. Saved presets are planned for a future update.

**Q: How often should I use auto-generate?**
A: Great for initial entries or bulk entry creation. You can always manually adjust afterwards.

## 🎯 Success Metrics

After using auto-generate, you should see:
- ✅ More swimmers entered in their strongest events
- ✅ Better balance between development and performance
- ✅ Fewer spacing conflicts and swimmer fatigue issues
- ✅ More swimmers achieving standards
- ✅ Significant time savings for coaches
- ✅ Data-driven entry decisions

---

**Built with the StormTracker Auto-Generate Events Engine** 🏊‍♂️⚡

