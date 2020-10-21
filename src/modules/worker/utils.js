/**
 * Create array with all tiers and subtiers
 * 
 * @param itemName - t4 base item name: T4_HEAD_CLOTH_HELL, T4_JOURNAL_WARRIOR
 */
function createArrayOfAllNames(itemName) {
  let allNames = [];

  if (isArtifactItem(itemName)) {
    allNames.push(...createArrayOfAllArtifacts(itemName));
  } 
  
  if (isJournal(itemName)) {
    allNames.push(...createArrayOfAllJournals(itemName));
  } else {
    allNames.push(...createArrayOfAllItems(itemName));
  }

  return allNames;
}

/**
 * Creates an array to request for items of all tiers and subtiers
 * 
 * @param {string} itemName - item t4 name: T4_2H_NATURESTAFF_KEEPER etc.
 */
function createArrayOfAllItems(itemName) {
  let allNames = [];

  for (let tier = 4; tier <= 8; tier++) {
    for (let subtier = 0; subtier <= 3; subtier++) {
      allNames.push(`T${tier}` + itemName.slice(2) + (subtier != 0 ? `@${subtier}` : ''));
    }
  }

  return allNames;
}

/**
 * Looking for an artifact substring in an item name
 * 
 * @param itemName - item name: T4_HEAD_CLOTH_HELL etc.
 */
function isArtifactItem(itemName = '') {
  const artifacts = ['UNDEAD', 'KEEPER', 'HELL', 'MORGANA', 'AVALON', 'ROYAL', 'INSIGHT'];

  return artifacts.some(artefact => itemName.includes(artefact));
}

/**
 * Create an array of all artifacts for a certain item
 * 
 * @param {string} itemName - t4 item name: T4_HEAD_CLOTH_HELL
 */
function createArrayOfAllArtifacts(itemName) {
  let allNames = [];

  if (itemName.includes('ROYAL')) {
    for (let tier = 4; tier <= 8; tier++) {
      allNames.push(`QUESTITEM_TOKEN_ROYAL_T${tier}`);
    }
  } else if (itemName.includes('INSIGHT')) {
    for (let tier = 4; tier <= 8; tier++) {
      allNames.push(`T${tier}_RANDOM_DUNGEON_SOLO_TOKEN_1`);
    }
  } else {
    for (let tier = 4; tier <= 8; tier++) {
      allNames.push(`T${tier}_ARTEFACT${itemName.slice(2)}`);
    }
  }

  return allNames;
}

function isJournal(itemName = '') {
  return itemName.includes('JOURNAL');
}

/**
 * Create array of all journals
 * 
 * @param {string} journalName - t4 journal name: T4_JOURNAL_WARRIOR
 */
function createArrayOfAllJournals(journalName) {
  let allNames = [];

  for (let tier = 4; tier <= 8; tier++) {
    allNames.push(`T${tier}_${journalName.slice(2)}_EMPTY`);
    allNames.push(`T${tier}_${journalName.slice(2)}_FULL`);
  }

  return allNames;
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
  createArrayOfAllNames,
  createArrayOfAllItems,
  createArrayOfAllArtifacts,
  createArrayOfAllJournals,
  isArtifactItem,
  isJournal,
  getLocationIdFromLocation,
  getLocationFromLocationId,
  normalizedPriceAndDate,
  normalizeItem
}