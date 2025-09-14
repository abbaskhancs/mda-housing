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
const createPlotSchema = zod_1.z.object({
    plotNumber: zod_1.z.string().min(1, 'Plot number is required'),
    blockNumber: zod_1.z.string().optional(),
    sectorNumber: zod_1.z.string().optional(),
    area: zod_1.z.number().positive('Area must be positive'),
    location: zod_1.z.string().optional(),
});
/**
 * POST /api/plots
 * Create or find existing plot by plot number
 */
router.post('/', auth_1.authenticateToken, (0, validation_1.validate)(createPlotSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { plotNumber, blockNumber, sectorNumber, area, location } = req.body;
    // Check if plot already exists
    const existingPlot = await prisma.plot.findUnique({
        where: { plotNumber }
    });
    if (existingPlot) {
        logger_1.logger.info(`Plot ${plotNumber} already exists, returning existing record`);
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
    logger_1.logger.info(`New plot created: ${plot.plotNumber} (${plot.location})`);
    res.status(201).json({
        message: 'Plot created successfully',
        plot
    });
}));
/**
 * GET /api/plots
 * Get all plots
 */
router.get('/', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
router.get('/:id', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const plot = await prisma.plot.findUnique({
        where: { id }
    });
    if (!plot) {
        throw (0, errorHandler_1.createError)('Plot not found', 404, 'PLOT_NOT_FOUND');
    }
    res.json({
        plot
    });
}));
exports.default = router;
