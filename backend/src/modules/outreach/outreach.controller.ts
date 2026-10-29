import { Request, Response, NextFunction } from 'express';
import { outreachService } from './outreach.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

export const outreachController = {
  generate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const outreach = await outreachService.generate(req.user!.userId, req.body);
      sendCreated(res, outreach, 'Outreach generated');
    } catch (err) { next(err); }
  },

  localize: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const localized = await outreachService.localize(req.user!.userId, req.body);
      sendSuccess(res, localized, 'Outreach localized');
    } catch (err) { next(err); }
  },

  getHistory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = await outreachService.getHistory(req.user!.userId);
      sendSuccess(res, history, 'Outreach history fetched');
    } catch (err) { next(err); }
  },
};
