import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { sendError } from '../utils/apiResponse';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, target: ValidationTarget = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      sendError(res, errors[0]?.message || 'Validation failed', 422, errors);
      return;
    }

    req[target] = result.data;
    next();
  };
