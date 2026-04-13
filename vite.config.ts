import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __FIREBASE_PROJECT_ID__: JSON.stringify(env.VITE_PROJECT_ID ?? env.PROJECT_ID ?? ''),
      __FIREBASE_APP_ID__: JSON.stringify(env.VITE_APP_ID ?? env.APP_ID ?? ''),
      __FIREBASE_API_KEY__: JSON.stringify(env.VITE_API_KEY ?? env.API_KEY ?? ''),
      __FIREBASE_AUTH_DOMAIN__: JSON.stringify(env.VITE_AUTH_DOMAIN ?? env.AUTH_DOMAIN ?? ''),
      __FIREBASE_FIRESTORE_DATABASE_ID__: JSON.stringify(
        env.VITE_FIRESTORE_DATABASE_ID ?? env.FIRESTORE_DATABASE_ID ?? env.VITE_FIRE_STORE_DATABASE_ID ?? env.FIRE_STORE_DATABASE_ID ?? ''
      ),
      __FIREBASE_STORAGE_BUCKET__: JSON.stringify(env.VITE_STORAGE_BUCKET ?? env.STORAGE_BUCKET ?? ''),
      __FIREBASE_MESSAGING_SENDER_ID__: JSON.stringify(env.VITE_MESSAGING_SENDER_ID ?? env.MESSAGING_SENDER_ID ?? ''),
      __FIREBASE_MEASUREMENT_ID__: JSON.stringify(env.VITE_MEASUREMENT_ID ?? env.MEASUREMENT_ID ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      
    
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
