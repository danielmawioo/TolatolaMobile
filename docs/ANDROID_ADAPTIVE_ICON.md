# Android adaptive icon (TOLA)

Per Android adaptive icon guidelines and design feedback:

- **Canvas:** 1024 × 1024 px
- **Safe area:** Keep the logo inside a **640 × 640 px** center area so it doesn’t look zoomed on different shapes (circle, squircle, etc.)
- **Padding:** Enough padding around the logo so it doesn’t get clipped

So the logo should sit in the center 640×640 region; the outer 192 px on each side (1024 − 640 = 384 total; 192 per side) is the safe margin.

## Generating the icon

From the project root, run:

```bash
node scripts/generate-adaptive-icon.js
```

This reads `assets/images/icon.png` (or the source you set in the script), places it centered in a 1024×1024 canvas with the logo scaled to fit inside 640×640, and writes `assets/images/adaptive-icon.png`. Requires `sharp` (install with `npm install --save-dev sharp`).

## Manual export (e.g. Figma)

1. Create a 1024×1024 artboard.
2. Place the TOLA logo in the center.
3. Ensure the logo (or its bounding box) fits within a 640×640 area centered on the canvas (e.g. guides at 192 px and 832 px from each edge).
4. Export as PNG (transparent background for foreground layer).
5. Save as `assets/images/adaptive-icon.png`.

Expo uses this file in `app.json` under `expo.android.adaptiveIcon.foregroundImage`.

**Background layer:** `expo.android.adaptiveIcon.backgroundColor` is the color behind the foreground on Android (launcher, recent apps, and often visible at the edges on the Play Store listing). Use **`#ffffff`** for plain white; avoid brand blue there if you do not want a colored ring around the logo.
