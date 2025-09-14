"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../config/logger");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createPersonSchema = zod_1.z.object({
    cnic: zod_1.z.string().regex(/^\d{5}-\d{7}-\d{1}$/, 'Invalid CNIC format'),
    name: zod_1.z.string().min(1, 'Name is required'),
    fatherName: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
});
/**
 * POST /api/persons
 * Create or find existing person by CNIC
 */
router.post('/', auth_1.authenticateToken, (0, validation_1.validate)(createPersonSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { cnic, name, fatherName, address, phone, email } = req.body;
    // Check if person already exists
    const existingPerson = await prisma.person.findUnique({
        where: { cnic }
    });
    if (existingPerson) {
        logger_1.logger.info(`Person with CNIC ${cnic} already exists, returning existing record`);
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
    logger_1.logger.info(`New person created: ${person.name} (${person.cnic})`);
    res.status(201).json({
        message: 'Person created successfully',
        person
    });
}));
/**
 * GET /api/persons
 * Get all persons
 */
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.get('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const person = await prisma.person.findUnique({
        where: { id }
    });
    if (!person) {
        throw (0, errorHandler_1.createError)('Person not found', 404, 'PERSON_NOT_FOUND');
    }
    res.json({
        person
    });
}));
exports.default = router;
