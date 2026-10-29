import type { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { ChatMessageSchema } from './chat.schema';

export const chatController = {
  /**
   * POST /api/v1/chat
   * Send a message and get a complete AI response.
   */
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ChatMessageSchema.parse(req.body);
      const result = await chatService.chat(dto, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/chat/stream
   * Stream the AI response as Server-Sent Events (SSE).
   */
  async chatStream(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ChatMessageSchema.parse(req.body);
      const stream = await chatService.chatStream(dto, req.user!.userId);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        } finally {
          res.end();
        }
      };

      pump().catch(next);

      // Clean up on client disconnect
      req.on('close', () => reader.cancel());
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/chat/sessions/:sessionId/history
   * Fetch conversation history for a session.
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const data = await chatService.getSessionHistory(sessionId, req.user!.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/chat/sessions/:sessionId
   * Delete a session.
   */
  async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      await chatService.deleteSession(sessionId, req.user!.userId);
      res.json({ success: true, message: `Session ${sessionId} deleted` });
    } catch (err) {
      next(err);
    }
  },
};
