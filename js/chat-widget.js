/**
 * TECHGURU AI Chat Widget
 * Production-ready implementation
 * Fixes applied:
 *  1. System prompt injected into every API call
 *  2. Full conversation history maintained per session
 *  3. File upload UI removed / disabled safely
 *  4. Voice button removed / disabled safely
 *  5. Typing delay set to 1.5–2.5s (natural feel)
 *  6. Lead capture (name → email) built into conversation flow
 *  7. aria-modal focus trap only active while window is open
 *  8. Floating CTAs have safe JS-driven show/hide
 *  9. Char count wired to live input event
 * 10. openBookingModal / closeBookingModal defined here (no defer race)
 * 11. Suggestion chips remain available after first message
 * 12. autocomplete="off" enforced via JS on chat input
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     CONFIG
  ───────────────────────────────────────────── */
  const CONFIG = {
    // Chat goes through our own backend proxy (workers/src/chat.js),
    // which holds the Groq key server-side. Never call an LLM API
    // directly from the browser.
    API_ENDPOINT: "/api/chat",
    LEAD_ENDPOINT: "/api/contact",
    TYPING_DELAY_MIN: 1500,
    TYPING_DELAY_MAX: 2500,
    MAX_HISTORY: 20,        // max message pairs kept in memory
    CHAR_LIMIT: 500,
    LEAD_CAPTURE: {
      askNameAfter: 0,      // ask for name on first bot message
      askEmailAfter: 2,     // ask for email after 2 user messages
    },
  };


  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */
  const state = {
    messages: [],           // full conversation history for API
    isOpen: false,
    isTyping: false,
    userMessageCount: 0,
    leadData: { name: null, email: null },
    leadStage: "none",      // none | asked_name | has_name | asked_email | has_email
    previouslyFocused: null,
  };

  /* ─────────────────────────────────────────────
     DOM REFS (resolved after DOMContentLoaded)
  ───────────────────────────────────────────── */
  let els = {};

  function resolveEls() {
    els = {
      toggle:        document.getElementById("chat-toggle"),
      window:        document.getElementById("chat-window"),
      messages:      document.getElementById("chat-messages"),
      form:          document.getElementById("chat-form"),
      input:         document.getElementById("chat-input"),
      charCount:     document.getElementById("chat-char-count"),
      typingIndicator: document.getElementById("chat-typing"),
      clearBtn:      document.getElementById("chat-clear"),
      closeBtn:      document.getElementById("chat-close"),
      suggestions:   document.getElementById("chat-suggestions"),
      floatingCTAs:  document.getElementById("chat-floating-ctas"),
      uploadBtn:     document.getElementById("chat-upload-btn"),
      voiceBtn:      document.getElementById("chat-voice-btn"),
      fileInput:     document.getElementById("chat-file-input"),
      filePreview:   document.getElementById("chat-file-preview"),
    };
  }

  /* ─────────────────────────────────────────────
     BOOKING MODAL
     Defined here (not in scripts.js) so it's
     available immediately — no defer race condition
  ───────────────────────────────────────────── */
  function openBookingModal() {
    const modal = document.getElementById("booking-modal");
    const embed = document.getElementById("cal-embed");
    if (!modal) return;

    modal.hidden = false;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Old Cal.com iframe embed removed; the modal now uses the TechGuru booking widget.
    if (false) { // old Cal.com embed disabled
      const loading = embed.querySelector(".cal-loading");
      const iframe = document.createElement("iframe");
      iframe.src = "https://book.techguruofficial.us?embed=true";
      iframe.title = "Book a free strategy call with TechGuru";
      iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:8px;";
      iframe.setAttribute("loading", "lazy");
      iframe.onload = () => { if (loading) loading.style.display = "none"; };
      embed.appendChild(iframe);
    }

    // Focus the close button for accessibility
    const closeBtn = modal.querySelector(".booking-modal-close");
    if (closeBtn) setTimeout(() => closeBtn.focus(), 100);
  }

  function closeBookingModal() {
    const modal = document.getElementById("booking-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // Expose globally for inline onclick attributes in HTML
  window.openBookingModal = openBookingModal;
  window.closeBookingModal = closeBookingModal;

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("booking-modal");
    if (e.key === "Escape" && modal && !modal.hidden) closeBookingModal();
  });

  /* ─────────────────────────────────────────────
     CHAT WINDOW OPEN / CLOSE
  ───────────────────────────────────────────── */
  function openChat() {
    state.isOpen = true;
    state.previouslyFocused = document.activeElement;

    els.window.classList.add("chat-window--open");
    els.toggle.setAttribute("aria-expanded", "true");
    els.toggle.setAttribute("aria-label", "Close chat assistant");

    // aria-modal only while open (fix: was always true)
    els.window.setAttribute("aria-modal", "true");

    // Show floating CTAs
    showFloatingCTAs(true);

    // Focus the input
    setTimeout(() => els.input && els.input.focus(), 200);

    // Send greeting on first open
    if (state.messages.length === 0) {
      sendBotGreeting();
    }
  }

  function closeChat() {
    state.isOpen = false;
    els.window.classList.remove("chat-window--open");
    els.toggle.setAttribute("aria-expanded", "false");
    els.toggle.setAttribute("aria-label", "Open chat assistant");
    els.window.setAttribute("aria-modal", "false");

    showFloatingCTAs(false);

    // Return focus to the element that opened the chat
    if (state.previouslyFocused) {
      state.previouslyFocused.focus();
      state.previouslyFocused = null;
    }
  }

  function showFloatingCTAs(show) {
    if (!els.floatingCTAs) return;
    els.floatingCTAs.style.display = show ? "flex" : "none";
  }

  /* ─────────────────────────────────────────────
     GREETING
  ───────────────────────────────────────────── */
  function sendBotGreeting() {
    const greeting = "Hey there! 👋 I'm the TechGuru AI assistant. I'm here to help you explore how we can automate and elevate your business.\n\n⚡ Solo shop = fast answers: most replies land the same day, 7 days a week.\n\nTo get started — what's your name?";
    appendMessage("assistant", greeting);

    // Record that we've asked for their name
    state.leadStage = "asked_name";
  }

  /* ─────────────────────────────────────────────
     LEAD CAPTURE LOGIC
  ───────────────────────────────────────────── */
  function processLeadCapture(userText) {
    const text = userText.trim();

    if (state.leadStage === "asked_name") {
      // Heuristic: if the reply is short (1-3 words) treat it as a name
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount <= 4 && text.length < 50) {
        state.leadData.name = text;
        state.leadStage = "has_name";
      }
    }

    // Check if this message contains an email
    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !state.leadData.email) {
      state.leadData.email = emailMatch[0];
      state.leadStage = "has_email";

      // Forward the lead when we first capture an email
      const conversationSummary = state.messages
        .slice(-6)  // last 3 exchanges
        .map(m => m.role.toUpperCase() + ': ' + m.content)
        .join('\n\n');

      sendLeadToEmail(state.leadData.name, state.leadData.email, conversationSummary);
    }
  }

  function buildLeadContext() {
    let ctx = "";
    if (state.leadData.name) ctx += `\n[LEAD INFO] Visitor name: ${state.leadData.name}`;
    if (state.leadData.email) ctx += `\n[LEAD INFO] Visitor email: ${state.leadData.email}`;
    if (state.userMessageCount === CONFIG.LEAD_CAPTURE.askEmailAfter && state.leadStage === "has_name" && !state.leadData.email) {
      ctx += `\n[INSTRUCTION] Naturally ask for their email address so the team can follow up.`;
      state.leadStage = "asked_email";
    }
    return ctx;
  }

  async function sendLeadToEmail(name, email, context) {
    // Only fire when we have at least an email
    if (!email) return;

    // Never treat our own bot text as a lead (it contains info@techguruofficial.us)
    if (email.toLowerCase() === "info@techguruofficial.us") return;

    try {
      const res = await fetch(CONFIG.LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (name || "Unknown").slice(0, 100),
          email: email,
          subject: "New Chat Lead — TechGuru",
          message: ("Lead captured via chat widget.\n\nContext:\n" + context).slice(0, 5000),
        }),
      });

      if (!res.ok) {
        console.error("[TechGuru Chat] Lead forward failed:", res.status);
        return;
      }

      console.log("[TechGuru Chat] Lead forwarded:", email);
    } catch (err) {
      console.error("[TechGuru Chat] Lead forward failed:", err);
    }
  }

  /* ─────────────────────────────────────────────
     API CALL
  ───────────────────────────────────────────── */
  async function callChatAPI(userText) {
    // Add user message to history
    state.messages.push({ role: "user", content: userText });

    // Trim history to max length (keep pairs)
    if (state.messages.length > CONFIG.MAX_HISTORY) {
      state.messages = state.messages.slice(state.messages.length - CONFIG.MAX_HISTORY);
    }

    const leadContext = buildLeadContext();

    // Our backend proxy (workers/src/chat.js) owns the model, system prompt
    // and API key. We send the message plus any lead context; it replies
    // with { reply: string }.
    const response = await fetch(CONFIG.API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: leadContext ? userText + "\n" + leadContext : userText,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || `API error ${response.status}`);
    }

    const data = await response.json();

    // Backend contract: { reply: string }
    const assistantText = (data.reply || "").trim();

    // Add assistant reply to history
    if (assistantText) {
      state.messages.push({ role: "assistant", content: assistantText });
    }

    return assistantText || "I'm sorry, I didn't get a response. Please try again.";
  }

  /* ─────────────────────────────────────────────
     SEND MESSAGE FLOW
  ───────────────────────────────────────────── */
  async function sendMessage(text) {
    if (!text || state.isTyping) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    // Process lead capture heuristics before API call
    state.userMessageCount++;
    processLeadCapture(trimmed);

    // Render user bubble
    appendMessage("user", trimmed);

    // Clear input
    resetInput();

    // Show typing indicator with natural delay
    showTyping(true);

    const delay = randomBetween(CONFIG.TYPING_DELAY_MIN, CONFIG.TYPING_DELAY_MAX);

    try {
      const [reply] = await Promise.all([
        callChatAPI(trimmed),
        sleep(delay),
      ]);

      showTyping(false);
      appendMessage("assistant", reply);

    } catch (err) {
      showTyping(false);
      console.error("[TechGuru Chat] API error:", err);
      appendMessage(
        "assistant",
        "I'm having a bit of trouble connecting right now. You can reach us directly at **info@techguruofficial.us** or call **+1 (406) 284-5523** — we respond within 24 hours! 🚀"
      );
    }
  }

  /* ─────────────────────────────────────────────
     DOM HELPERS
  ───────────────────────────────────────────── */
  function appendMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message chat-message--${role}`;
    wrapper.setAttribute("role", "listitem");

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = formatText(text);

    // Timestamp
    const time = document.createElement("span");
    time.className = "chat-timestamp";
    time.textContent = formatTime(new Date());
    time.setAttribute("aria-hidden", "true");

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    els.messages.appendChild(wrapper);

    scrollToBottom();
  }

  function formatText(text) {
    // Convert **bold**, *italic*, newlines → HTML
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>")
      .replace(/^(.+)$/, "<p>$1</p>");
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom() {
    if (els.messages) {
      els.messages.scrollTop = els.messages.scrollHeight;
    }
  }

  function showTyping(show) {
    state.isTyping = show;
    if (!els.typingIndicator) return;
    if (show) {
      els.typingIndicator.classList.remove("chat-typing-hidden");
      scrollToBottom();
    } else {
      els.typingIndicator.classList.add("chat-typing-hidden");
    }
  }

  function resetInput() {
    if (!els.input) return;
    els.input.value = "";
    els.input.style.height = "auto";
    updateCharCount(0);
  }

  function updateCharCount(len) {
    if (!els.charCount) return;
    els.charCount.textContent = `${len}/${CONFIG.CHAR_LIMIT}`;
    els.charCount.style.color = len > CONFIG.CHAR_LIMIT * 0.85 ? "#f87171" : "";
  }

  function clearConversation() {
    state.messages = [];
    state.userMessageCount = 0;
    state.leadData = { name: null, email: null };
    state.leadStage = "none";
    if (els.messages) els.messages.innerHTML = "";
    // Re-send greeting
    sendBotGreeting();
  }

  /* ─────────────────────────────────────────────
     SUGGESTION CHIPS
     Chips stay visible; clicking one sends the
     message but keeps the chip row available
  ───────────────────────────────────────────── */
  function initSuggestionChips() {
    if (!els.suggestions) return;

    els.suggestions.querySelectorAll(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const action = chip.dataset.action;
        if (action === "booking") {
          openBookingModal();
          return;
        }
        const msg = chip.dataset.message;
        if (msg) sendMessage(msg);
      });
    });
  }

  /* ─────────────────────────────────────────────
     DISABLE UNIMPLEMENTED BUTTONS SAFELY
  ───────────────────────────────────────────── */
  function disableUnimplementedButtons() {
    // Voice button — Web Speech API not implemented; hide gracefully
    if (els.voiceBtn) {
      els.voiceBtn.style.display = "none";
      els.voiceBtn.setAttribute("aria-hidden", "true");
      els.voiceBtn.setAttribute("tabindex", "-1");
    }

    // File upload — no backend handler; hide gracefully
    if (els.uploadBtn) {
      els.uploadBtn.style.display = "none";
      els.uploadBtn.setAttribute("aria-hidden", "true");
      els.uploadBtn.setAttribute("tabindex", "-1");
    }
    if (els.fileInput) {
      els.fileInput.style.display = "none";
    }
    if (els.filePreview) {
      els.filePreview.style.display = "none";
    }
  }

  /* ─────────────────────────────────────────────
     TEXTAREA AUTO-RESIZE + CHAR COUNT
  ───────────────────────────────────────────── */
  function initInput() {
    if (!els.input) return;

    // Fix: enforce autocomplete off
    els.input.setAttribute("autocomplete", "off");

    els.input.addEventListener("input", () => {
      const len = els.input.value.length;
      updateCharCount(len);

      // Auto-resize
      els.input.style.height = "auto";
      els.input.style.height = Math.min(els.input.scrollHeight, 120) + "px";
    });

    els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitForm();
      }
    });
  }

  function submitForm() {
    if (!els.input) return;
    const text = els.input.value.trim();
    if (text && !state.isTyping) sendMessage(text);
  }

  /* ─────────────────────────────────────────────
     KEYBOARD TRAP (only while chat is open)
  ───────────────────────────────────────────── */
  function handleFocusTrap(e) {
    if (!state.isOpen || e.key !== "Tab") return;

    const focusable = els.window.querySelectorAll(
      'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ─────────────────────────────────────────────
     FLOATING CTAs — safe initialisation
  ───────────────────────────────────────────── */
  function initFloatingCTAs() {
    // Hidden by default via JS (not relying on CSS alone)
    showFloatingCTAs(false);
  }

  /* ─────────────────────────────────────────────
     UTILITY
  ───────────────────────────────────────────── */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */
  function init() {
    resolveEls();

    if (!els.toggle || !els.window) {
      console.warn("[TechGuru Chat] Required elements not found.");
      return;
    }

    // Safe defaults
    initFloatingCTAs();
    disableUnimplementedButtons();
    initInput();
    initSuggestionChips();

    // Toggle open/close
    els.toggle.addEventListener("click", () => {
      state.isOpen ? closeChat() : openChat();
    });

    // Close button inside window
    if (els.closeBtn) {
      els.closeBtn.addEventListener("click", closeChat);
    }

    // Clear button
    if (els.clearBtn) {
      els.clearBtn.addEventListener("click", () => {
        if (confirm("Clear conversation history?")) clearConversation();
      });
    }

    // Form submit
    if (els.form) {
      els.form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitForm();
      });
    }

    // Focus trap when open
    document.addEventListener("keydown", handleFocusTrap);

    // Escape closes chat (but not if booking modal is open)
    document.addEventListener("keydown", (e) => {
      const modal = document.getElementById("booking-modal");
      const modalOpen = modal && !modal.hidden;
      if (e.key === "Escape" && state.isOpen && !modalOpen) closeChat();
    });

    // Close if user clicks outside the chat window
    document.addEventListener("click", (e) => {
      if (
        state.isOpen &&
        !els.window.contains(e.target) &&
        !els.toggle.contains(e.target)
      ) {
        closeChat();
      }
    });

    console.log("[TechGuru Chat] Widget initialised ✓");
  }

  /* ─────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
