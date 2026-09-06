import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import httpStatus from 'http-status';
import { config } from './config';
import { routes } from './routes';
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { notFound } from './middlewares/notFound';
import { globalRateLimiter } from './middlewares/rateLimiter';

const app: Application = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (config.env === 'development') {
  app.use(morgan('dev'));
}
app.use(globalRateLimiter);

app.get('/', (_req, res) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Developer Assessment & Coding Platform API is running',
    data: { version: config.apiVersion },
  });
});

app.use(`/api/${config.apiVersion}`, routes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
