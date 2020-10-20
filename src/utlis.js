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

/**
 * Normalize previous item and new item by date and price
 * 
 * @param oldItem - previous item
 * @param newItem - new item 
 */
function normalizeItem(oldItem, newItem) {
  const previousDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (new Date(oldItem.date) >= previousDay && new Date(newItem.date) <= previousDay) {
    return oldItem;
  } else if (new Date(oldItem.date) <= previousDay && new Date(newItem.date) >= previousDay) {
    return newItem;
  }

  return oldItem.price > newItem.price ? oldItem: newItem;
}

/**
 * Minimum price from sales orders or maximum price from purchase orders
 * 
 * @param {ResponseModel} item 
 */
function normalizedPriceAndDate(item) {
  const previousDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sellPriceRespone = {
    itemId: item.itemId,
    quality: item.quality,
    location: item.location,
    price: item.sellPriceMin,
    date: item.sellPriceMinDate,
    marketFee: 4.5
  }

  const buyPriceResponse = {
    itemId: item.itemId,
    quality: item.quality,
    location: item.location,
    price: item.buyPriceMax,
    date: item.buyPriceMaxDate,
    marketFee: 3
  }

  if (item.sellPriceMin != 0 && item.buyPriceMax == 0) {
    return sellPriceRespone;
  }

  if (item.sellPriceMin == 0 && item.buyPriceMax != 0) {
    return buyPriceResponse;
  }

  if (item.sellPriceMin == 0 && item.buyPriceMax == 0) {
    return buyPriceResponse;
  }

  if (new Date(item.sellPriceMinDate) >= previousDay && new Date(item.buyPriceMaxDate) <= previousDay) {
    return sellPriceRespone;
  }

  if (new Date(item.sellPriceMinDate) <= previousDay && new Date(item.buyPriceMaxDate) >= previousDay) {
    return buyPriceResponse;
  }

  // Compare prices with fee,
  if (item.buyPriceMax * 0.97 > item.sellPriceMin * 0.955) {
    return buyPriceResponse;
  }

  return sellPriceRespone;
}

module.exports = {
  generateRegisterToken,
  validateRegister,
  createArrayOfAllNames,
  isAvailableLocation,
  sleep,
  generateOrderKey,
  getLocationIdFromLocation,
  getLocationFromLocationId,
  normalizedPriceAndDate,
  normalizeItem
}