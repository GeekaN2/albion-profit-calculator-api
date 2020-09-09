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
 * Creates an array to request for items of all tiers and subtiers
 * 
 * @param {string} itemName - item name: T4_2H_NATURESTAFF_KEEPER etc.
 */
function createArrayOfAllNames(itemName) {
  let allNames = [];

  for (let tier = 4; tier <= 8; tier++) {
    for (let subtier = 0; subtier <= 3; subtier++) {
      allNames.push(`T${tier}` + itemName.slice(2) + (subtier != 0 ? `@${subtier}` : ''));
    }
  }

  return allNames;
}

/**
 * Checks for location availability
 * 
 * @param {string} location - location
 * @returns {boolean} 
 */
function isAvailableLocation(location) {
  const allLocation = ['Black Market', 'Bridgewatch', 'Caerleon', 'Fort Sterling', 'Lyumhurst', 'Martlock','Thetford']

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

module.exports = {
  generateRegisterToken,
  validateRegister,
  createArrayOfAllNames,
  isAvailableLocation,
  sleep
}