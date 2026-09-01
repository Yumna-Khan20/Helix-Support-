import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load FAQs from kb/faqs.json
let faqs = [];
try {
  const faqsPath = path.join(__dirname, '..', 'kb', 'faqs.json');
  const rawData = fs.readFileSync(faqsPath, 'utf8');
  faqs = JSON.parse(rawData);
} catch (err) {
  console.warn('⚠️ Could not load faqs.json:', err.message);
}

/**
 * Formats the FAQs array into a structured context string for Gemini prompt.
 */
function buildFaqContext() {
  if (!faqs || faqs.length === 0) return 'No FAQs available.';
  return faqs
    .map((item, i) => `[FAQ ${i + 1}]\nQuestion: ${item.question}\nAnswer: ${item.answer}`)
    .join('\n\n');
}

/**
 * Builds the complete system prompt for Gemini with company name and FAQ knowledge base.
 */
function buildSystemInstruction(companyName = 'Helix Support') {
  return `You are Helix, a helpful and warm support assistant for ${companyName}.
- For casual greetings (e.g. "hi", "how are you", "what can you do", "thank you", "bye"), respond naturally, warmly, and politely without creating a ticket.
- For business or product questions, answer accurately using the knowledge base provided below.
- Keep your answers concise, clear, and friendly. Avoid jargon.
- Never invent policy details not found in the knowledge base.

--- KNOWLEDGE BASE ---
${buildFaqContext()}
----------------------`;
}

/**
 * Intent-based conversational responses for common greetings & chit-chat.
 */
function matchConversationalIntent(message) {
  const normalized = (message || '').toLowerCase().trim().replace(/[^\w\s]/g, '');

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|sup|greetings)$/.test(normalized)) {
    return 'Hi! 👋 How can I help you today?';
  }

  // How are you
  if (/^(how are you|how are you doing|how are things|hows it going|how do you do)$/.test(normalized)) {
    return "I'm doing well, thank you! 😊 How can I help you?";
  }

  // Capabilities / Who are you
  if (/^(what can you do|who are you|what is your name|what do you do|help me|can you help)$/.test(normalized)) {
    return "I can help answer your questions, guide you through the website, and connect you with support when needed.";
  }

  // Gratitude
  if (/^(thank you|thanks|thx|thank you so much|thanks a lot|appreciate it)$/.test(normalized)) {
    return "You're welcome! 😊 Let me know if you need anything else.";
  }

  // Goodbyes
  if (/^(bye|goodbye|see you|have a great day|have a good day|cya)$/.test(normalized)) {
    return "Goodbye! Have a great day! 👋";
  }

  // Acknowledgments
  if (/^(ok|okay|cool|great|awesome|got it|sure|sounds good)$/.test(normalized)) {
    return "Glad to help! Feel free to ask if you have any other questions.";
  }

  return null;
}

/**
 * Local FAQ matcher if Gemini API key is not configured or offline.
 */
function matchFaqLocally(userMessage) {
  if (!userMessage) return null;
  const lower = userMessage.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = lower.split(/\s+/).filter(w => w.length > 3);

  let bestMatch = null;
  let highestScore = 0;

  for (const faq of faqs) {
    const qLower = faq.question.toLowerCase().replace(/[^\w\s]/g, ' ');
    const qWords = qLower.split(/\s+/).filter(w => w.length > 3);

    // Exact or substring match
    if (lower.includes(qLower) || qLower.includes(lower)) {
      return faq.answer;
    }

    // Keyword overlap scoring
    let score = 0;
    for (const w of words) {
      if (qWords.includes(w)) {
        score += 2;
      }
    }

    if (score > highestScore && score >= 2) {
      highestScore = score;
      bestMatch = faq.answer;
    }
  }

  return bestMatch;
}

/**
 * Generates an intelligent assistant reply via Google Gemini API (or local intent engine).
 * 
 * @param {Object} options
 * @param {string} options.message - Current user query
 * @param {Array} options.conversationHistory - Prior turns
 * @param {string} [options.companyName='Helix Support']
 * @returns {Promise<string>} Assistant response
 */
export async function generateGeminiReply({ message, conversationHistory = [], companyName = 'Helix Support' }) {
  const trimmed = (message || '').trim();

  // 1. Fast path: check conversational intents (greetings, how are you, what can you do, etc.)
  const conversational = matchConversationalIntent(trimmed);
  if (conversational) {
    return conversational;
  }

  // 2. Fast path: check local FAQ match if exact match exists
  const exactFaq = matchFaqLocally(trimmed);

  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API key configured, use local FAQ matcher or helpful guidance
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    if (exactFaq) {
      return exactFaq;
    }
    return "I'm here to help! You can ask me about our business hours, pricing, shipping, accounts, returns, or free trial. If you need dedicated assistance, just let me know and I'll connect you with our team.";
  }

  // 3. Call Google Gemini API
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: buildSystemInstruction(companyName)
    });

    // Format clean conversation history for Gemini (excluding current message)
    const contents = [];
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory) {
        const role = (turn.role === 'user' || turn.sender === 'user') ? 'user' : 'model';
        const text = turn.content || turn.message || turn.text || '';
        if (text.trim()) {
          contents.push({
            role: role,
            parts: [{ text: text }]
          });
        }
      }
    }

    // Append current message
    contents.push({
      role: 'user',
      parts: [{ text: trimmed }]
    });

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const replyText = response.text();

    return replyText.trim() || exactFaq || "How can I assist you with our services today?";
  } catch (err) {
    console.error('⚠️ Gemini API error:', err.message);

    if (exactFaq) {
      return exactFaq;
    }

    return "I'm here to help! Feel free to ask about our hours, shipping, pricing, or let me know if you need to speak with our support team.";
  }
}
