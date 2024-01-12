//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user

//Import the created client object
const client = require('./client.js');
client.start();

// Get Config
const config = require('./config.js');

//Login to the discord API
client.login(config.getDiscordToken());
