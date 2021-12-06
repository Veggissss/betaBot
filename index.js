//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user
require('dotenv').config();

const { MongoClient } = require('mongodb');

//Import local
const token = process.env.TOKEN;

//Import the created client object
const client = require('./client.js');
const { sendEmbed, editDailyEmbed } = require('./embed.js');
client.start();

//Mongodb
const dbPass = process.env.MONGOPASS;
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

//Button interaction
client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()){
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
    else if (interaction.isButton()){
        //console.log(interaction);
        if (interaction.customId == "sortByScore"){
            sendEmbed(client, sort = {score: -1} );
        }
        else if (interaction.customId == "sortByMsg"){
            sendEmbed(client, sort = {messages: -1} );
        }
        else if (interaction.customId == "sortByHrs"){
            sendEmbed(client, sort = {voiceTime: -1} );
        }

        //Update the username
        else if (interaction.customId == "updateName"){
            const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

            dbClient.connect(err => {
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in index.js");
                    console.log(err);
                    return;
                }

                const collection = dbClient.db("Narkos").collection("Users");

                collection.updateOne({ userID: interaction.user.id }, { $set: { username: interaction.user.username } }, function(err, res) {
                    //if (err) throw err;
                    if (err){
                        console.log("Could not updateOne in db at index.js");
                        console.log(err);
                        return;
                    }

                    collection.find({userID: interaction.user.id}).toArray().then(user=>{
                        sendEmbed(client);

                        editDailyEmbed(client,interaction.user.id, "Updated username!");
                        dbClient.close();
                    });
                });
            })
        }

        else if (interaction.customId == "claimDaily"){
            const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

            dbClient.connect(err => {
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in index.js; claimDaily");
                    console.log(err);
                    return;
                }
                
                const collection = dbClient.db("Narkos").collection("Users");
                collection.findOne({ userID: interaction.user.id}).then(user => {
                    if (!user){
                        console.log(`Could not find user: ${interaction.user.id} in db!`);
                        return;
                    }

                    var now = new Date().getTime();
                    const milliday = 86400000;

                    var multiplier = 1 + Math.log10(user.dailyMax+1);
                    var dailyScore = Math.round(50 * (multiplier));

                    sendEmbed(client);

                    //Claim
                    if (now - user.dailyTime > (milliday) && now - user.dailyTime < (2*milliday)){
                        console.log(`${user.username} claimed his/her daily reward! And is on a streak of:`);
                        collection.updateOne({ userID: interaction.user.id }, { $set: { score: user.score+dailyScore, dailyTime: now, dailyStreak: user.dailyStreak+1, dailyClaims: user.dailyClaims+1, dailyMax: Math.max(user.dailyMax, user.dailyStreak+1)}}, function(err, res){
                            if (err){
                                console.log(`Could not update daily for user: ${user.username}.\n${err}`);
                                return;
                            }
                            editDailyEmbed(client,interaction.user.id, `${user.username} got ${dailyScore} points from claiming your daily reward!`);

                            dbClient.close();
                        })
                    }
                    //Cooldown
                    else if (now - user.dailyTime < milliday){
                        console.log(`${user.username} tried to claim his/her daily reward, but is still on cooldown`);
                        editDailyEmbed(client,interaction.user.id, "Daily reward is still on cooldown!");
                        dbClient.close();
                        return;
                    }
                    //Lost Streak
                    else{
                        console.log(`${user.username} claimed his/her daily reward! But the streak has been lost`);
                        
                        collection.updateOne({ userID: interaction.user.id }, { $set: { score: user.score+dailyScore, dailyClaims: user.dailyClaims+1, dailyTime: now, dailyStreak: 0 }}, function(err, res){
                            if (err){
                                console.log(`Could not update daily for user: ${user.username}.\n${err}`);
                                return;
                            }

                            if (user.dailyClaims <= 7){
                                editDailyEmbed(client,interaction.user.id, `${user.username} got ${dailyScore} points!`);
                            }
                            else{
                                editDailyEmbed(client,interaction.user.id, `Looks like you lost your streak ${user.username}!\nAt least you got ${dailyScore} points!`);
                            }

                            dbClient.close();
                        })
                    }
                })
            })
        }
        else if (interaction.customId == "showStats"){
            const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

            dbClient.connect(err => {
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in index.js; claimDaily");
                    console.log(err);
                    return;
                }
                
                const collection = dbClient.db("Narkos").collection("Users");
                collection.findOne({ userID: interaction.user.id}).then(user => {
                    if (!user){
                        console.log(`Could not find user: ${interaction.user.id} in db!`);
                        return;
                    }
                    var voiceHour= Math.round((user.voiceTime/1000/60/60)*10)/10;
                    editDailyEmbed(client,interaction.user.id, `${user.username} has \`${voiceHour}\` hrs in voice chat.\nHas sent a total of \`${user.messages}\` messages.\nAnd has a current score of \`${user.score}\`!`);
                    dbClient.close();
                })
            })
        }
    }
    else if (interaction.isSelectMenu()){
        if (interaction.customId == "selectPage"){
            if (!interaction.values[0]) return;

            //eg page 1 = index 0
            const p = parseInt(interaction.values[0]) - 1;
            sendEmbed(client, undefined, p);
        }
    }
});



//Login to the discord API
client.login(token);