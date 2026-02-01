// memory.js - Enhanced with Context Awareness
const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      lastIntent: null,
      lastResponseIndex: 0,
      context: {},           // NEW: Store context data
      conversationHistory: [] // NEW: Store recent messages
    };
  }
  return sessions[userId];
}

// NEW: Set context data
function setContext(userId, key, value) {
  const session = getSession(userId);
  session.context[key] = value;
}

// NEW: Get context data
function getContext(userId, key) {
  const session = getSession(userId);
  return session.context[key];
}

// NEW: Clear specific context
function clearContext(userId, key) {
  const session = getSession(userId);
  if (key) {
    delete session.context[key];
  } else {
    session.context = {};
  }
}

// NEW: Add to conversation history
function addToHistory(userId, role, message) {
  const session = getSession(userId);
  session.conversationHistory.push({
    role,
    message,
    timestamp: Date.now()
  });
  
  // Keep only last 10 messages
  if (session.conversationHistory.length > 10) {
    session.conversationHistory.shift();
  }
}

// NEW: Get last user message
function getLastUserMessage(userId) {
  const session = getSession(userId);
  const history = session.conversationHistory;
  
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      return history[i].message;
    }
  }
  return null;
}

// NEW: Get last bot message
function getLastBotMessage(userId) {
  const session = getSession(userId);
  const history = session.conversationHistory;
  
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'bot') {
      return history[i].message;
    }
  }
  return null;
}

module.exports = { 
  getSession,
  setContext,
  getContext,
  clearContext,
  addToHistory,
  getLastUserMessage,
  getLastBotMessage
};