/**
 * Discord Webhook Notification Service for Helix Support
 * Posts escalation summaries and ticket alerts to a Discord channel.
 */

/**
 * Sends a rich embed notification to the configured Discord Webhook.
 * 
 * @param {Object} options
 * @param {string} options.ticketId
 * @param {string} options.sessionId
 * @param {string} options.reason
 * @param {Array} options.transcript - Full or recent conversation turns
 * @returns {Promise<boolean>} True if notification sent successfully, false otherwise
 */
export async function sendDiscordEscalation({ ticketId, sessionId, reason, transcript = [] }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.log(`ℹ️ [Discord Notification] Skipped (no valid DISCORD_WEBHOOK_URL set). Ticket: #${ticketId}, Reason: ${reason}`);
    return false;
  }

  try {
    // Format the last 5 messages for the summary field
    const recentMessages = Array.isArray(transcript) ? transcript.slice(-5) : [];
    let transcriptSummary = recentMessages.map((msg, index) => {
      const sender = msg.role === 'user' ? '👤 User' : '🤖 Helix';
      const content = msg.content || msg.text || msg.message || '';
      const trimmed = content.length > 200 ? content.slice(0, 197) + '...' : content;
      return `**${sender}:** ${trimmed}`;
    }).join('\n\n') || '_No prior messages in transcript_';

    // Ensure embed description/field is within Discord limit (1024 chars)
    if (transcriptSummary.length > 1000) {
      transcriptSummary = transcriptSummary.slice(0, 997) + '...';
    }

    const payload = {
      username: 'Helix Support Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png',
      embeds: [
        {
          title: `🚨 Customer Escalation: Ticket #${ticketId}`,
          color: 0xF59E0B, // Helix amber color
          fields: [
            {
              name: '📌 Reason',
              value: reason || 'Escalation triggered',
              inline: true
            },
            {
              name: '🔖 Status',
              value: '`OPEN`',
              inline: true
            },
            {
              name: '🆔 Session ID',
              value: `\`${sessionId || 'anonymous'}\``,
              inline: true
            },
            {
              name: '💬 Recent Transcript (Last 5 Messages)',
              value: transcriptSummary,
              inline: false
            }
          ],
          footer: {
            text: 'Helix Support AI Agent • Action Required'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`⚠️ Discord webhook responded with status ${response.status}: ${errText}`);
      return false;
    }

    console.log(`✅ Discord escalation notification sent for Ticket #${ticketId}`);
    return true;
  } catch (err) {
    console.error('⚠️ Failed to send Discord webhook escalation:', err.message);
    return false;
  }
}
