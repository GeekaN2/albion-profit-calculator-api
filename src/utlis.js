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

/**
 * Get location id from location name
 * 
 * @param {String} location - name of location
 * @return {Number} location id
 */
function getLocationIdFromLocation(location) {
  const codes = {
    'Thetford': 7,
    'Lymhurst': 1002,
    'Bridgewatch': 2004,
    'Black Market': 3003,
    'Caerleon': 3005,
    'Martlock': 3008,
    'Fort Sterling': 4002
  }

  return codes[location];
}

/**
 * Get location from location id
 * 
 * @param {Number} locationId - id of location
 * @returns {String} name of location
 */
function getLocationFromLocationId(locationId) {
  const cityCodes = {
    7: 'Thetford',
    1002: 'Lymhurst',
    2004: 'Bridgewatch',
    3003: 'Black Market',
    3005: 'Caerleon',
    3008: 'Martlock',
    4002: 'Fort Sterling',
  }
  
  return cityCodes[locationId]
}

module.exports = {
  generateRegisterToken,
  validateRegister,
  createArrayOfAllNames,
  isAvailableLocation,
  sleep,
  generateOrderKey,
  getLocationIdFromLocation,
  getLocationFromLocationId
}