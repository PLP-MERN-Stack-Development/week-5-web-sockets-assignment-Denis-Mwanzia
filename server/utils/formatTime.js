function formatTime(date = new Date()) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

module.exports = formatTime;