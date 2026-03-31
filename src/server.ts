import './instrument.js';
import * as Sentry from '@sentry/node';
import app from './app.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

server.on('error', async (error) => {
  Sentry.captureException(error);
  await Sentry.flush(2000);
  console.error('Failed to start server', error);
  process.exit(1);
});
