import { Server } from 'http';
import app from './app';
import { config } from './config';
import { prisma } from './db/prisma';

let server: Server;

async function main() {
  await prisma.$connect();
  server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server listening on http://localhost:${config.port}`);
  });
}

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  if (server) server.close();
});

main();
