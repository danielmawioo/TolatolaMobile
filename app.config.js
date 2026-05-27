// Load .env into process.env when present (e.g. copy .env.example to .env)
require('dotenv').config();

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
      ]
    ],
    extra: {
      eas: {
        projectId: 'e2e4ea34-64fc-4698-9baf-329e34255023',
      },
      APP_API_URL: process.env.APP_API_URL ?? 'https://api.tolatola.co',
      SUPABASE_URL: process.env.SUPABASE_URL ?? '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
      APP_URL: process.env.APP_URL ?? 'tola://',
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID ?? '',
    },
  },
};
