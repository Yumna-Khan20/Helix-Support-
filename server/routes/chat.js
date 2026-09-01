import express from 'express';
import { checkEscalation } from '../services/escalation.js';
import { generateGeminiReply } from '../services/gemini.js';
import { createTicket, generateTicketId } from '../services/supabase.js';
import { sendDiscordEscalation } from '../services/discord.js';

const router = express.Router();

/**
 * POST /api/chat
 * Main chat endpoint for the Helix Support chatbot widget.
 * 
 * Body:
 * {
 *   message: string,
 *   session_id: string,
 *   conversation_history: Array<{ role: string, content: string }>,
 *   company_name?: string
 * }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, session_id = 'anon_' + Date.now(), conversation_history = [], company_name = 'Helix Support' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const trimmedMessage = message.trim();

    // Sanitize conversation history to only contain valid prior turns
    const cleanHistory = Array.isArray(conversation_history)
      ? conversation_history.filter(item => item && (item.content || item.text || item.message))
      : [];

    // 1. Evaluate whether the message requires customer support ticket escalation
    const escalationCheck = checkEscalation(trimmedMessage, cleanHistory);

    if (escalationCheck.shouldEscalate) {
      // Generate a unique ticket ID only when escalation is actually triggered
      const ticketId = generateTicketId();

      const botReply = `I've created support ticket #${ticketId} and forwarded it to our team. They'll follow up shortly.`;

      // Build complete transcript for the ticket
      const fullTranscript = [
        ...cleanHistory,
        { role: 'user', content: trimmedMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: botReply, timestamp: new Date().toISOString() }
      ];

      // Persist ticket in Supabase
      const ticket = await createTicket({
        id: ticketId,
        session_id,
        transcript: fullTranscript,
        reason: escalationCheck.reason,
        status: 'open',
        created_at: new Date().toISOString()
      });

      // Send Discord notification in background
      sendDiscordEscalation({
        ticketId: ticket.id,
        sessionId: session_id,
        reason: escalationCheck.reason,
        transcript: fullTranscript
      }).catch(err => console.error('Discord webhook alert failed:', err));

      return res.json({
        reply: botReply,
        escalated: true,
        ticket_id: ticket.id,
        reason: escalationCheck.reason
      });
    }

    // 2. Normal conversational message or FAQ question -> Answer naturally without creating a ticket
    const aiReply = await generateGeminiReply({
      message: trimmedMessage,
      conversationHistory: cleanHistory,
      companyName: company_name
    });

    return res.json({
      reply: aiReply,
      escalated: false
    });

  } catch (error) {
    console.error('⚠️ /api/chat error:', error);
    return res.status(500).json({
      error: 'An internal error occurred while processing your request.',
      reply: "Sorry, I'm having trouble responding right now. Please try again or contact support.",
      escalated: false
    });
  }
});

export default router;
