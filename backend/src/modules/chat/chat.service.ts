/**
 * Chat Service
 *
 * Proxies chat requests to the Python GlobeX AI microservice.
 * Falls back to a meaningful error when the service is unavailable.
 */

import { AppError } from '../../middleware/error.middleware';
import type { ChatMessageDto } from './chat.schema';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

// Tool-calling turns (LLM + RAG + trade tools) routinely take tens of seconds,
// so the non-streaming path allows ~30s before falling back to mock mode.
// Override with AGENT_TIMEOUT_MS.
const AGENT_TIMEOUT_MS = Number.parseInt(process.env.AGENT_TIMEOUT_MS || '30000', 10);

export interface ChatResponse {
  session_id: string;
  response: string;
  intent: string;
  tools_used: string[];
  rag_used: boolean;
  tool_results: Record<string, unknown>;
}

export const chatService = {
  /**
   * Send a message to the GlobeX AI agent and return a structured response.
   */
  async chat(dto: ChatMessageDto): Promise<ChatResponse> {
    let res: Response;

    try {
      res = await fetch(`${AGENT_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: dto.session_id ?? null,
          message: dto.message,
        }),
        // Fast-fail into the honest mock fallback if the agent does not answer in time
        signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
      });
      
      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }
      
      return res.json() as Promise<ChatResponse>;
    } catch (err: any) {
      console.warn('AI Agent unavailable, using mock fallback:', err.message);
      
      // Mock fallback response
      return {
        session_id: dto.session_id || 'mock-session-id-' + Date.now(),
        response: `**(Mock Mode)** I couldn't reach the AI service, but I can still help you structure your data!\n\nHere is a mock response to your message: "${dto.message}"\n\nIf this were live, I would look up HS codes, duties, or buyers.`,
        intent: 'general',
        tools_used: ['mock_fallback_tool'],
        rag_used: false,
        tool_results: {},
      };
    }
  },

  /**
   * Returns a readable stream of SSE events from the AI agent.
   * The caller is responsible for piping this to the HTTP response.
   */
  async chatStream(dto: ChatMessageDto): Promise<ReadableStream> {
    let res: Response;

    try {
      res = await fetch(`${AGENT_SERVICE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: dto.session_id ?? null,
          message: dto.message,
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        throw new AppError('The AI streaming agent timed out.', 504);
      }
      throw new AppError(`AI service is unavailable: ${err?.message ?? 'connection refused'}`, 503);
    }

    if (!res.ok) {
      throw new AppError(`AI streaming service returned ${res.status}`, 502);
    }

    if (!res.body) {
      throw new AppError('No response body from AI streaming service', 502);
    }

    return res.body;
  },

  /**
   * Retrieve session history from the Python service.
   */
  async getSessionHistory(sessionId: string): Promise<unknown> {
    const res = await fetch(`${AGENT_SERVICE_URL}/sessions/${sessionId}/history`).catch(() => null);
    if (!res || !res.ok) {
      throw new AppError(`Session not found or AI service unavailable`, 404);
    }
    return res.json();
  },

  /**
   * Delete a session from the Python service.
   */
  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${AGENT_SERVICE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new AppError(`Session not found or AI service unavailable`, 404);
    }
  },
};
