import './instrument.js';
import * as Sentry from '@sentry/node';
import app, { validateAppStartup } from './app.js';

const DEFAULT_PORT = 3000;
const hasExplicitPort = process.env.PORT != null;
const PORT = hasExplicitPort ? Number(process.env.PORT) : DEFAULT_PORT;
const HOST = process.env.HOST ?? '0.0.0.0';

validateAppStartup();

async function startServer(): Promise<void> {
  let port = PORT;

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.listen(port, HOST, () => {
          const address = server.address();
          const boundPort = typeof address === 'object' && address ? address.port : port;

          console.log(`Server running at http://${HOST}:${boundPort}`);
          resolve();
        });

        server.once('error', reject);
      });

      return;
    } catch (error) {
      if (!hasExplicitPort && (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, retrying on ${port + 1}`);
        port += 1;
        continue;
      }

      Sentry.captureException(error);
      await Sentry.flush(2000);
      console.error('Failed to start server', error);
      process.exit(1);
    }
  }
}

void startServer();
