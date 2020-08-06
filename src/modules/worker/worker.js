const { workerData, parentPort } = require('worker_threads')
// const { createStringOfAllItems } = require('./utils');
const axios = require('axios');
const MongoClient = require('mongodb').MongoClient;
const config = require('../../config');

const itemName = workerData;
const cities = [
  'Black Market',
  //'Bridgewatch',
  //'Caerleon',
  //'Fort Sterling',
  //'Lymhurst',
  //'Martlock',
  //'Thetford',
];

// const allItems = createStringOfAllItems(itemName);

/**
 * Request example
 * 
 * https://www.albion-online-data.com/api/v2/stats/history/T8_BAG?date=08-01-2020&locations=Thetford&qualities=1,2,3&time-scale=24
 */

const allItems = itemName;
const allCities = cities.join(',');
const baseUrl = 'https://www.albion-online-data.com/api/v2/stats/charts';
const monthAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // fix on prod
const formatDate = `${monthAgo.getMonth() + 1}-${monthAgo.getDate()}-${monthAgo.getFullYear()}`;
const qualities = '1,2,3';

const requestUrl = `${baseUrl}/${itemName}?date=${formatDate}&locations=${allCities}&qualities=${qualities}&time-scale=24`;

console.log(requestUrl);



async function getItemHistory() {
  const response = await axios.get(requestUrl);
  const data = response.data;
  
  const baseObject = {
    amountOfItems: 0,
    sumCost: 0, // prices[i] * items[i] + ...
    averagePrice: 0,
    averageItems: 0,
  };

  let collectedData = {};

  for (let city of cities) {
    collectedData[city] = Object.assign({}, baseObject);
    collectedData[city].days = new Set();
  }

  // Set data from charts
  for (let chart of data) {
    const currentCity = chart.location;
    const chartData = chart.data;

    for (let i = 0; i < chartData.timestamps.length; i++) {
      const cost = chartData.prices_avg[i] * chartData.item_count[i];
      
      collectedData[currentCity].days.add(chartData.timestamps[i]);
      collectedData[currentCity].amountOfItems += chartData.item_count[i];
      collectedData[currentCity].sumCost += cost;
    }
  }

  // Calculate average data: prices and items
  for(let city in collectedData) {
    collectedData[city].averagePrice = collectedData[city].sumCost / collectedData[city].amountOfItems;
    collectedData[city].averageItems = collectedData[city].amountOfItems / collectedData[city].days.size;
  }
  
  // Connect to mongoDB
  MongoClient.connect(config.connection, { useUnifiedTopology: true, useNewUrlParser: true }, async function(err, client) {
    if (err) {
      console.log(err);
    }

    console.log("Connected successfully to server");
  
    const db = client.db('albion');
    const collection = db.collection('average_data');
    const options = { upsert: true };

    const dataToSet = [];

    for (let city in collectedData) {
      dataToSet.push({
        itemName,
        location: city,
        averagePrice: collectedData[city].averagePrice,
        averageItems: collectedData[city].averageItems
      });
    }

    for (let data of dataToSet) {
      const result = await collection.updateOne({itemName, location: data.location}, { $set: data }, options);
      
      if (result.ok) {
        console.log('')
      }
    }
    
  
    await client.close();
  });
}

getItemHistory().catch(err => {
  console.log('Error ', err);
});

parentPort.postMessage('Ok man, thats all right for ' + itemName)