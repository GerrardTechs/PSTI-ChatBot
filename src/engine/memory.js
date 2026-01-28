const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      lastIntent: null,
      lastEntity: null,
      context: null
    };
  }
  return sessions[userId];
}

module.exports = { getSession };
