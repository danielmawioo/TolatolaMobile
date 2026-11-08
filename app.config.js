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
      SUPABASE_URL:
        process.env.SUPABASE_URL ?? 'https://eyvumcctadmjetvjujcn.supabase.co',
      SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY ??
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dnVtY2N0YWRtamV0dmp1amNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg0NzYsImV4cCI6MjA3NDk2NDQ3Nn0.RuFpE0tm1xGRHDZzreE1zpgWfNeGrsqxaXPRqvNXavs',
      APP_URL: process.env.APP_URL ?? 'tola://',
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
      SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
      MAPBOX_ACCESS_TOKEN:
        process.env.MAPBOX_ACCESS_TOKEN ??
        process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
        '',
      MAPBOX_STYLE_URL:
        process.env.MAPBOX_STYLE_URL ??
        process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL ??
        'mapbox://styles/mapbox/navigation-day-v1',
    },
  },
};
