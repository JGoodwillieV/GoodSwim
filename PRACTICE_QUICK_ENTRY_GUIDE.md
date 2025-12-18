# ⚡ Quick Entry Mode - Type Practices Like a Doc!

## What Is It?

**Quick Entry Mode** is a fast, text-based way to build practices - perfect for coaches who prefer typing over clicking!

Instead of clicking through modals, just type naturally like you would in a Word doc, and we'll parse it into structured practice data.

---

## 🚀 How to Access

1. Open any practice in Practice Builder
2. Click the yellow **"⚡ Quick Entry"** button in the top-right
3. Start typing!
4. Click **"Parse & Save"** when done
5. Switch back to Builder to see structured view

---

## ⌨️ Quick Syntax

### Set Headers
Start any set with `##`:

```
## WARMUP
## MAIN SET
## TEST SET
## COOLDOWN
```

### Basic Items
Format: `reps x distance stroke @interval`

```
4x100 Free @1:30
8x50 Back @:50
200 IM
```

### With Description
Add description after a dash `-`:

```
4x100 Free @1:30 - descend 1-4
6x50 Fly @:55 - build each
8x25 Free @:30 - FAST
```

### With Intensity
Add intensity in parentheses `()`:

```
4x50 Free @:45 (sprint)
200 Free (easy)
8x25 Free (race_pace)
```

**Options**: easy, moderate, fast, sprint, race_pace

### With Equipment
Add equipment in brackets `[]`:

```
4x100 Free @1:30 [fins]
6x50 Free [paddles, snorkel]
200 Kick [kickboard]
```

**Options**: fins, paddles, snorkel, kickboard, pull_buoy, band

### Complete Example
All together:

```
4x100 Free @1:30 - descend (moderate) [fins]
```

This creates an item with:
- 4 reps
- 100 yards each
- Freestyle stroke
- 1:30 interval
- "descend" description
- Moderate intensity
- Fins equipment

---

## 📝 Full Practice Example

```
## WARMUP
4x100 Free @1:30 - easy
4x50 Choice @:50 - drill/swim by 25

## PRE-SET
6x50 Kick @1:00 - build each [fins]
6x50 Drill @:55 - choice stroke

## MAIN SET
3x200 Free @2:45 - descend 1-3
4x50 Free @:45 - FAST (sprint)
1x100 Easy - recovery

## TEST SET
10x100 Free @1:30 - best average

## COOLDOWN
4x100 Choice - stretching
```

---

## 🎯 Stroke Names

**Valid Strokes** (any of these work, any case):

| Type | You Can Type | We Save As |
|------|-------------|------------|
| Freestyle | free, freestyle, fr, Free, FR | free |
| Backstroke | back, backstroke, bk, Back, BK | back |
| Breaststroke | breast, breaststroke, br, Breast, BR | breast |
| Butterfly | fly, butterfly, fl, Fly, FL | fly |
| Individual Medley | IM, im, Im | IM |
| Choice | choice, Choice | choice |
| Drill | drill, dr, Drill | drill |
| Kick | kick, ki, Kick | kick |

**Important**: The parser automatically converts your input to match database requirements. Type any variation - it will work!

---

## ✨ Quick Templates

Click the template buttons to instantly insert:

- **+ Warmup** → Inserts `## WARMUP`
- **+ Main Set** → Inserts `## MAIN SET`
- **+ Test Set** → Inserts `## TEST SET`
- **+ Cooldown** → Inserts `## COOLDOWN`

---

## 💡 Pro Tips

### 1. Type Naturally
Don't overthink it! Type like you normally would:

```
4x100 Free @1:30
```

Works just as well as:

```
4 x 100 Free @ 1:30
```

### 2. Use Shortcuts
For fast typing:

```
4x100 fr @1:30
8x50 bk @:50
6x100 br @1:20
```

### 3. Single Rep Default
If you don't specify reps, it defaults to 1:

```
200 IM
```

Same as:

```
1x200 IM
```

### 4. Mix and Match
You don't need all the extras:

```
4x100 Free @1:30        ← Just basics
4x100 Free - descend    ← Add description
4x100 Free (sprint)     ← Add intensity
4x100 Free [fins]       ← Add equipment
```

All valid!

### 5. Save Often
Click "Parse & Save" frequently to check your work. If there are errors, you'll see them immediately.

---

## 🐛 Common Errors

### "Could not parse"
**Problem**: Format doesn't match expected pattern

**Fix**: Make sure you have `reps x distance stroke` format
```
✅ 4x100 Free
❌ 4 100 Free (missing 'x')
```

### "Unknown stroke"
**Problem**: Stroke name not recognized

**Fix**: Use valid stroke names (any case/variation works)
```
✅ 4x100 Free
✅ 4x100 free
✅ 4x100 freestyle
✅ 4x100 fr
✅ 4x100 FR
❌ 4x100 crawl (not a valid name)
```

Valid strokes: free, back, breast, fly, IM, choice, drill, kick (plus variations)

### Parse Errors Show Up
**What**: Red error box appears with line numbers

**Fix**: Read the error message - it tells you which line and what's wrong. Fix that line and click "Parse & Save" again.

---

## 🔄 Workflow

### Best Workflow
1. **Type fast** in Quick Entry (like a doc)
2. **Parse & Save** to convert to structured data
3. **Switch to Builder** to see/edit visually
4. **Make fine adjustments** in Builder if needed
5. **Run Practice** when ready!

### When to Use Each Mode

**Use Quick Entry When**:
- ✅ Building a new practice from scratch
- ✅ You have practice written elsewhere (copy/paste)
- ✅ You type fast and know what you want
- ✅ You prefer keyboard over mouse

**Use Builder When**:
- ✅ Making small edits to existing practice
- ✅ You want visual feedback
- ✅ You're exploring options (equipment, intensity, etc.)
- ✅ You prefer clicking over typing

---

## 🎨 UI Features

### Split View
- **Left**: Text editor (type here)
- **Right**: Quick reference guide (always visible)

### Live Feedback
- Errors show immediately after Parse & Save
- Line numbers help you find problems fast
- Clear error messages explain what's wrong

### Toolbar
- Quick template buttons at the top
- Parse & Save button (turns green when saved)
- Switch to Builder button (toggle views)

---

## 🚀 Advanced Usage

### Copy/Paste from Existing Docs
Have practices in Word/Google Docs? Just copy and paste!

1. Copy your existing practice
2. Paste into Quick Entry
3. Format set headers with `##`
4. Parse & Save
5. Done!

### Keyboard-Focused
- Tab through template buttons
- Use up/down arrows in textarea
- No mouse needed after clicking into editor
- Fast for touch typists

### Batch Create
1. Type multiple practices in one session
2. Parse & Save first practice
3. Clear text
4. Type next practice
5. Repeat!

---

## 📊 Parser Intelligence

The parser is smart and forgiving:

### Auto-Detects Set Types
```
## WARMUP → warmup set
## MAIN SET → main_set
## TEST → test_set
## COOLDOWN → cooldown
```

### Flexible Formatting
```
4x100 Free @1:30    ← Standard
4 x 100 Free @1:30  ← Extra spaces (OK!)
4x100 fr @1:30      ← Shortcut (OK!)
```

### Handles Missing Data
```
4x100 Free          ← No interval (OK!)
200 IM              ← No reps (defaults to 1)
4x100 Free - desc   ← Just description (OK!)
```

---

## 🎯 Real Coach Examples

### Example 1: Quick Warmup
```
## WARMUP
400 Free
8x50 Choice @:50
4x100 IM @1:30
```

### Example 2: Sprint Practice
```
## MAIN SET
4x25 Free @:30 (sprint)
4x25 Free @:30 (sprint)
100 Easy
4x25 Free @:30 (sprint)
4x25 Free @:30 (sprint)
```

### Example 3: Distance Practice
```
## MAIN SET
3x400 Free @5:00 - descend 1-3
200 Easy
3x200 Free @2:30 - hold pace
200 Easy
```

---

## ✅ Checklist

Before clicking "Parse & Save":

- [ ] All sets have `##` headers
- [ ] Items follow `reps x distance stroke` format
- [ ] Stroke names are valid
- [ ] Intervals start with `@`
- [ ] Descriptions start with `-`
- [ ] Intensity in `(parentheses)`
- [ ] Equipment in `[brackets]`

---

## 🎉 Benefits

### Time Savings
- **Type practice**: 2 minutes
- **vs Click through modals**: 5-10 minutes
- **Saves**: 3-8 minutes per practice!

### Familiarity
- Works like Word/Google Docs
- Natural for coaches
- Low learning curve

### Speed
- Keyboard > Mouse for fast entry
- No modal delays
- Flow state typing

### Flexibility
- Switch between modes anytime
- Use what works for each situation
- Best of both worlds!

---

## 🚦 Getting Started

### First Time?
1. Click "Quick Entry" in any practice
2. Read the right sidebar guide
3. Try a simple practice first
4. Click "Parse & Save"
5. Switch to Builder to see results
6. Get comfortable, then go faster!

### Already Comfortable?
Just type and save. You've got this! ⚡

---

**Happy Fast Typing! 🚀**

*Quick Entry Mode - Type practices at the speed of thought*

