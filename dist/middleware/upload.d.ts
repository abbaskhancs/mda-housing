import multer from 'multer';
import { Request } from 'express';
declare const upload: multer.Multer;
export declare const uploadSingle: (fieldName: string) => (req: Request, res: any, next: any) => void;
export declare const uploadMultiple: (fieldName: string, maxCount?: number) => (req: Request, res: any, next: any) => void;
export declare const uploadFields: (fields: multer.Field[]) => (req: Request, res: any, next: any) => void;
export default upload;
