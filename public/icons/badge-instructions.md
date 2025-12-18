# Badge Icon Instructions

For the best notification experience, you need a **badge icon** (72x72px, monochrome).

## What is a Badge Icon?

The badge icon appears in:
- Android notification tray
- iOS notification center
- Some desktop notification systems

It should be:
- 72x72 pixels
- Monochrome (single color with transparency)
- Simple, recognizable design
- Usually white or colored icon on transparent background

## Create Badge Icon

### Option 1: Use Existing Icon

If you already have a `72.png` in the `/public/icons/` folder, you can use it as-is if it's simple enough.

### Option 2: Create Custom Badge

1. **Design Tool:** Use Figma, Photoshop, or any image editor
2. **Size:** 72x72 pixels
3. **Style:** Monochrome (white icon on transparent, or single color)
4. **Design:** Simple logo or "ST" letters for StormTracker

### Option 3: Convert from Existing Logo

If you have `team-logo-white.png`, you can convert it:

```bash
# Using ImageMagick (if installed)
convert team-logo-white.png -resize 72x72 -background none -gravity center -extent 72x72 public/icons/badge-72.png
```

### Option 4: Use SVG to PNG

If you have an SVG logo:

1. Open in browser or design tool
2. Export as PNG at 72x72px
3. Save as `badge-72.png`

## File Location

Save your badge icon as:
```
public/icons/badge-72.png
```

## Testing

After adding the badge icon:

1. Clear browser cache
2. Refresh the app
3. Send a test notification
4. Check notification tray/center

The badge should appear next to your notification.

## Example

A good badge icon for StormTracker could be:
- Stylized wave or swimmer icon (monochrome)
- "ST" letters in bold font
- Lightning bolt for "Storm" theme
- Simple geometric wave pattern

Keep it simple and recognizable at small sizes!

