/**
 * Generates a booking reference in the format:  SKY-XXXX
 * where XXXX is a random 4-digit number.
 * Optionally prefixed with operator initials.
 */
function generateBookingRef(operatorName) {
  const initials = operatorName
    ? operatorName
        .split(' ')
        .map((w) => w[0] || '')
        .join('')
        .substring(0, 3)
        .toUpperCase()
    : 'SKY';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${initials}-${num}`;
}

module.exports = { generateBookingRef };
