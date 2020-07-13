/**
 * @param {(string | undefined)[]} data - array of string to validate
 */
function validateRegister(...data) {
  return data.every((elem) => {
    return elem != undefined && elem.trim() != '';
  });
}

/**
 * Generate base16 random string
 */
function generateRandomRegisterToken() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
  let keyString = '';
  
  for (let i = 0; i < 20; i++) {
      const randomChar = alphabet[~~(Math.random() * alphabet.length)];
      keyString = keyString + randomChar;
  }

  const hexString = Buffer.from(keyString, 'utf8').toString('hex');
  return hexString;
}

module.exports.generateRandomRegisterToken = generateRandomRegisterToken;
module.exports.validateRegister = validateRegister;
