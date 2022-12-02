//Import local
const { sendEmbed, calculateScore, editDailyEmbed } = require('../embed.js');
const config = require('../config.js');

const dbClient = config.getDatabaseClient();
const afkChannels = config.getAfkChannels();

module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        if (message.author.bot) {
            return;
        }

        //DMs
        if (message.channel.type == "dm") {
            console.log(message.content);
            return;
        }

        if (afkChannels.includes(message.channel.id)){
            console.log("Ignoring message");
            return;
        }

        //Read database
        dbClient.connect(err => {
            //if (err) throw err;
            if (err) {
                console.log("Could not connect to db in messageCreate.js");
                console.log(err);
                return;
            }

            const collection = dbClient.db("Narkos").collection("Users");
            collection.findOne({ userID: message.author.id }).then(user => {

                //User in db
                if (user) {
                    console.log(`${message.author.username} has sent ${user.messages + 1} messages`);

                    let userEntry = {
                        userID: user.userID,
                        username: user.username,
                        messages: user.messages + 1,
                        voiceTime: user.voiceTime,
                        voiceJoin: user.voiceJoin,
                        score: user.score,
                        dailyTime: user.dailyTime,
                        dailyClaims: user.dailyClaims,
                        dailyStreak: user.dailyStreak,
                        dailyMax: user.dailyMax
                    };

                    //Update score
                    userEntry.score = calculateScore(userEntry);

                    var newValues = { $set: userEntry };
                    collection.updateOne({ userID: message.author.id }, newValues).then(res => {
                        //console.log("UPDATED!");
                    });

                    //Update leaderboard embed
                    sendEmbed(client);

                    editDailyEmbed(client, message.author.id, msg = `${userEntry.username} has now sent \`${userEntry.messages}\` messages.\n And have got \`${userEntry.score}\` points in score!`);
                }
                else {
                    console.log("User not found!");
                    // Defining new user 
                    let userEntry = {
                        userID: message.member.id,
                        username: message.member.user.username,
                        messages: 1,
                        voiceTime: 0,
                        voiceJoin: 0,
                        score: 5,
                        dailyTime: 0,
                        dailyClaims: 0,
                        dailyStreak: 0,
                        dailyMax: 0
                    };

                    //Add to db
                    collection.insertOne(userEntry, function (err, res) {
                        //if (err) throw err;
                        if (err) {
                            console.log("Could not add user to db in messageCreate.js");
                            console.log(err);
                            return;
                        }

                        console.log(`Added ${message.member.user.username} to db!`);
                    });

                    //Update leaderboard embed
                    sendEmbed(client);
                }
            })
        })
    }
}
