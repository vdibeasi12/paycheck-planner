import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Reverse-domain app ID. CHANGE THIS to your own domain if you have one.
  // It becomes the iOS Bundle ID and Android applicationId and is permanent
  // once you submit to the stores, so pick carefully.
  appId: 'com.dibeasi.paycheckplanner',
  appName: 'Paycheck Planner',

  // webDir must exist, but when `server.url` is set below it is only used as
  // an offline fallback. We point it at the small fallback page in ./www.
  webDir: 'www',

  server: {
    // The native app loads your real, fully-working web app from here.
    // This keeps server components, API routes, Supabase auth (cookies),
    // Stripe and AI all functioning exactly as they do on the web.
    url: 'https://paycheckplanner-snowy.vercel.app',
    // Only allow HTTPS. Leave false unless you are testing against a local
    // http:// dev server (then set true AND use your machine's LAN IP).
    cleartext: false,
  },

  ios: {
    contentInset: 'always',
  },

  android: {
    // Allow the webview to use the device back button to navigate history.
    allowMixedContent: false,
  },
};

export default config;
