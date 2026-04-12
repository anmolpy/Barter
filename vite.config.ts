import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.PROJECT_ID': JSON.stringify(env.PROJECT_ID),
      'process.env.APP_ID': JSON.stringify(env.APP_ID),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.AUTH_DOMAIN': JSON.stringify(env.AUTH_DOMAIN),
      'process.env.FIRESTORE_DATABASE_ID': JSON.stringify(env.FIRESTORE_DATABASE_ID),
      'process.env.FIRE_STORE_DATABASE_ID': JSON.stringify(env.FIRE_STORE_DATABASE_ID),
      'process.env.STORAGE_BUCKET': JSON.stringify(env.STORAGE_BUCKET),
      'process.env.MESSAGING_SENDER_ID': JSON.stringify(env.MESSAGING_SENDER_ID),
      'process.env.MEASUREMENT_ID': JSON.stringify(env.MEASUREMENT_ID),
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
