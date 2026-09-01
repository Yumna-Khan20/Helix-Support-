import express from 'express';
import { getTickets, resolveTicket } from '../services/supabase.js';

const router = express.Router();

/**
 * Middleware: Password gate for Admin routes
 */
function requireAdminAuth(req, res, next) {
  const configuredPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = 
    req.headers['x-admin-password'] ||
    req.query.admin_password ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null);

  if (!providedPassword || providedPassword !== configuredPassword) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing admin password.'
    });
  }

  next();
}

/**
 * POST /api/auth/verify
 * Validates admin password for UI login screen.
 */
router.post('/auth/verify', (req, res) => {
  const configuredPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const { password } = req.body;

  if (password === configuredPassword) {
    return res.json({ success: true, message: 'Authentication successful.' });
  }

  return res.status(401).json({ success: false, error: 'Incorrect admin password.' });
});

/**
 * GET /api/tickets
 * Retrieves all tickets from Supabase (ordered by newest first).
 */
router.get('/tickets', requireAdminAuth, async (req, res) => {
  try {
    const tickets = await getTickets();
    return res.json({
      tickets: tickets.map(t => ({
        ...t,
        transcript: typeof t.transcript === 'string' ? JSON.parse(t.transcript || '[]') : t.transcript
      }))
    });
  } catch (error) {
    console.error('⚠️ GET /api/tickets error:', error);
    return res.status(500).json({ error: 'Failed to retrieve tickets.' });
  }
});

/**
 * PATCH /api/tickets/:id/resolve
 * Marks a ticket as 'resolved'.
 */
router.patch('/tickets/:id/resolve', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await resolveTicket(id);

    if (!updated) {
      return res.status(404).json({ error: `Ticket #${id} not found.` });
    }

    return res.json({
      success: true,
      ticket: {
        ...updated,
        transcript: typeof updated.transcript === 'string' ? JSON.parse(updated.transcript || '[]') : updated.transcript
      }
    });
  } catch (error) {
    console.error('⚠️ PATCH /api/tickets/:id/resolve error:', error);
    return res.status(500).json({ error: 'Failed to resolve ticket.' });
  }
});

// Also support POST for environments that restrict PATCH
router.post('/tickets/:id/resolve', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await resolveTicket(id);

    if (!updated) {
      return res.status(404).json({ error: `Ticket #${id} not found.` });
    }

    return res.json({
      success: true,
      ticket: {
        ...updated,
        transcript: typeof updated.transcript === 'string' ? JSON.parse(updated.transcript || '[]') : updated.transcript
      }
    });
  } catch (error) {
    console.error('⚠️ POST /api/tickets/:id/resolve error:', error);
    return res.status(500).json({ error: 'Failed to resolve ticket.' });
  }
});

export default router;
