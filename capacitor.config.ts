import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.64d76cf785b647159c81e3a2358707e1',
  appName: 'barberhub-tv',
  webDir: 'dist',
  server: {
    url: 'https://64d76cf7-85b6-4715-9c81-e3a2358707e1.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0a0a0f',
      showSpinner: false,
    },
  },
};

export default config;
