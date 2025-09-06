import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                email: string;
                role: string;
                isActive: boolean;
            };
        }
    }
}
export interface JWTPayload {
    userId: string;
    username: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
/**
 * JWT Authentication Middleware
 * Validates JWT token and attaches user info to request
 */
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
