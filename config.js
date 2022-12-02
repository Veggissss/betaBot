const { MongoClient } = require('mongodb');

//Mongodb
const dbPass = process.env.MONGOPASSWORD;
const dbUri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const dbClient = new MongoClient(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });

//Discord server ID
const GuildID = "451365873668849664";

//Channel where scoreboard should be posted
const scoreboardChannelId = "808649489307926529";

//Rank ids:
const rankTop = "711141574964412416";

const rankDelta = "491506230355951636";
const rankMafia = "693894552179834891";
const rankTrusted = "491151062019997696";
const rankForeigners = "641358849865154581";
const rankDj = "451446408827109387";

const rankRewards = [rankDj, rankForeigners, rankTrusted, rankMafia, rankDelta, rankTop];

//Channels that gives 0 points
const afkChannels = ["451371568577249281"];

/*
    Database structure:

    Collection Embeds:
    iteration: -1 0 1 // {-1 = user stat card} {0 = rewards} {1 = leaderboard}
    id: discord message id

    Collection Top
    single user object with highest score

    Collection Users
    a collection of user objects

    User object:
    userID      //discord user id of user
    username    //discord username
    messages    //amount of messages sent
    voiceTime   //amount of time recorded in voice chats
    voiceJoin   //time when user joined voice chat in ms from 1970
    score       //total score
    dailyTime   //daily claim timestamp
    dailyClaims //amount of daily claims
    dailySteak  //current daily claims streak
    dailyMax    //highest streak of daily claims
*/

function getDatabaseClient() {
    return dbClient;
}

function getAfkChannels() {
    return afkChannels;
}

function getGuildId() {
    return GuildID;
}

function getScoreboardChannelId() {
    return scoreboardChannelId
}

function getRankRewards() {
    return rankRewards;
}

module.exports = {
    getDatabaseClient, getAfkChannels, getGuildId, getScoreboardChannelId, getRankRewards
};