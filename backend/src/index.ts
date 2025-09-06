import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import workflowRoutes from './routes/workflow';
import pdfRoutes from './routes/pdf';
import documentRoutes from './routes/documents';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Static file serving for storage
app.use('/storage', express.static(path.join(process.cwd(), 'storage')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/documents', documentRoutes);

// API routes placeholder
app.get('/api', (req, res) => {
  res.json({
    message: 'MDA Housing API',
    version: '1.0.0',
    status: 'running'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 MDA Housing API server running on port ${PORT}`);
  logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
