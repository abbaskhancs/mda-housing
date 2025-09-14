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
const createPersonSchema = z.object({
  cnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format'),
  name: z.string().min(1, 'Name is required'),
  fatherName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

/**
 * POST /api/persons
 * Create or find existing person by CNIC
 */
router.post('/', authenticateToken, validate(createPersonSchema), asyncHandler(async (req: Request, res: Response) => {
  const { cnic, name, fatherName, address, phone, email } = req.body;

  // Check if person already exists
  const existingPerson = await prisma.person.findUnique({
    where: { cnic }
  });

  if (existingPerson) {
    logger.info(`Person with CNIC ${cnic} already exists, returning existing record`);
    return res.json({
      message: 'Person already exists',
      person: existingPerson
    });
  }

  // Create new person
  const person = await prisma.person.create({
    data: {
      cnic,
      name,
      fatherName: fatherName || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
    }
  });

  logger.info(`New person created: ${person.name} (${person.cnic})`);

  res.status(201).json({
    message: 'Person created successfully',
    person
  });
}));

/**
 * GET /api/persons
 * Get all persons
 */
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const persons = await prisma.person.findMany({
    orderBy: { name: 'asc' }
  });

  res.json({
    persons
  });
}));

/**
 * GET /api/persons/:id
 * Get person by ID
 */
router.get('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const person = await prisma.person.findUnique({
    where: { id }
  });

  if (!person) {
    throw createError('Person not found', 404, 'PERSON_NOT_FOUND');
  }

  res.json({
    person
  });
}));

export default router;
