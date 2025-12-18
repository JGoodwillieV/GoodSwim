# Team Records Feature - Testing Guide

This guide provides step-by-step instructions for testing the team records feature.

## Prerequisites

Before testing, ensure you have:

1. ✅ Created the `team_records` table in Supabase (using `team_records_schema.sql`)
2. ✅ Loaded the team records data (using `load_team_records.js` or manual import)
3. ✅ At least one swimmer in the system with recorded times
4. ✅ The StormTracker app running locally or deployed

## Test Cases

### Test Case 1: Verify Team Record Display for 50 Free

**Setup:**
- Use a swimmer aged 11-12 years old
- Ensure they have a time recorded for "50 Free"

**Steps:**
1. Navigate to the swimmer's profile
2. Scroll to the "Standards & Goals" section for 50 Free
3. Click the "View Ladder" button

**Expected Results:**
- Modal opens showing the time standards ladder
- You should see:
  - Standard times (B, BB, A, AA, AAA, AAAA) in gray
  - **Team Record** entry with:
    - Gold/orange gradient background
    - Star icon (⭐)
    - Text: "Team Record (Reagan Strohhacker)" for girls or "Team Record (Preston Jordan)" for boys
    - Time: 24.91 for girls or 24.68 for boys
  - Swimmer's best time with blue background and clock icon
- All entries sorted from fastest to slowest
- Footer shows legend with star = Team Record, clock = Your Best

**Screenshot Checkpoints:**
- [ ] Team record has gold/orange gradient background
- [ ] Star icon appears in the team record entry
- [ ] Record holder's name is displayed
- [ ] Time matches the data in team_records table

---

### Test Case 2: Multiple Age Groups

**Setup:**
Test with swimmers from different age groups for the same event (e.g., 100 Free)

**Steps:**
For each age group (8 & Under, 9/10, 11/12, 13/14, 15 & Over):
1. Select a swimmer in that age group
2. Find an event they have a time for
3. Open the "View Ladder" modal
4. Verify the correct age group's team record appears

**Expected Results:**

| Age Group | Event | Expected Record Holder (Girls) | Time |
|-----------|-------|-------------------------------|------|
| 8 & Under | 100 Free | Ella Kate Davis | 1:18.18 |
| 9/10 | 100 Free | Reagan Strohhacker | 58.75 |
| 11/12 | 100 Free | Reagan Strohhacker | 54.34 |
| 13/14 | 100 Free | Reagan Strohhacker | 51.81 |
| 15 & Over | 100 Free | Margaret Ivie | 53.44 |

Each age group should show their specific record, not other age groups' records.

---

### Test Case 3: Gender Separation

**Setup:**
- Select a male swimmer
- Select a female swimmer
- Both should have times for the same event (e.g., 50 Back)

**Steps:**
1. Open male swimmer's profile → View Ladder for 50 Back
2. Note the team record displayed
3. Open female swimmer's profile → View Ladder for 50 Back
4. Note the team record displayed

**Expected Results:**
- Male swimmer sees male team record
- Female swimmer sees female team record
- Records are different (different holder and time)

Example for 11/12 age group, 50 Back:
- Male: Chandler Rose - 29.19
- Female: Reagan Strohhacker - 28.63

---

### Test Case 4: No Team Record Available

**Setup:**
- Find an event with no team record for a specific age group
- Or test with a relay event (not currently in database)

**Steps:**
1. Navigate to swimmer profile
2. Open View Ladder for that event

**Expected Results:**
- Modal opens normally
- No team record entry appears (only standards and swimmer's time)
- No errors in browser console
- UI remains functional

---

### Test Case 5: Swimmer Better Than Team Record

**Setup:**
- Manually create or update a swimmer's time to be faster than the team record
- Use Supabase to temporarily modify a result

**Steps:**
1. Update a swimmer's time to beat the team record
2. Refresh the swimmer's profile
3. Open View Ladder

**Expected Results:**
- Swimmer's time (blue) appears ABOVE the team record (gold) in the sorted list
- Both entries are clearly visible
- Visual hierarchy is maintained (swimmer time has blue highlight, team record has gold)

---

### Test Case 6: Different Event Types

Test the feature across various event types to ensure broad coverage:

**Events to Test:**
- ✅ Sprint: 25 Free, 50 Free
- ✅ Distance: 100 Free, 200 Free, 500 Free
- ✅ Long Distance: 1000 Free, 1650 Free
- ✅ Backstroke: 25 Back, 50 Back, 100 Back, 200 Back
- ✅ Breaststroke: 25 Breast, 50 Breast, 100 Breast, 200 Breast
- ✅ Butterfly: 25 Fly, 50 Fly, 100 Fly, 200 Fly
- ✅ IM: 100 IM, 200 IM, 400 IM

**Steps:**
For each event category:
1. Select a swimmer with times in that stroke
2. View ladder for various distances
3. Verify team record appears correctly

**Expected Results:**
- Team records display correctly for all strokes
- Times are properly formatted (MM:SS.ss for longer events, SS.ss for shorter)
- No missing or incorrect data

---

### Test Case 7: Modal Interaction

**Steps:**
1. Open View Ladder modal
2. Scroll up and down the list
3. Click the X button to close
4. Click outside the modal (on the backdrop)

**Expected Results:**
- Modal scrolls smoothly
- Swimmer's time and team record remain prominently highlighted while scrolling
- X button closes the modal
- Clicking backdrop closes the modal
- No console errors

---

### Test Case 8: Performance Check

**Steps:**
1. Open a swimmer profile with many events (10+)
2. Rapidly click "View Ladder" on multiple events
3. Monitor browser console and network tab

**Expected Results:**
- Modal opens quickly (< 500ms)
- Database queries are efficient
- No duplicate queries
- No memory leaks when opening/closing repeatedly
- Console shows no errors or warnings

---

### Test Case 9: Mobile Responsiveness

**Setup:**
- Open StormTracker on a mobile device or use browser DevTools mobile emulation

**Steps:**
1. Navigate to swimmer profile on mobile
2. Find Standards & Goals section
3. Tap "View Ladder"
4. Scroll through the ladder

**Expected Results:**
- Modal is properly sized for mobile screen
- Text is readable
- Touch scrolling works smoothly
- Legend at bottom is visible
- Close button is easily tappable

---

### Test Case 10: Data Integrity

**Steps:**
1. In Supabase, run this query:
```sql
SELECT event, age_group, gender, COUNT(*) as count
FROM team_records
GROUP BY event, age_group, gender
HAVING COUNT(*) > 1;
```

**Expected Results:**
- Query returns 0 rows (no duplicate records for same event/age/gender combo)
- Each event/age/gender combination should have exactly 1 record

2. Check total record count:
```sql
SELECT COUNT(*) FROM team_records;
```

**Expected Results:**
- Should return approximately 250-300 records (depending on which events have records for each age group)

---

## Automated Testing (Optional)

If you want to write automated tests, here's a suggested structure:

### Unit Tests (Jest/Vitest)

```javascript
describe('StandardsModal', () => {
  it('should fetch team record for correct age group', () => {
    // Test age group mapping
    expect(getAgeGroup(8)).toBe('8 & Under');
    expect(getAgeGroup(10)).toBe('9/10');
    expect(getAgeGroup(12)).toBe('11/12');
    expect(getAgeGroup(14)).toBe('13/14');
    expect(getAgeGroup(16)).toBe('15 & Over');
  });

  it('should display team record with correct styling', () => {
    // Test that team record has isTeamRecord flag
    // Test that correct CSS classes are applied
  });

  it('should sort combined list correctly', () => {
    // Test that times are sorted fastest to slowest
  });
});
```

### Integration Tests (Playwright/Cypress)

```javascript
describe('Team Records Integration', () => {
  it('should display team record in ladder view', () => {
    cy.visit('/swimmer/123');
    cy.contains('View Ladder').click();
    cy.contains('Team Record').should('be.visible');
    cy.get('.bg-gradient-to-r').should('exist'); // Gold gradient
  });
});
```

---

## Known Issues & Limitations

1. **Event Name Matching**: Event names must exactly match between `results` and `team_records` tables
   - "50 Free" will match
   - "50 Freestyle" will NOT match
   - Make sure event names are consistent

2. **Course Separation**: Currently only SCY (Short Course Yards) records are loaded
   - LCM and SCM records need to be added separately

3. **Relay Events**: Not currently included in the system
   - Can be added following the same data structure

4. **25-Yard Events**: These are typically 8 & Under only
   - Standards system may not show for 25-yard events
   - Team records should still appear if the event is in the database

---

## Troubleshooting

### Team Record Not Showing

**Problem**: Swimmer has a time but no team record appears

**Solutions**:
1. Check event name match:
   ```sql
   SELECT event FROM team_records WHERE event LIKE '%Free%';
   SELECT event FROM results WHERE event LIKE '%Free%';
   ```
2. Verify age group calculation
3. Check swimmer's gender matches record gender
4. Look for console errors in browser DevTools

### Wrong Team Record Displayed

**Problem**: Team record is for wrong age group or gender

**Solutions**:
1. Verify swimmer's age and gender in database
2. Check age group mapping logic
3. Verify database query in `StandardsModal.jsx`

### Styling Issues

**Problem**: Team record doesn't have gold/orange styling

**Solutions**:
1. Check that `isTeamRecord` flag is set correctly
2. Verify Tailwind classes are properly configured
3. Check browser console for CSS errors

---

## Test Results Template

Use this template to document your test results:

```
Date: ___________
Tester: ___________
Version: ___________

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: 50 Free Display | ☐ Pass ☐ Fail | |
| TC2: Multiple Age Groups | ☐ Pass ☐ Fail | |
| TC3: Gender Separation | ☐ Pass ☐ Fail | |
| TC4: No Record Available | ☐ Pass ☐ Fail | |
| TC5: Faster Than Record | ☐ Pass ☐ Fail | |
| TC6: Different Events | ☐ Pass ☐ Fail | |
| TC7: Modal Interaction | ☐ Pass ☐ Fail | |
| TC8: Performance | ☐ Pass ☐ Fail | |
| TC9: Mobile | ☐ Pass ☐ Fail | |
| TC10: Data Integrity | ☐ Pass ☐ Fail | |

Overall Status: ☐ All Pass ☐ Some Failures

Issues Found:
1. 
2. 
3. 

```

---

## Success Criteria

The feature is considered fully functional when:

- ✅ All 10 test cases pass
- ✅ No console errors during normal usage
- ✅ Team records display correctly for all age groups
- ✅ Gender separation works correctly
- ✅ Visual styling matches design (gold/orange for team records)
- ✅ Mobile experience is smooth
- ✅ Performance is acceptable (< 500ms load time)
- ✅ Data integrity is maintained (no duplicates)

## Next Steps After Testing

Once testing is complete:

1. **Document any bugs** found during testing
2. **Fix critical issues** before deploying to production
3. **Update team records** as new records are set
4. **Monitor usage** to ensure feature is being used
5. **Gather feedback** from coaches and swimmers
6. **Consider enhancements** like record-breaking notifications

---

## Contact

For questions about this testing guide or the team records feature, contact the StormTracker development team.

