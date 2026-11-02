// Load .env into process.env when present (e.g. copy .env.example to .env)
try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not installed in certain build environments
}

const appJson = require('./app.json');

const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.tolatola';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": iosUrlScheme
        }
      ],
      "expo-secure-store",
      "@sentry/react-native",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow TOLA to use Face ID for quick sign-in."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: 'e2e4ea34-64fc-4698-9baf-329e34255023',
      },
      APP_API_URL: process.env.APP_API_URL ?? 'https://api.tolatola.co',
      // No hardcoded fallback: src/config/env.ts throws a clear startup error
      // if these aren't set, instead of silently using a baked-in project key.
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      APP_URL: process.env.APP_URL ?? 'tola://',
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
      // Public Mapbox token (pk.*). Used by the in-app navigation WebView for
      // map tiles/styles. Safe to ship in the client; restrict it to the
      // Tolatola bundle/URLs in the Mapbox dashboard. When empty the
      // navigation screen falls back to the OpenStreetMap/Leaflet renderer
      // instead of breaking.
      MAPBOX_ACCESS_TOKEN:
        process.env.MAPBOX_ACCESS_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
      MAPBOX_STYLE_URL:
        process.env.MAPBOX_STYLE_URL ??
        process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL ??
        'mapbox://styles/mapbox/navigation-day-v1',
    },
  },
};
