/**
 * Creates a string to request for items of all tiers and subtiers
 * 
 * @param {string} itemName - item name: T4_2H_NATURESTAFF_KEEPER etc.
 */
function createStringOfAllItems(itemName) {
  let allNames = '';

  for (let tier = 4; tier <= 8; tier++) {
    for (let subtier = 0; subtier <= 3; subtier++) {
      allNames = allNames + `T${tier}` + itemName.slice(2) + (subtier != 0 ? `@${subtier}` : '') + ',';
    }
  }

  return allNames.slice(0, -1);
}

module.exports = {
  createStringOfAllItems
}