const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      lastIntent: null,
      lastResponseIndex: 0
    };
  }
  return sessions[userId];
}

module.exports = { getSession };
