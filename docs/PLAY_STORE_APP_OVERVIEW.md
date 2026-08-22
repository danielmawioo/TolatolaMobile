11`# Google Play – App overview content

Use this in **Play Console → Your app → Main store listing** (and related overview fields). Replace placeholders if needed.

---

## Professional store preview (title, icon, colors)

If Play shows **`co.tolata.tolamobile (unreviewed)`**, a **generic gray robot icon**, or little branding, fix it in two places: **Play Console listing** (what shoppers see) and **a new store build** (icons embedded in the AAB).

### Why that happens

- **`(unreviewed)`** — Common on **internal / closed testing** before the main listing is complete or fully reviewed for production.
- **Package-style title** — The store **App name** in Play Console is empty or not saved; Play falls back to the application ID until the listing is filled out.
- **Gray placeholder icon** — Often **no valid high-res icon** on the listing, a **bad or missing adaptive icon** in the uploaded build, or Play still processing assets. After fixing assets, upload a **new release** and a **512×512** store icon.

### TOLA brand colors (match the app)

| Role | Hex | Notes |
|------|-----|--------|
| Primary blue | `#1a56db` | Buttons, headers, active states |
| Primary dark | `#0f3d82` | Gradients, emphasis |
| Accent red | `#dc2626` | Brand accents (e.g. logo) |
| Background | `#ffffff` | Clean product UI |
| Text | `#0f172a` | Headings and body |

Use **primary blue** for feature banners and screenshot accents so the listing matches the app.

### Play Console checklist (Grow → Store presence → Main store listing)

1. **App name:** `TOLA` (max 30 characters).
2. **Short description** and **Full description** — use the sections below.
3. **App icon** — **512 × 512 px**, PNG, 32-bit with transparency as needed. Export from the same master artwork as `assets/images/icon.png` (crisp, not upscaled from a tiny source).
4. **Feature graphic** — **1024 × 500 px**, JPG or 24-bit PNG (no alpha). Suggested layout: full-bleed `#1a56db`, white **TOLA** wordmark, short line e.g. *Shop · Order · Track*, optional phone mockups (see listings like Elirox/FxPro for composition).
5. **Phone screenshots** — At least **2** (up to 8); min short side **320 px**, 9:16 or 16:9 per [Play screenshot specs](https://support.google.com/googleplay/android-developer/answer/9866151). Show real flows: home, search, product, cart, orders.
6. **Save** the listing, then roll out a **new build** after refreshing local icons (below).

### Phone screenshots in this repo

Ready-to-upload PNGs live in **`store-assets/google-play/phone-screenshots/`** (numbered for a sensible story order):

| File | Suggested screen |
|------|------------------|
| `01-home-verified-marketplace.png` | Home (verified marketplace hero) |
| `02-home-tola-pay.png` | Home (alternate hero) |
| `03-categories.png` | Categories |
| `04-cart.png` | Cart |
| `05-checkout-order-summary.png` | Checkout — order summary |
| `06-checkout-delivery-payment.png` | Checkout — delivery & payment |
| `07-profile.png` | Profile |
| `08-notifications.png` | Notifications / Alerts |
| `09-login.png` | Log in |
| `10-create-account.png` | Create account |

**Upload in Play Console:** **Grow → Store presence → Main store listing → Phone screenshots** → Add screenshots (drag-drop or browse). Google may show up to 8 in the carousel; pick the strongest set. If any filename doesn’t match what you see on disk, rename the PNG before uploading—ordering in Console is drag-and-drop.

After you refresh the **Notifications** screen in the app, consider recapturing `08-notifications.png` so the store matches the latest UI.

### Icons in this repo (before `eas build`)

- **App icon:** `assets/images/icon.png` (Expo / iOS / general).
- **Android adaptive foreground:** `assets/images/adaptive-icon.png` — regenerate so the logo sits in the safe zone:
  ```bash
  node scripts/generate-adaptive-icon.js
  ```
- **Adaptive background** in `app.json` is set to **TOLA primary** (`#1a56db`) so launcher and store previews read as on-brand when the mask shows the edge.

After changing icons, run a new **production** Android build and submit so Play picks up the updated launcher icon.

---

## Short description (max 80 characters)

Use in: **Short description** field.

**Option A**
```
TOLA – Digital trade & supply chain ecosystem. Shop, order & track.
```
(76 characters)

**Option B**
```
Shop, order and track on TOLA – digital trade & supply chain ecosystem.
```
(75 characters)

**Option C**
```
Digital trade made simple. Browse, buy and track orders on TOLA.
```
(63 characters)

---

## Full description (max 4000 characters)

Use in: **Full description** field.

```
TOLA is a digital trade and supply chain ecosystem. The TOLA app puts the marketplace in your pocket.

WHAT YOU CAN DO

• Browse and shop – Discover products from verified sellers on the TOLA marketplace.

• Cart and checkout – Add items to your cart and complete purchases securely in the app.

• Order history – See all your orders in one place and track their status.

• Favorites – Save products you like for quick access later.

• Account – Sign in or create an account so your data syncs across devices and stays secure.

• Track – Verify and follow your orders, and raise any issues through the app.

WHO IT’S FOR

• Buyers – Shop from a growing network of sellers and keep track of every order.
• Sellers and transporters – Access vendor and transporter tools through the same app (where available).

WHY TOLA

TOLA is built for Tanzania’s formal trade environment. The ecosystem is designed to support compliance and transparency, so you can trade with confidence.

Download TOLA today and join the digital trade and supply chain ecosystem.
```

---

## App name (store listing)

- **Brand:** TOLA  

Use **TOLA** consistently as the app name and brand across mobile, web, and documentation.

---

## Tagline (optional, 30 chars typical)

- Digital trade & supply chain  
- Shop. Order. Track.  

Use in store listing if your console has a dedicated tagline field.
