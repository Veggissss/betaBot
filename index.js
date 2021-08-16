//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user
require('dotenv').config();

const Discord = require('discord.js');       //Remember you need "npm i opusscript" to play sounds!
const fs = require('fs');
const { MongoClient } = require('mongodb')

//Import local
const token = process.env.TOKEN;
const dbPass = process.env.MONGOPASS;
const embed  = require('./embed.js');

//Mongodb
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//Create discord client
const discordClient = new Discord.Client();                         //{partials: ["MESSAGE","CHANNEL","REACTION","USER","GUILD_MEMBER"]}

//Update bootime
const dt = new Date();
const bootTime = dt.getTime();

//Global Variables
const discordServerID = "451365873668849664";                       //Discord server ID
const discordChannelID = "808649489307926529";                      //Channel where scoreboard should be posted
const afkChannels = ["451371568577249281","808276679389610005"];    //Channels that gives 0 points

//discord startup:
discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!\n`)
  discordClient.user.setActivity("To User Activity", {type: "LISTENING"});  //LISTENING //PLAYING
})


//Messages:
discordClient.on('message', (message) => {
  if(!message.author.bot){
    //DMs
    if (message.channel.type == "dm"){
        console.log(message.content);
        return;
    }

    //NOT DM
    // Read users.json file 
    dbClient.connect(err => {
        if (err) throw err;

        const collection = dbClient.db("Narkos").collection("Users");
        collection.find({userID: message.author.id}).toArray().then(user=>{
            
            //User in db
            if (user[0]){
                console.log(`${message.author.username} has sent ${user[0].messages} messages`);

                var newValues = { $set: {
                    messages: user[0].messages+1, 
                    score: calculateScore(user[0]) 
                }};
                collection.updateOne({userID: message.author.id}, newValues).then(res =>{
                    //console.log("UPDATED!");
                    
                    //Close db connection
                    dbClient.close();
                });

                //Update leaderboard embed
                embed.sendEmbed(discordClient, discordServerID, discordChannelID);

                //Update last user activity embed
                embed.editUserEmbed(user[0]);

            }
            else{
                console.log("User not found!");
                // Defining new user 
                let userEntry = { 
                    userID:    message.member.id,
                    username:  message.member.user.username,
                    messages:   1,
                    voiceTime:  0,
                    voiceJoin:  0,
                    score: 5
                }; 

                //Add to db
                collection.insertOne(userEntry, function(err, res) {
                    if (err) throw err;
                    console.log(`Added ${message.member.user.username} to db!`);
                    
                    //Close db connection
                    dbClient.close();
                });

                //Update leaderboard embed
                embed.sendEmbed(discordClient, discordServerID, discordChannelID);

                //Update last user activity embed
                embed.editUserEmbed(userEntry);
            }
        })
    })
  }
})


//Triggered when user joins/leaves mutes/unmutes. The lather really sucks...
discordClient.on("voiceStateUpdate", (oldMember, newMember)=> { 
    //console.log("Update");
    let username = oldMember.member.user.username;

    let oldVoice = oldMember.channelID; 
    let newVoice = newMember.channelID; 

    //Ignore no changes
    if (oldVoice == newVoice) {
        return
    }
    //Ignore bots
    if (oldMember.member.user.bot){
        return
    }

    //User Joins
    if (oldVoice == null) {
        console.log(`${username} joined!`);

        var date = new Date();
        var joinTime = date.getTime();

        dbClient.connect(err => {
            if (err) throw err;
    
            const collection = dbClient.db("Narkos").collection("Users");
            collection.find({userID: oldMember.member.user.id}).toArray().then(user=>{
                
                //User in db
                if (user[0]){
                    let time;
                    //If channel is afk no points is given
                    if (afkChannels.includes(newVoice)){
                        time = 0;
                    }
                    else{
                        time = joinTime;
                    }

                    var newValues = { $set: {
                        voiceJoin: time 
                    } };

                    collection.updateOne({userID: oldMember.member.user.id}, newValues).then(res =>{
                        //console.log("Updated: "+time);
                        
                        //Close db connection
                        dbClient.close();
                    });
                }
                else{
                // Defining new user 
                let userEntry = { 
                    userID:    oldMember.member.id,
                    username:  oldMember.member.user.username,
                    messages:   0,
                    voiceTime:  0,
                    voiceJoin:  joinTime,
                    score: 0
                }; 

                //Add to db
                collection.insertOne(userEntry, function(err, res) {
                    if (err) throw err;
                    //console.log(`Added ${oldMember.member.user.username} to db!`);
                    
                    //Close db connection
                    dbClient.close();
                });
            }
        
        })
    })
        //User leaves
    }else if (newVoice == null) {
        console.log(`${username} left!\n`);

        dbClient.connect(err => {
            if (err) throw err;
    
            const collection = dbClient.db("Narkos").collection("Users");
            collection.find({userID: oldMember.member.user.id}).toArray().then(user=>{
                
                //User in db
                if (user[0]){
                    let time;

                    var date = new Date();
                    var leaveTime = date.getTime();

                    var joinTime = user[0].voiceJoin;

                    //See if user left a afk channel
                    if (afkChannels.includes(oldVoice)){
                        console.log(`${username} left an afk channel`);
                        time = 0;
                    }
                    else{
                        time = leaveTime - joinTime;
                    }

                    //Check if user join before bot started
                    if (joinTime - bootTime < 0){
                        console.log(`${username} joined before bot started!`);
                        time = 0;
                    }
                    
                    console.log(`${user[0].username} was in vc for ${time/1000}s\n`);

                    //Write to db
                    var newValues = { $set: {
                        voiceTime: user[0].voiceTime + time,
                        score: calculateScore(user[0]) 
                    } };

                    collection.updateOne({userID: oldMember.member.user.id}, newValues).then(res =>{
                        //console.log("Updated: "+oldMember.member.user.id);
                        
                        //Close db connection
                        dbClient.close();
                    });
                    

                    //Update leaderboard embed
                    embed.sendEmbed(discordClient, discordServerID, discordChannelID);

                    //Update last user activity embed
                    embed.editUserEmbed(user[0]);
                }
                else {
                    console.log(`User not found in db: ${oldMember.member.user.id}`);
                }
            })
        })
    } 

    //User switches voice channel
    else {
        console.log(`${username} switched channels!`);

        if ((afkChannels.includes(newVoice))){
            console.log(`${oldMember.member.displayName} is afk`);

            //Write time to user
            dbClient.connect(err => {
                if (err) throw err;
        
                const collection = dbClient.db("Narkos").collection("Users");
                collection.find({userID: oldMember.member.user.id}).toArray().then(user=>{
                    
                    //User in db
                    if (user[0]){
                        var date = new Date();
                        var leaveTime = date.getTime();
                        var joinTime = user[0].voiceJoin;

                        let time = leaveTime - joinTime;

                        //Check if user join before bot started
                        if (joinTime - bootTime < 0){
                            console.log(`${username} joined before bot started!`);
                            time = 0;
                        }
                        
                        console.log(`${user[0].username} was in vc for ${time/1000}s\n`);

                        //Write to db
                        var newValues = { $set: {
                            voiceTime: user[0].voiceTime + time,
                            voiceJoin: 0,
                            score: calculateScore(user[0])
                        } };

                        collection.updateOne({userID: oldMember.member.user.id}, newValues).then(res =>{
                            //console.log("Updated: "+oldMember.member.user.id);
                            
                            //Close db connection
                            dbClient.close();
                        });
                    }
                    else{
                        console.log(`User not found, ID: ${oldMember.member.user.id}`);
                    }
                })
            })
        }
        else if (afkChannels.includes(oldVoice)){
            console.log(`${oldMember.member.displayName} is no longer afk`);

            //start time user

            dbClient.connect(err => {
                if (err) throw err;
        
                const collection = dbClient.db("Narkos").collection("Users");
                collection.find({userID: oldMember.member.user.id}).toArray().then(user=>{
                    
                    //User in db
                    if (user[0]){
                        var date = new Date();
                        var joinTime = date.getTime();
                
                        user[0].voiceJoin = joinTime;

                        //Write to db
                        var newValues = { $set: {
                            voiceJoin: joinTime
                        } };

                        collection.updateOne({userID: oldMember.member.user.id}, newValues).then(res =>{
                            //console.log("Updated: "+oldMember.member.user.id);
                            
                            //Close db connection
                            dbClient.close();
                        });
                    }
                    else{
                        console.log(`User could not be found ID: ${oldMember.member.user.id}`);
                    }
                })
            })
        }
    }
})

function calculateScore(entry){
    //5 points for message, 30 points per hour in vc
    let calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)));
    return Math.round(calculation);
}

//Login to the discord API
discordClient.login(token);