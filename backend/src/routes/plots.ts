import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createPlotSchema = z.object({
  plotNumber: z.string().min(1, 'Plot number is required'),
  blockNumber: z.string().optional(),
  sectorNumber: z.string().optional(),
  area: z.number().positive('Area must be positive'),
  location: z.string().optional(),
});

/**
 * POST /api/plots
 * Create or find existing plot by plot number
 */
router.post('/', authenticateToken, validate(createPlotSchema), asyncHandler(async (req: Request, res: Response) => {
  const { plotNumber, blockNumber, sectorNumber, area, location } = req.body;

  // Check if plot already exists
  const existingPlot = await prisma.plot.findUnique({
    where: { plotNumber }
  });

  if (existingPlot) {
    logger.info(`Plot ${plotNumber} already exists, returning existing record`);
    return res.json({
      message: 'Plot already exists',
      plot: existingPlot
    });
  }

  // Create new plot
  const plot = await prisma.plot.create({
    data: {
      plotNumber,
      blockNumber: blockNumber || null,
      sectorNumber: sectorNumber || null,
      area: area,
      location: location || null,
    }
  });

  logger.info(`New plot created: ${plot.plotNumber} (${plot.location})`);

  res.status(201).json({
    message: 'Plot created successfully',
    plot
  });
}));

/**
 * GET /api/plots
 * Get all plots
 */
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const plots = await prisma.plot.findMany({
    orderBy: { plotNumber: 'asc' }
  });

  res.json({
    plots
  });
}));

/**
 * GET /api/plots/:id
 * Get plot by ID
 */
router.get('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const plot = await prisma.plot.findUnique({
    where: { id }
  });

  if (!plot) {
    throw createError('Plot not found', 404, 'PLOT_NOT_FOUND');
  }

  res.json({
    plot
  });
}));

export default router;
