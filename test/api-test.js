/**
 * Automated Verification Suite for Helix Support API
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`\n🧪 Starting Helix Support API Verification against ${BASE_URL}...\n`);
  let passed = 0;
  let failed = 0;

  async function assert(testName, testFn) {
    try {
      await testFn();
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${testName}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Check
  await assert('GET /api/health responds with status healthy', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error(`Expected healthy, got ${data.status}`);
  });

  // 2. Static File: widget.js
  await assert('GET /widget.js serves JavaScript with Helix code', async () => {
    const res = await fetch(`${BASE_URL}/widget.js`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes('helix-widget-container')) throw new Error('widget.js does not contain expected code');
  });

  // 3. Static File: demo.html
  await assert('GET /demo.html serves Demo HTML', async () => {
    const res = await fetch(`${BASE_URL}/demo.html`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes('Helix Support')) throw new Error('demo.html does not contain title');
  });

  // 4. Conversational Test 1: "Hi" -> No ticket, warm greeting
  await assert('POST /api/chat ("Hi") does NOT create a ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hi', session_id: 'test_conv_1', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== false) throw new Error(`Expected escalated: false, got ${data.escalated}`);
    if (data.ticket_id) throw new Error(`Unexpected ticket_id: ${data.ticket_id}`);
    if (!data.reply.toLowerCase().includes('hi') && !data.reply.toLowerCase().includes('help')) {
      throw new Error(`Unexpected reply: ${data.reply}`);
    }
  });

  // 5. Conversational Test 2: "How are you?" -> No ticket, conversational response
  await assert('POST /api/chat ("How are you?") does NOT create a ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How are you?', session_id: 'test_conv_2', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== false) throw new Error(`Expected escalated: false, got ${data.escalated}`);
    if (data.ticket_id) throw new Error(`Unexpected ticket_id: ${data.ticket_id}`);
    if (!data.reply.toLowerCase().includes('well') && !data.reply.toLowerCase().includes('thank')) {
      throw new Error(`Unexpected reply: ${data.reply}`);
    }
  });

  // 6. Conversational Test 3: "What can you do?" -> No ticket, explains capabilities
  await assert('POST /api/chat ("What can you do?") does NOT create a ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What can you do?', session_id: 'test_conv_3', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== false) throw new Error(`Expected escalated: false, got ${data.escalated}`);
    if (data.ticket_id) throw new Error(`Unexpected ticket_id: ${data.ticket_id}`);
    if (!data.reply.toLowerCase().includes('help') && !data.reply.toLowerCase().includes('answer')) {
      throw new Error(`Unexpected reply: ${data.reply}`);
    }
  });

  // 7. Conversational Test 4: "Thank you" -> No ticket, polite response
  await assert('POST /api/chat ("Thank you") does NOT create a ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Thank you', session_id: 'test_conv_4', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== false) throw new Error(`Expected escalated: false, got ${data.escalated}`);
    if (data.ticket_id) throw new Error(`Unexpected ticket_id: ${data.ticket_id}`);
    if (!data.reply.toLowerCase().includes('welcome')) {
      throw new Error(`Unexpected reply: ${data.reply}`);
    }
  });

  // 8. Support Test 1: "I have a problem with my account" -> Creates support ticket
  await assert('POST /api/chat ("I have a problem with my account") creates a support ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I have a problem with my account', session_id: 'test_supp_1', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== true) throw new Error(`Expected escalated: true, got ${data.escalated}`);
    if (!data.ticket_id) throw new Error('Missing ticket_id');
    if (!data.reply.includes(data.ticket_id)) throw new Error('Reply does not reference ticket ID');
  });

  // 9. Support Test 2: "I need customer support" -> Creates support ticket
  await assert('POST /api/chat ("I need customer support") creates a support ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I need customer support', session_id: 'test_supp_2', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== true) throw new Error(`Expected escalated: true, got ${data.escalated}`);
    if (!data.ticket_id) throw new Error('Missing ticket_id');
  });

  // 10. Support Test 3: "Please connect me with an agent" -> Creates support ticket
  await assert('POST /api/chat ("Please connect me with an agent") creates a support ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Please connect me with an agent', session_id: 'test_supp_3', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== true) throw new Error(`Expected escalated: true, got ${data.escalated}`);
    if (!data.ticket_id) throw new Error('Missing ticket_id');
  });

  // 11. Support Test 4: "I want to report an issue" -> Creates support ticket
  let issueTicketId = null;
  await assert('POST /api/chat ("I want to report an issue") creates a support ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I want to report an issue', session_id: 'test_supp_4', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== true) throw new Error(`Expected escalated: true, got ${data.escalated}`);
    if (!data.ticket_id) throw new Error('Missing ticket_id');
    issueTicketId = data.ticket_id;
  });

  // 12. FAQ Inquiry: Business Hours
  await assert('POST /api/chat ("What are your business hours?") returns FAQ answer without ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What are your business hours?', session_id: 'test_faq_1', conversation_history: [] })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.escalated !== false) throw new Error(`Expected escalated: false, got ${data.escalated}`);
    if (!data.reply.toLowerCase().includes('monday to saturday')) {
      throw new Error(`Unexpected reply: ${data.reply}`);
    }
  });

  // 13. Admin Auth Check
  await assert('POST /api/auth/verify checks password correctly', async () => {
    const wrong = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' })
    });
    if (wrong.status !== 401) throw new Error('Expected 401 for bad password');

    const correct = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin123' })
    });
    if (!correct.ok) throw new Error('Expected 200 for correct password');
  });

  // 14. Admin List Tickets
  await assert('GET /api/tickets lists created tickets with admin auth', async () => {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { 'x-admin-password': 'admin123' }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.tickets) || data.tickets.length === 0) {
      throw new Error('Expected at least 1 ticket in the list');
    }
  });

  // 15. Mark Ticket Resolved
  if (issueTicketId) {
    await assert(`PATCH /api/tickets/${issueTicketId}/resolve marks ticket resolved`, async () => {
      const res = await fetch(`${BASE_URL}/api/tickets/${issueTicketId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': 'admin123'
        }
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      if (!data.ticket || data.ticket.status !== 'resolved') {
        throw new Error(`Expected ticket status to be 'resolved', got ${data.ticket?.status}`);
      }
    });
  }

  console.log(`\n=============================================`);
  console.log(`🏁 Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`=============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
