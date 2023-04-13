const jwt = require('jsonwebtoken');
const config = require('./config');
const servers = require('../servers.json'); // eslint-disable-line node/no-unpublished-require
const { v4: uuid } = require('uuid');

/**
 * Possible user roles on the site
 */
const roles = ['tester', 'user', 'supporter', 'admin'];

/**
 * @param {(string | undefined)[]} data - array of string to validate
 */
function validateRegister(...data) {
  return data.every((elem) => {
    return elem != undefined && elem.trim() != '';
  });
}

/**
 * Generate refresh token
 * 
 * @param {string} role 
 */
function generateRefreshToken(userId) {
  return {
    userId: userId, 
    token: uuid(),
    dtCreated: new Date()
  }
}

/**
 * Generate acess token
 * 
 * @param {string} userId 
 */
function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, config.secret, { expiresIn: '30min' });
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
  const allLocation = ['Black Market', 'Bridgewatch', 'Caerleon', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien'];

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
 * Configurations for receiving and storing data from various servers and users
 */
function getServers() {
  return servers;
}

function getServerById(serverId = 'aod_west') {  
  return getServers().find(({ id }) => serverId === id);
}

function getServerIds() {
  return getServers().map(({ id }) => id);
}

function getDbByServerId(serverId = 'aod_west') {
  return getServerById(serverId).id;
}

module.exports = {
  generateRegisterToken,
  generateRefreshToken,
  generateAccessToken,
  validateRegister,
  isAvailableLocation,
  sleep,
  generateOrderKey,
  getLocationIdFromLocation,
  getLocationFromLocationId,
  getServers,
  getServerById,
  getDbByServerId,
  getServerIds,
  roles
}