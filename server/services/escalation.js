/**
 * Escalation Engine for Helix Support
 * Determines if a user message requires escalating to a support ticket / human agent.
 */

// Phrases/patterns that indicate explicit support or escalation intent
const SUPPORT_INTENT_PATTERNS = [
  // Explicit human / agent request
  /\b(human|agent|manager|supervisor|representative|real person)\b/i,
  /\b(talk to (someone|a human|an agent|a person|support|team))\b/i,
  /\b(speak (to|with) (someone|a human|an agent|a person|support|team|a manager))\b/i,
  /\b(connect me (to|with) (an agent|a human|a person|support|team|a manager))\b/i,
  /\b(transfer me|get me a human)\b/i,
  
  // Explicit support request
  /\b(need|want|get|contact) (customer )?support\b/i,
  /\b(create|open|raise|submit) (a )?ticket\b/i,
  
  // Issue reporting / problems
  /\b(problem with|issue with|trouble with)\b/i,
  /\b(report (an|a) (issue|problem|bug|glitch))\b/i,
  /\b(have (a|an) (problem|issue|bug))\b/i,
  /\b(broken|damaged|defective|arrived broken)\b/i,
  /\b(not working|doesn't work|does not work|stop working|stopped working)\b/i,
  /\b(account (is )?(locked|hacked|suspended|blocked|disabled))\b/i,
  /\b(can't (log in|login|sign in|access my account))\b/i,
  
  // Financial, cancellation, legal dispute triggers
  /\b(want|need|request|demand) (a )?refund\b/i,
  /\b(refund my|money back|give me my money back)\b/i,
  /\b(cancel my (order|subscription|account|membership))\b/i,
  /\b(chargeback|credit card dispute|fraud|scam|lawyer|sue|lawsuit|legal action)\b/i
];

// Conversational / FAQ exceptions that should NEVER trigger escalation
const NON_ESCALATION_EXCEPTIONS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|greetings)[!.]*$/i,
  /^(how are you|how are things|how are you doing|how's it going)[?.]*$/i,
  /^(what can you do|who are you|what is your name|what do you do|help me)[?.]*$/i,
  /^(thank you|thanks|thx|thank you so much|thanks a lot)[!.]*$/i,
  /^(bye|goodbye|see you|have a good day|cya)[!.]*$/i,
  /^(ok|okay|cool|great|awesome|got it|sure|sounds good)[!.]*$/i,
  /^what (is|are) your (return|refund) policy[?.]*$/i,
  /^what (is|are) your (business )?hours[?.]*$/i,
  /^how long does shipping take[?.]*$/i,
  /^do you offer a free trial[?.]*$/i
];

// Negative sentiment and frustration patterns
const FRUSTRATION_PATTERNS = [
  /\b(terrible|horrible|awful|worst|useless|unacceptable|ridiculous|pathetic) (service|support|bot|company)\b/i,
  /\b(waste of time|waste of money|sick of this|fed up|pissed off|furious)\b/i,
  /\b(never buying again|ripoff|rip off)\b/i,
  /\b(answer my question|stop repeating|this is no help|you didn't help)\b/i,
  /!{3,}/, // 3 or more exclamation marks with angry tone
  /^[A-Z\s!?,.]{15,}$/ // All-caps angry shouting (length >= 15)
];

/**
 * Normalizes text for similarity comparison.
 */
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Checks if the current message was asked 2+ times previously by the user in conversation history.
 */
function checkRepeatedQuestion(currentMessage, conversationHistory) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length < 2) {
    return false;
  }

  const currentNormalized = normalizeText(currentMessage);
  if (!currentNormalized || currentNormalized.length < 5) {
    return false;
  }

  // Count past user messages matching this exact query (excluding current message)
  let pastOccurrences = 0;
  for (const item of conversationHistory) {
    const role = item.role || item.sender;
    const text = item.content || item.message || item.text || '';
    if (role === 'user') {
      const pastNormalized = normalizeText(text);
      // Strict equality or very close match
      if (pastNormalized === currentNormalized && pastNormalized.length > 5) {
        pastOccurrences++;
      }
    }
  }

  // If the user already asked this exact same query 2 or more times previously
  return pastOccurrences >= 2;
}

/**
 * Evaluates whether an incoming user message requires escalation to a support ticket.
 * 
 * @param {string} message - Current incoming user message
 * @param {Array} conversationHistory - Prior conversation turns
 * @returns {{ shouldEscalate: boolean, reason: string | null }}
 */
export function checkEscalation(message, conversationHistory = []) {
  if (!message || typeof message !== 'string') {
    return { shouldEscalate: false, reason: null };
  }

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. If message matches standard conversational exceptions, DO NOT escalate
  for (const exc of NON_ESCALATION_EXCEPTIONS) {
    if (exc.test(lower)) {
      return { shouldEscalate: false, reason: null };
    }
  }

  // 2. Check explicit support intent patterns
  for (const pattern of SUPPORT_INTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldEscalate: true,
        reason: `Support request detected: "${trimmed}"`
      };
    }
  }

  // 3. Check customer frustration / negative sentiment
  for (const pattern of FRUSTRATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        shouldEscalate: true,
        reason: 'Customer frustration or negative sentiment detected'
      };
    }
  }

  // 4. Check repeated questions (asked 2+ times previously without resolution)
  if (checkRepeatedQuestion(trimmed, conversationHistory)) {
    return {
      shouldEscalate: true,
      reason: 'Repeated question asked multiple times without resolution'
    };
  }

  return { shouldEscalate: false, reason: null };
}
