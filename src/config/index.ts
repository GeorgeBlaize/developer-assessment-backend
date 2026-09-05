import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },

  sslcommerz: {
    storeId: process.env.SSLCZ_STORE_ID || '',
    storePassword: process.env.SSLCZ_STORE_PASSWORD || '',
    isLive: process.env.SSLCZ_IS_LIVE === 'true',
    successUrl: process.env.SSLCZ_SUCCESS_URL || '',
    failUrl: process.env.SSLCZ_FAIL_URL || '',
    cancelUrl: process.env.SSLCZ_CANCEL_URL || '',
    ipnUrl: process.env.SSLCZ_IPN_URL || '',
  },

  seed: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@codeassess.dev',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
};
