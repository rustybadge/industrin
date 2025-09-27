// Netlify serverless function to handle API routes
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Import your server routes
import('./server/index.js').then(({ default: serverApp }) => {
  app.use('/', serverApp);
});

export const handler = app;
