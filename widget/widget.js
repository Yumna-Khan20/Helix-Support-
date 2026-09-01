/**
 * Helix Support — Embeddable Website Chat Widget
 * 
 * HOW TO EMBED ON YOUR WEBSITE:
 * Add this single script tag right before the closing </body> tag:
 * 
 *   <script 
 *     src="https://your-domain.com/widget.js" 
 *     data-company="Acme Corp" 
 *     data-endpoint="https://your-domain.com/api/chat">
 *   </script>
 * 
 * CONFIGURATION ATTRIBUTES:
 * - data-company:  The name of your business displayed in the header (default: "Helix Support")
 * - data-endpoint: The backend API endpoint URL (default: "/api/chat" or relative to host)
 * - data-greeting: Optional custom greeting message
 */

(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__HELIX_SUPPORT_LOADED__) return;
  window.__HELIX_SUPPORT_LOADED__ = true;

  // Extract config from current script tag attributes or global object
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const config = {
    companyName: (currentScript && currentScript.getAttribute('data-company')) || 
                 (window.HelixConfig && window.HelixConfig.company) || 
                 'Helix Support',
    apiEndpoint: (currentScript && currentScript.getAttribute('data-endpoint')) || 
                 (window.HelixConfig && window.HelixConfig.endpoint) || 
                 '/api/chat',
    greeting: (currentScript && currentScript.getAttribute('data-greeting')) || 
              (window.HelixConfig && window.HelixConfig.greeting) || 
              'Hi there! 👋 How can I help you today?'
  };

  // Session Storage Keys
  const STORAGE_KEY_SESSION_ID = 'helix_session_id';
  const STORAGE_KEY_HISTORY = 'helix_chat_history';
  const STORAGE_KEY_TICKET = 'helix_active_ticket';

  // Get or initialize persistent session ID
  let sessionId = sessionStorage.getItem(STORAGE_KEY_SESSION_ID);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    sessionStorage.setItem(STORAGE_KEY_SESSION_ID, sessionId);
  }

  // Load chat history from sessionStorage
  let conversationHistory = [];
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) conversationHistory = JSON.parse(saved);
  } catch (e) {
    conversationHistory = [];
  }

  // Active ticket if previously escalated
  let activeTicketId = sessionStorage.getItem(STORAGE_KEY_TICKET) || null;
  let isOpen = false;
  let isAwaitingReply = false;

  // CSS Styles
  const styles = `
    /* Font import */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #helix-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }

    #helix-widget-container * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Floating Bubble Button */
    .helix-trigger-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #4F46E5;
      color: #FFFFFF;
      border: none;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.35);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      outline: none;
      position: relative;
    }

    .helix-trigger-btn:hover {
      transform: scale(1.06);
      box-shadow: 0 10px 28px rgba(79, 70, 229, 0.45);
    }

    .helix-trigger-btn:active {
      transform: scale(0.96);
    }

    /* Subtle pulse animation on first load */
    .helix-pulse {
      animation: helix-pulse-anim 2.5s infinite;
    }

    @keyframes helix-pulse-anim {
      0% {
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.6);
      }
      70% {
        box-shadow: 0 0 0 16px rgba(79, 70, 229, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
      }
    }

    .helix-icon {
      width: 28px;
      height: 28px;
      transition: transform 0.2s ease;
    }

    .helix-close-icon {
      display: none;
      width: 24px;
      height: 24px;
    }

    /* Main Chat Window */
    .helix-chat-window {
      position: absolute;
      bottom: 74px;
      right: 0;
      width: 380px;
      height: 560px;
      max-height: calc(100vh - 100px);
      background-color: #F9FAFB;
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16), 0 4px 12px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      opacity: 0;
      visibility: hidden;
      transform: translateY(16px) scale(0.96);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .helix-chat-window.helix-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    /* Header */
    .helix-header {
      background-color: #4F46E5;
      color: #FFFFFF;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .helix-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .helix-avatar-main {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background-color: #FFFFFF;
      color: #4F46E5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }

    .helix-title-box h3 {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
    }

    .helix-title-box p {
      font-size: 12px;
      opacity: 0.85;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .helix-status-dot {
      width: 7px;
      height: 7px;
      background-color: #10B981;
      border-radius: 50%;
      display: inline-block;
    }

    .helix-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .helix-header-btn {
      background: transparent;
      border: none;
      color: #FFFFFF;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
      transition: opacity 0.15s, background 0.15s;
    }

    .helix-header-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.15);
    }

    /* Ticket Status Banner */
    .helix-banner {
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 500;
      display: none;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid transparent;
      animation: helix-slide-down 0.25s ease-out;
    }

    @keyframes helix-slide-down {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .helix-banner.amber {
      background-color: #FEF3C7;
      color: #92400E;
      border-color: #FCD34D;
      display: flex;
    }

    .helix-banner.teal {
      background-color: #CCFBF1;
      color: #0F766E;
      border-color: #99F6E4;
      display: flex;
    }

    /* Messages Content Area */
    .helix-messages {
      flex: 1;
      padding: 18px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #F9FAFB;
    }

    .helix-msg-row {
      display: flex;
      gap: 8px;
      max-width: 88%;
      animation: helix-fade-in 0.2s ease-out;
    }

    @keyframes helix-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .helix-msg-row.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    .helix-msg-row.bot {
      align-self: flex-start;
    }

    .helix-bot-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #4F46E5;
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 4px;
    }

    .helix-bubble {
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
    }

    .helix-msg-row.user .helix-bubble {
      background-color: #4F46E5;
      color: #FFFFFF;
      border-bottom-right-radius: 2px;
    }

    .helix-msg-row.bot .helix-bubble {
      background-color: #E5E7EB;
      color: #111827;
      border-bottom-left-radius: 2px;
    }

    /* Typing Indicator */
    .helix-typing-indicator {
      display: none;
      align-items: center;
      gap: 4px;
      background-color: #E5E7EB;
      padding: 10px 14px;
      border-radius: 8px;
      width: fit-content;
      margin-left: 34px;
      border-bottom-left-radius: 2px;
    }

    .helix-typing-indicator.active {
      display: flex;
    }

    .helix-dot {
      width: 6px;
      height: 6px;
      background-color: #6B7280;
      border-radius: 50%;
      animation: helix-bounce 1.4s infinite ease-in-out both;
    }

    .helix-dot:nth-child(1) { animation-delay: -0.32s; }
    .helix-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes helix-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Footer & Input */
    .helix-footer {
      background-color: #FFFFFF;
      border-top: 1px solid #E5E7EB;
      padding: 12px 14px;
    }

    .helix-input-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #F9FAFB;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      padding: 4px 6px 4px 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .helix-input-form:focus-within {
      border-color: #4F46E5;
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
      background-color: #FFFFFF;
    }

    .helix-input-field {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 13.5px;
      color: #111827;
      padding: 8px 0;
    }

    .helix-input-field::placeholder {
      color: #9CA3AF;
    }

    .helix-send-btn {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      background-color: #4F46E5;
      color: #FFFFFF;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, opacity 0.15s;
      flex-shrink: 0;
    }

    .helix-send-btn:disabled {
      background-color: #9CA3AF;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .helix-send-btn:not(:disabled):hover {
      background-color: #4338CA;
    }

    /* Responsive Fullscreen on Mobile */
    @media (max-width: 480px) {
      #helix-widget-container {
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
        pointer-events: none;
      }

      .helix-trigger-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        pointer-events: auto;
      }

      .helix-chat-window {
        position: fixed;
        bottom: 0;
        right: 0;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        border: none;
        pointer-events: auto;
      }
    }
  `;

  // HTML Structure
  const widgetHtml = `
    <div id="helix-widget-container">
      <!-- Chat Trigger Button -->
      <button class="helix-trigger-btn helix-pulse" id="helixTriggerBtn" aria-label="Open support chat">
        <svg class="helix-icon helix-chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <svg class="helix-icon helix-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Chat Window -->
      <div class="helix-chat-window" id="helixChatWindow">
        <!-- Header -->
        <div class="helix-header">
          <div class="helix-header-left">
            <div class="helix-avatar-main">${config.companyName.charAt(0).toUpperCase()}</div>
            <div class="helix-title-box">
              <h3>${escapeHtml(config.companyName)}</h3>
              <p><span class="helix-status-dot"></span> We typically reply in a few minutes</p>
            </div>
          </div>
          <div class="helix-header-actions">
            <button class="helix-header-btn" id="helixMinimizeBtn" title="Minimize" aria-label="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button class="helix-header-btn" id="helixCloseBtn" title="Close" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Notification Banner (Escalation / Resolved) -->
        <div class="helix-banner" id="helixBanner">
          <span id="helixBannerText"></span>
        </div>

        <!-- Messages Area -->
        <div class="helix-messages" id="helixMessages"></div>

        <!-- Typing Indicator -->
        <div class="helix-typing-indicator" id="helixTypingIndicator">
          <div class="helix-dot"></div>
          <div class="helix-dot"></div>
          <div class="helix-dot"></div>
        </div>

        <!-- Input Area -->
        <div class="helix-footer">
          <form class="helix-input-form" id="helixInputForm">
            <input 
              type="text" 
              class="helix-input-field" 
              id="helixInputField" 
              placeholder="Type your message..." 
              autocomplete="off"
            />
            <button type="submit" class="helix-send-btn" id="helixSendBtn" aria-label="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Save conversation state to sessionStorage
  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(conversationHistory));
      if (activeTicketId) {
        sessionStorage.setItem(STORAGE_KEY_TICKET, activeTicketId);
      }
    } catch (e) {
      console.warn('Helix Support: sessionStorage save failed', e);
    }
  }

  // Inject Styles and HTML
  function initWidget() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    const containerEl = document.createElement('div');
    containerEl.innerHTML = widgetHtml;
    document.body.appendChild(containerEl);

    bindEvents();
    renderExistingMessages();
  }

  // Render initial history or default greeting
  function renderExistingMessages() {
    const messagesContainer = document.getElementById('helixMessages');
    messagesContainer.innerHTML = '';

    if (conversationHistory.length === 0) {
      // Add initial greeting
      addMessageToUI('bot', config.greeting, false);
      conversationHistory.push({ role: 'assistant', content: config.greeting });
      saveState();
    } else {
      // Replay saved history
      conversationHistory.forEach(msg => {
        const role = (msg.role === 'user' || msg.sender === 'user') ? 'user' : 'bot';
        addMessageToUI(role, msg.content || msg.message || '', false);
      });
    }

    if (activeTicketId) {
      showBanner(`Ticket #${activeTicketId} created — team notified.`, 'amber');
    }

    scrollToBottom();
  }

  // Toggle chat window open/closed
  function toggleWidget(forceState) {
    const chatWindow = document.getElementById('helixChatWindow');
    const triggerBtn = document.getElementById('helixTriggerBtn');
    const chatIcon = triggerBtn.querySelector('.helix-chat-icon');
    const closeIcon = triggerBtn.querySelector('.helix-close-icon');

    isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

    if (isOpen) {
      chatWindow.classList.add('helix-visible');
      triggerBtn.classList.remove('helix-pulse');
      chatIcon.style.display = 'none';
      closeIcon.style.display = 'block';
      setTimeout(() => {
        document.getElementById('helixInputField').focus();
        scrollToBottom();
      }, 150);
    } else {
      chatWindow.classList.remove('helix-visible');
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    }
  }

  // Add a message bubble to the UI
  function addMessageToUI(role, text, shouldScroll = true) {
    const messagesContainer = document.getElementById('helixMessages');
    const row = document.createElement('div');
    row.className = `helix-msg-row ${role}`;

    let avatarHtml = '';
    if (role === 'bot') {
      avatarHtml = `<div class="helix-bot-avatar">H</div>`;
    }

    row.innerHTML = `
      ${avatarHtml}
      <div class="helix-bubble">${escapeHtml(text)}</div>
    `;

    messagesContainer.appendChild(row);

    if (shouldScroll) {
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById('helixMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function setTyping(isTyping) {
    const typingIndicator = document.getElementById('helixTypingIndicator');
    const inputField = document.getElementById('helixInputField');
    const sendBtn = document.getElementById('helixSendBtn');

    isAwaitingReply = isTyping;
    inputField.disabled = isTyping;
    sendBtn.disabled = isTyping;

    if (isTyping) {
      typingIndicator.classList.add('active');
      scrollToBottom();
    } else {
      typingIndicator.classList.remove('active');
      inputField.focus();
    }
  }

  function showBanner(text, type = 'amber') {
    const banner = document.getElementById('helixBanner');
    const bannerText = document.getElementById('helixBannerText');
    banner.className = `helix-banner ${type}`;
    bannerText.textContent = text;
  }

  // Send message to backend
  async function sendMessage(text) {
    if (!text || !text.trim() || isAwaitingReply) return;
    const cleanText = text.trim();

    // Capture prior history before adding new user turn
    const priorHistory = [...conversationHistory];

    // 1. Add user message to UI & history
    addMessageToUI('user', cleanText);
    conversationHistory.push({ role: 'user', content: cleanText });
    saveState();

    // Clear input
    document.getElementById('helixInputField').value = '';

    // 2. Set typing indicator
    setTyping(true);

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: cleanText,
          session_id: sessionId,
          conversation_history: priorHistory,
          company_name: config.companyName
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setTyping(false);

      // Handle escalation ticket banner
      if (data.escalated && data.ticket_id) {
        activeTicketId = data.ticket_id;
        showBanner(`Ticket #${data.ticket_id} created`, 'amber');
        sessionStorage.setItem(STORAGE_KEY_TICKET, data.ticket_id);
      }

      // Add bot reply to UI & history
      const reply = data.reply || "I've received your request and our team will review it.";
      addMessageToUI('bot', reply);
      conversationHistory.push({ role: 'assistant', content: reply });
      saveState();

    } catch (err) {
      console.error('Helix Support API Error:', err);
      setTyping(false);
      const errMsg = "Sorry, I'm having trouble responding right now. Please try again or contact support.";
      addMessageToUI('bot', errMsg);
      conversationHistory.push({ role: 'assistant', content: errMsg });
      saveState();
    }
  }

  // Bind Event Listeners
  function bindEvents() {
    const triggerBtn = document.getElementById('helixTriggerBtn');
    const closeBtn = document.getElementById('helixCloseBtn');
    const minimizeBtn = document.getElementById('helixMinimizeBtn');
    const inputForm = document.getElementById('helixInputForm');
    const inputField = document.getElementById('helixInputField');

    triggerBtn.addEventListener('click', () => toggleWidget());
    closeBtn.addEventListener('click', () => toggleWidget(false));
    minimizeBtn.addEventListener('click', () => toggleWidget(false));

    inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(inputField.value);
    });

    // Enter key sends, Shift+Enter allowed if multiline
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputField.value);
      }
    });
  }

  // Public JavaScript API
  window.Helix = {
    open: () => toggleWidget(true),
    close: () => toggleWidget(false),
    toggle: () => toggleWidget(),
    sendMessage: (text) => sendMessage(text),
    setBanner: (text, type) => showBanner(text, type),
    clearHistory: () => {
      conversationHistory = [];
      activeTicketId = null;
      sessionStorage.removeItem(STORAGE_KEY_HISTORY);
      sessionStorage.removeItem(STORAGE_KEY_TICKET);
      renderExistingMessages();
    }
  };

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();
