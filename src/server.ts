import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { prisma } from './config/prisma';
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from './middleware/errorHandler';
import passport from "./config/passport";
import authRoutes from "./routes/auth.routes";
import leadRoutes from "./routes/leads.routes";
import coachesRoutes from './routes/coaches.routes';
import bookingsRoutes from './routes/bookings.routes';
import paymentsRoutes from './routes/payments.routes';
import webhooksRoutes from './routes/webhooks.routes';
import { startScheduler } from './jobs/scheduler';
import { checkRefundDeadlines } from './jobs/refundDeadlineChecker.job';
import refundsRoutes from './routes/refunds.routes';
import { processScheduledRefunds } from './jobs/refundProcessor.job';
import testimonialsRoutes from './routes/testimonials.routes';
import blogRoutes from './routes/blog.routes';
import adminRoutes from './routes/admin.routes';
import portalRoutes from './routes/portal.routes';
import connectRoutes from './routes/connect.routes';
import withdrawalsRoutes from './routes/withdrawals.routes';
import programsRoutes from './routes/programs.routes';
import ordersRoutes from './routes/orders.routes';




const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);
app.use(passport.initialize());
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/coaches', coachesRoutes);
app.use('/api/bookings', bookingsRoutes);  
app.use('/api', paymentsRoutes);
app.use('/api/webhook', webhooksRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/admin', adminRoutes); // new route for admin endpoints
app.use('/api/portal', portalRoutes); // new route for portal endpoints
app.use('/api/coach/connect', connectRoutes); // new route for coach connect endpoints
app.use('/api/withdrawals', withdrawalsRoutes); // new route for withdrawal endpoints
app.use('/api/programs', programsRoutes);
app.use('/api/orders', ordersRoutes);



app.use(express.json()); // existing line - webhook route above bypasses this correctly

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// temporary — server.ts, for manual testing only
app.post('/debug/run-refund-check', async (_req, res) => {
  await checkRefundDeadlines();
  res.json({ status: 'ok' });
});
app.post('/debug/run-refund-processor', async (_req, res) => {
  await processScheduledRefunds();
  res.json({ status: 'ok' });
});

// all future routes get mounted here, above the error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Rootwell backend running on http://localhost:${PORT}`);
  startScheduler();
});