import { createClient } from '@supabase/supabase-js';

// In-memory fallback cache when Supabase credentials are not provided
const inMemoryTickets = [];

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Supabase client. Operating in in-memory fallback mode:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not found or placeholder used. Tickets will be stored in in-memory fallback store.');
}

/**
 * Generates a clean human-readable ticket ID (e.g., HLX-8492)
 */
export function generateTicketId() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `HLX-${randomNum}`;
}

/**
 * Saves a new ticket to Supabase (or fallback in-memory store)
 * 
 * @param {Object} ticketData
 * @param {string} ticketData.id
 * @param {string} ticketData.session_id
 * @param {Array|string} ticketData.transcript
 * @param {string} ticketData.reason
 * @param {string} [ticketData.status='open']
 * @param {string} [ticketData.created_at]
 * @returns {Promise<Object>} The saved ticket
 */
export async function createTicket(ticketData) {
  const ticket = {
    id: ticketData.id || generateTicketId(),
    session_id: ticketData.session_id || 'anonymous',
    transcript: typeof ticketData.transcript === 'string' 
      ? ticketData.transcript 
      : JSON.stringify(ticketData.transcript || []),
    reason: ticketData.reason || 'Escalation triggered',
    status: ticketData.status || 'open',
    created_at: ticketData.created_at || new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticket])
        .select()
        .single();

      if (error) {
        console.error('⚠️ Supabase insert error, falling back to memory:', error.message);
        inMemoryTickets.unshift(ticket);
        return ticket;
      }
      return data;
    } catch (err) {
      console.error('⚠️ Supabase connection exception:', err.message);
      inMemoryTickets.unshift(ticket);
      return ticket;
    }
  }

  // Fallback in-memory
  inMemoryTickets.unshift(ticket);
  return ticket;
}

/**
 * Retrieves all tickets ordered by creation date descending
 * 
 * @returns {Promise<Array>} List of tickets
 */
export async function getTickets() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('⚠️ Supabase fetch error, returning memory store:', error.message);
        return inMemoryTickets;
      }
      return data;
    } catch (err) {
      console.error('⚠️ Supabase query exception:', err.message);
      return inMemoryTickets;
    }
  }

  return inMemoryTickets;
}

/**
 * Marks a ticket as 'resolved' by ID
 * 
 * @param {string} id - Ticket ID
 * @returns {Promise<Object|null>} The updated ticket or null if not found
 */
export async function resolveTicket(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status: 'resolved' })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('⚠️ Supabase resolve exception:', err.message);
    }
  }

  // Update in in-memory fallback
  const index = inMemoryTickets.findIndex(t => t.id === id);
  if (index !== -1) {
    inMemoryTickets[index].status = 'resolved';
    return inMemoryTickets[index];
  }

  return null;
}
