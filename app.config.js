const appJson = require('./app.json');

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  appJson.expo.extra.supabaseUrl;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  appJson.expo.extra.supabaseAnonKey;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      supabaseUrl,
      supabaseAnonKey,
    },
  },
};
