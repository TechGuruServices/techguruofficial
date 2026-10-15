/**
 * TECHGURU Chat Widget — Automated Responder Edition
 * No AI API, no backend dependency, no keys. All replies are generated
 * locally by intent matching, so the widget answers instantly and can
 * never "lose connection".
 *
 * Lead capture (name → email → Web3Forms) is unchanged from the AI edition.
 * UI, typing indicator, suggestion chips, focus trap: all unchanged.
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
     CONFIG
  ───────────────────────────────────────────── */
  const CONFIG = {
    TYPING_DELAY_MIN: 900,
    TYPING_DELAY_MAX: 1600,
    MAX_HISTORY: 20,        // max message pairs kept in memory
    CHAR_LIMIT: 500,
    LEAD_CAPTURE: {
      askNameAfter: 0,      // ask for name on first bot message
      askEmailAfter: 2,     // ask for email after 2 user messages
    },
  };

  const CONTACT = {
    email: "info@techguruofficial.us",
    phone: "+1 (406) 284-5523",
    phoneHref: "+14062845523",
    booking: "https://book.techguruofficial.us",
  };

  /* ─────────────────────────────────────────────
     AUTOMATED RESPONSES
     Intent → keywords → reply. First match wins, so order
     matters: specific intents before general ones.
  ───────────────────────────────────────────── */
  const INTENTS = [
    {
      id: "booking",
      keys: ["book", "schedule", "appointment", "call", "talk to", "speak with", "meeting", "consult", "demo"],
      reply: () =>
        `You can book a call directly at **${CONTACT.booking}** — pick whatever time works for you. Prefer to just talk? Call or text **${CONTACT.phone}**.`,
    },
    {
      id: "pricing",
      keys: ["price", "pricing", "cost", "how much", "quote", "estimate", "charge", "fee", "rates"],
      reply: () =>
        `Starting prices: custom websites **$900+**, AI chat & FAQ widgets **$600+**, branding & logo **$350+**, monthly care plans **$75/mo**. Custom tools and CRMs are quoted per project. For an exact number, tell me a bit about your project — or book a call at **${CONTACT.booking}**.`,
    },
    {
      id: "timeline",
      keys: ["how long", "timeline", "turnaround", "how fast", "deadline", "when can", "delivery", "weeks", "days"],
      reply: () =>
        `Most websites land in **2–4 weeks** from kickoff. Smaller jobs like widgets or branding are often faster. Got a deadline? Mention it when you reach out and we'll plan around it.`,
    },
    {
      id: "services",
      keys: ["service", "what do you do", "offer", "what can you"],
      reply: () =>
        `Here's what we do:\n\n• **Custom websites** — from $900\n• **AI chat & FAQ widgets** — from $600\n• **Branding & logo design** — from $350\n• **Custom business tools / CRMs** — custom quote\n• **Monthly care plans** — from $75/mo\n\nWant details on any of these?`,
    },
    {
      id: "website",
      keys: ["website", "web design", "site", "redesign", "rebuild", "landing page"],
      reply: () =>
        `Custom websites start at **$900** — designed around your business, fast, and built to convert visitors into calls. Most are done in 2–4 weeks. Want to talk through your project? **${CONTACT.booking}**`,
    },
    {
      id: "ai_widget",
      keys: ["ai", "chatbot", "chat bot", "widget", "chat widget", "faq", "automation", "automate"],
      reply: () =>
        `Our AI chat & FAQ widgets start at **$600** — they answer your customers' questions 24/7 and capture leads while you work. (This chat is a live demo of the concept, minus the AI brain.) Interested? **${CONTACT.booking}**`,
    },
    {
      id: "branding",
      keys: ["brand", "logo", "identity"],
      reply: () =>
        `Branding & logo design starts at **$350** — logo, colors, and the visual identity your business runs on. Often bundled with a website rebuild.`,
    },
    {
      id: "care_plan",
      keys: ["care plan", "maintenance", "maintain", "support plan", "monthly", "retainer", "updates"],
      reply: () =>
        `Care plans start at **$75/mo** — updates, backups, small changes, and direct support, so your site stays sharp without you thinking about it.`,
    },
    {
      id: "portfolio",
      keys: ["portfolio", "work", "examples", "clients", "previous", "past projects", "show me"],
      reply: () =>
        `Recent work includes the **Creative Drywall** website and the **Zempel Auto** platform (CRM, invoicing, inventory). Happy to walk you through them on a call: **${CONTACT.booking}**`,
    },
    {
      id: "location",
      keys: ["where", "located", "location", "missoula", "montana", "area", "serve", "based"],
      reply: () =>
        `We're based in **Missoula, Montana** — and work with businesses locally and nationwide, fully remote.`,
    },
    {
      id: "hours",
      keys: ["hours", "open", "when are you", "available", "weekend", "sunday", "saturday"],
      reply: () =>
        `We're around **Mon–Fri 8am–5pm** and **Sat 10am–3pm** (Mountain). Message anytime — we reply within 24 hours, usually same day.`,
    },
    {
      id: "contact",
      keys: ["contact", "email", "phone", "number", "reach you", "get in touch", "human", "person", "someone real", "real person"],
      reply: () =>
        `Reach us at **${CONTACT.email}** or **${CONTACT.phone}** — we respond within 24 hours, usually same day. Or book a call: **${CONTACT.booking}**`,
    },
    {
      id: "thanks",
      keys: ["thank", "thanks", "thx", "appreciated"],
      reply: () => `Anytime! Anything else I can help with?`,
    },
    {
      id: "bye",
      keys: ["bye", "goodbye", "see you", "later"],
      reply: () =>
        `Thanks for stopping by! Reach out anytime at **${CONTACT.email}**. 👋`,
    },
    {
      id: "greeting",
      keys: ["hi", "hello", "hey", "howdy", "good morning", "good afternoon", "good evening", "yo"],
      reply: () =>
        `Hey! 👋 I can answer questions about our **services**, **pricing**, **timelines**, and **booking**. What's on your mind?`,
    },
  ];

  const FALLBACK_REPLY =
    `I want to make sure you get the right answer — I can help with **services**, **pricing**, **timelines**, and **booking**. ` +
    `Or reach Lucas directly at **${CONTACT.email}** / **${CONTACT.phone}**.`;

  function getAutoReply(userText) {
    const text = userText.toLowerCase();

    for (const intent of INTENTS) {
      for (const key of intent.keys) {
        if (text.includes(key)) return intent.reply();
      }
    }
    return FALLBACK_REPLY;
  }

  /* ─────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────── */
  const state = {
    messages: [],           // conversation history (local only now)
    isOpen: false,
    isTyping: false,
    userMessageCount: 0,
    leadData: { name: null, email: null },
    leadStage: "none",      // none | asked_name | has_name | asked_email | has_email
    previouslyFocused: null,
    greetedName: false,
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
     CHAT WINDOW OPEN / CLOSE
  ───────────────────────────────────────────── */
  function openChat() {
    state.isOpen = true;
    state.previouslyFocused = document.activeElement;

    els.window.classList.add("chat-window--open");
    els.toggle.setAttribute("aria-expanded", "true");
    els.toggle.setAttribute("aria-label", "Close chat assistant");

    els.window.setAttribute("aria-modal", "true");

    showFloatingCTAs(true);

    setTimeout(() => els.input && els.input.focus(), 200);

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
    const greeting = "Hey there! 👋 I'm the TechGuru assistant. I can answer questions about our services, pricing, timelines, and booking — instantly.\n\nTo get started — what's your name?";
    appendMessage("assistant", greeting);
    state.leadStage = "asked_name";
  }

  /* ─────────────────────────────────────────────
     LEAD CAPTURE LOGIC (unchanged)
  ───────────────────────────────────────────── */
  function processLeadCapture(userText) {
    const text = userText.trim();
    let justGotName = false;

    if (state.leadStage === "asked_name") {
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount <= 4 && text.length < 50) {
        state.leadData.name = text;
        state.leadStage = "has_name";
        justGotName = true;
      }
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !state.leadData.email) {
      state.leadData.email = emailMatch[0];
      state.leadStage = "has_email";

      const conversationSummary = state.messages
        .slice(-6)
        .map(m => m.role.toUpperCase() + ': ' + m.content)
        .join('\n\n');

      sendLeadToEmail(state.leadData.name, state.leadData.email, conversationSummary);
    }

    // Nudge for email after 2 user messages
    let askEmail = false;
    if (state.userMessageCount === CONFIG.LEAD_CAPTURE.askEmailAfter &&
        state.leadStage === "has_name" && !state.leadData.email) {
      state.leadStage = "asked_email";
      askEmail = true;
    }

    return { justGotName, askEmail };
  }

  async function sendLeadToEmail(name, email, context) {
    if (!email) return;
    if (email.toLowerCase() === "info@techguruofficial.us") return;

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          access_key: "79ea5629-dbba-4cfe-95e6-930e25f542e5",
          subject: "New Chat Lead — TechGuru",
          from_name: "TechGuru Website",
          name: (name || "Unknown").slice(0, 100),
          email: email,
          message: ("Lead captured via chat widget.\n\nContext:\n" + context).slice(0, 5000),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        console.error("[TechGuru Chat] Lead forward failed:", res.status, data.message || "");
      }
    } catch (err) {
      console.error("[TechGuru Chat] Lead forward failed:", err);
    }
  }

  /* ─────────────────────────────────────────────
     SEND MESSAGE FLOW (no API — local auto-reply)
  ───────────────────────────────────────────── */
  async function sendMessage(text) {
    if (!text || state.isTyping) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    state.userMessageCount++;
    const { justGotName, askEmail } = processLeadCapture(trimmed);

    appendMessage("user", trimmed);
    resetInput();

    state.messages.push({ role: "user", content: trimmed });
    if (state.messages.length > CONFIG.MAX_HISTORY) {
      state.messages = state.messages.slice(state.messages.length - CONFIG.MAX_HISTORY);
    }

    showTyping(true);
    await sleep(randomBetween(CONFIG.TYPING_DELAY_MIN, CONFIG.TYPING_DELAY_MAX));
    showTyping(false);

    let reply = getAutoReply(trimmed);

    if (justGotName && state.leadData.name) {
      reply = `Nice to meet you, ${state.leadData.name}! ` + reply;
    }
    if (askEmail) {
      reply += `\n\nIf you'd like, drop your email here and Lucas will follow up personally.`;
    }

    state.messages.push({ role: "assistant", content: reply });
    appendMessage("assistant", reply);
  }

  /* ─────────────────────────────────────────────
     DOM HELPERS (unchanged)
  ───────────────────────────────────────────── */
  function appendMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = `chat-message chat-message--${role}`;
    wrapper.setAttribute("role", "listitem");

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = formatText(text);

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
    sendBotGreeting();
  }

  /* ─────────────────────────────────────────────
     SUGGESTION CHIPS (unchanged)
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

  function disableUnimplementedButtons() {
    if (els.voiceBtn) {
      els.voiceBtn.style.display = "none";
      els.voiceBtn.setAttribute("aria-hidden", "true");
      els.voiceBtn.setAttribute("tabindex", "-1");
    }
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

  function initInput() {
    if (!els.input) return;
    els.input.setAttribute("autocomplete", "off");

    els.input.addEventListener("input", () => {
      const len = els.input.value.length;
      updateCharCount(len);
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

  function initFloatingCTAs() {
    showFloatingCTAs(false);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function init() {
    resolveEls();

    if (!els.toggle || !els.window) {
      console.warn("[TechGuru Chat] Required elements not found.");
      return;
    }

    initFloatingCTAs();
    disableUnimplementedButtons();
    initInput();
    initSuggestionChips();

    els.toggle.addEventListener("click", () => {
      state.isOpen ? closeChat() : openChat();
    });

    if (els.closeBtn) {
      els.closeBtn.addEventListener("click", closeChat);
    }

    if (els.clearBtn) {
      els.clearBtn.addEventListener("click", () => {
        if (confirm("Clear conversation history?")) clearConversation();
      });
    }

    if (els.form) {
      els.form.addEventListener("submit", (e) => {
        e.preventDefault();
        submitForm();
      });
    }

    document.addEventListener("keydown", handleFocusTrap);

    document.addEventListener("keydown", (e) => {
      const modal = document.getElementById("booking-modal");
      const modalOpen = modal && !modal.hidden;
      if (e.key === "Escape" && state.isOpen && !modalOpen) closeChat();
    });

    document.addEventListener("click", (e) => {
      if (
        state.isOpen &&
        !els.window.contains(e.target) &&
        !els.toggle.contains(e.target)
      ) {
        closeChat();
      }
    });

    console.log("[TechGuru Chat] Widget initialised (automated responder) ✓");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
