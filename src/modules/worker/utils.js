const foodAndPotionsItems = require('../../static/foodAndPotionsItems.json');

/**
 * Create array with all tiers and subtiers
 * 
 * @param itemName - t4 base item name: T4_HEAD_CLOTH_HELL, T4_JOURNAL_WARRIOR
 */
function createArrayOfAllNames(itemName) {
  let allItems = [];
  let resources = ['PLANKS', 'METALBAR', 'LEATHER', 'CLOTH', 'STONEBLOCK', 'FIBER', 'ROCK', 'ORE', 'WOOD', 'HIDE'];

  if (isArtifactItem(itemName)) {
    allItems = createArrayOfAllArtifactsFromArtifact(itemName);
  } else if (resources.some(res => itemName.includes(res))) {
    allItems = createArrayOfAllResources(itemName.slice(3))
  } else if (itemName.includes('JOURNAL')) {
    allItems = createArrayOfAllJournals(itemName);
  } else if (itemName.includes('T1_FACTION_')) {
    allItems = [itemName];
  } else {
    allItems = createArrayOfAllItems(itemName);
  }

  return allItems;
}

/**
 * Creates an array for materials of all tiers and subtiers
 * 
 * @param resource - basic resource: PLANKS, CLOTH etc.
 * @returns string with all tiers and subtiers for materials
 */
 function createArrayOfAllResources(resource, startTier = 4) {
  let allNames = [];
  const isStoneBlock = resource.includes('STONEBLOCK');

  for (let subtier = 0; subtier <= 3; subtier++) {
    for (let tier = startTier; tier <= 8; tier++) {
      if (tier < 4 && subtier > 0) {
        continue;
      }

      allNames.push(`T${tier}_` + resource + (subtier != 0 && !isStoneBlock ? `_LEVEL${subtier}@${subtier}` : ''));
    }
  }

  return [...new Set(allNames)];
}

/**
 * Creates an array to request for artefacts of all tiers
 * 
 * @param itemName - artefact item name: T4_ARTEFACT_2H_NATURESTAFF_KEEPER etc.
 * @returns array with all tiers for artefacts
 */
function createArrayOfAllArtifactsFromArtifact(artifactName) {
  let allNames = [];

  if (artifactName.includes('ROYAL')) {
    for (let tier = 4; tier <= 8; tier++) {
      allNames.push(`QUESTITEM_TOKEN_ROYAL_T${tier}`);
    }

    return allNames;
  }

  if (artifactName.includes('SKILLBOOK')) {
    allNames.push(`T4_SKILLBOOK_STANDARD`);

    return allNames;
  }

  if (artifactName.includes('_BP')) {
    for (let tier = 4; tier <= 8; tier++) {
      allNames.push(`T${tier}_${artifactName.slice(3)}`);
    }

    return allNames;
  }

  for (let tier = 4; tier <= 8; tier++) {
    allNames.push(`T${tier}${artifactName.slice(2)}`);
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
 * Small function to help in subtier names generation
 * 
 * @param baseName - item name without a subtier
 * @param highestSubtier - bound of subtiers
 */
 const generateSubtiersUpTo = (baseName, highestSubtier) => {
  let names = [];

  for (let subtier = 0; subtier <= highestSubtier; subtier++) {
    names.push(`${baseName}${subtier > 0 ? '@' + subtier : ''}`);
  }

  return names;
}

/**
 * Get tiers from food and potions and add subtiers
 */
function createArrayOfAllFoodAndPotionsItems() {
  const allNames = [];

  foodAndPotionsItems.forEach((itemName) => {
    const tier = Number(itemName.slice(1, 2));

    if (itemName.includes('POTION') && tier >= 4) {
      allNames.push(...generateSubtiersUpTo(itemName, 1));

      return;
    }

    if (itemName.includes('MEAL')) {
      allNames.push(...generateSubtiersUpTo(itemName, 3));

      return;
    }

    allNames.push(itemName);
  });

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
    allNames.push(`T4_SKILLBOOK_STANDARD`);
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
    allNames.push(`T${tier}_${journalName.slice(3)}_EMPTY`);
    allNames.push(`T${tier}_${journalName.slice(3)}_FULL`);
  }

  return allNames;
}

/**
 * Normalize previous item and new item by date and price
 * 
 * @param oldItem - previous item
 * @param newItem - new item 
 */
function normalizeItem(oldItem, newItem) {
  const previousDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fiveMinutes = 5 * 60 * 1000;

  if (new Date(oldItem.date) >= previousDay && new Date(newItem.date) <= previousDay) {
    return oldItem;
  } else if (new Date(oldItem.date) <= previousDay && new Date(newItem.date) >= previousDay) {
    return newItem;
  }

  if (new Date(newItem.date).valueOf() >= new Date(oldItem.date).valueOf() + fiveMinutes) {
    return newItem;
  } else if (new Date(oldItem.date).valueOf() >= new Date(newItem.date).valueOf() + fiveMinutes) {
    return oldItem;
  }

  return oldItem.normalizedPrice > newItem.normalizedPrice ? oldItem: newItem;
}

/**
 * Minimum price from sales orders or maximum price from purchase orders
 * 
 * @param {ResponseModel} item 
 */
function normalizedPriceAndDate(item) {
  const previousDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const sellPriceRespone = {
    ...item,
    normalizedPrice: item.sellPriceMin,
    date: item.sellPriceMinDate,
    marketFee: 4.5
  }

  const buyPriceResponse = {
    ...item,
    normalizedPrice: item.buyPriceMax,
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
  createArrayOfAllFoodAndPotionsItems,
  isArtifactItem,
  isJournal,
  normalizedPriceAndDate,
  normalizeItem,
  generateSubtiersUpTo,
}