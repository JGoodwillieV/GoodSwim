# Deployment Instructions - Practice Builder Fix

## The Problem
The production site (www.goodswim.io) has cached old JavaScript files that contain buggy code for creating practices.

## What Was Fixed
1. Updated service worker cache from `goodswim-v1` to `goodswim-v2`
2. Rebuilt the application to generate fresh JavaScript bundles
3. New files are in the `dist` folder

## How to Deploy

### Step 1: Upload New Files
Upload the entire `dist` folder contents to your production server, replacing the old files:
- `dist/index.html`
- `dist/assets/index-BR0SnDMJ.js`
- `dist/sw.js`
- `dist/service-worker.js`
- `dist/workbox-b51dd497.js`
- All other files in `dist/`

### Step 2: Clear Browser Cache
After deployment, users will need to:
1. **Hard refresh** the page: 
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
2. Or clear browser cache manually

### Step 3: Verify Fix
Test both paths:
1. ✅ Dashboard → "More Actions" → "Practice Builder"
2. ✅ Schedule tab → "Create" → "Open Practice Builder"

Both should now work without the 400 error.

## Technical Details
The error was:
```
/rest/v1/practices?columns=%22coach_id%22...&select=*
```

This malformed API call doesn't exist in the current codebase - it was from old cached JavaScript.

## If It Still Doesn't Work
1. Check browser console for errors
2. Verify the service worker cache name shows `goodswim-v2` (check in DevTools → Application → Service Workers)
3. Try in an incognito window (no cache)
4. Check that the correct JavaScript file is being loaded (should be index-BR0SnDMJ.js)

