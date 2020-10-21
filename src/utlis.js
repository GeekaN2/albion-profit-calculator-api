const jwt = require('jsonwebtoken');
const config = require('./config');


/**
 * @param {(string | undefined)[]} data - array of string to validate
 */
function validateRegister(...data) {
  return data.every((elem) => {
    return elem != undefined && elem.trim() != '';
  });
}

/**
 * Generate register token
 * 
 * @param {string} role - user role e.g. tester, user, admin
 */
function generateRegisterToken(role) {
  const payload = {
    role
  }

  const registerToken = jwt.sign(payload, config.registerJwtSecret);

  return registerToken;
}


/**
 * Checks for location availability
 * 
 * @param {string} location - location
 * @returns {boolean} 
 */
function isAvailableLocation(location) {
  const allLocation = ['Black Market', 'Bridgewatch', 'Caerleon', 'Fort Sterling', 'Lymhurst', 'Martlock','Thetford']

  return allLocation.includes(location);
}

/**
 * Sleep function
 * 
 * @param {number} ms - sleep time in milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a key for the same type of orders
 * 
 * @param {String} itemId - item id 
 * @param {Number} locationId - id of market location
 * @param {Number} qualityLevel - item quality 
 */
function generateOrderKey(itemId, locationId, qualityLevel) {
  return `${itemId}:${locationId}:${qualityLevel}`;
}

module.exports = {
  generateRegisterToken,
  validateRegister,
  isAvailableLocation,
  sleep,
  generateOrderKey
}