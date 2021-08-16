//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user
require('dotenv').config();

const express = require('express');
const PORT = process.env.PORT || 5000;

express().listen(PORT, () => console.log(`Listening on ${ PORT }`));

//Import local
const token = process.env.TOKEN;
const embed  = require('./embed.js');
       
const fs = require('fs');
const Discord = require('discord.js');       //Remember you need "npm i opusscript" to play sounds!

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

        //Update leaderboard embed
        embed.sendEmbed(discordClient, discordServerID, discordChannelID);

        //From autor, manual leave
        if (message.author.id == "277082056498872321" && message.content.startsWith("stop")){
            var date = new Date();
            var leaveTime = date.getTime();

            const guild = discordClient.guilds.cache.get(discordServerID);
            const channels = guild.channels.cache.filter(c => c.type === 'voice');

            for (const [channelID, channel] of channels) {
                for (const [memberID, member] of channel.members) {
                    /*member.setVoiceChannel('497910775512563742') //(id / null for disconnect)
                    .then(() => console.log(`Moved ${member.user.tag}.`))
                    .catch(console.error);*/
                    // Read users.json file 
                    fs.readFile("users.json", function(err, data) { 
                        if (err) throw err; 
                    
                        // Converting to JSON array
                        const users = JSON.parse(data); 

                        //See if userID is in json
                        let n = searchID(users, memberID);

                        //console.log(userFound,n);
                        if (n){
                            joinTime = users[n].voiceJoin;
                            time = leaveTime - joinTime;
                           
                            //Check if user join before bot started
                            if (joinTime - bootTime < 0){
                                console.log(`${users[n].username} joined before bot started :P`);
                                time = 0;
                            }
                            
                            console.log(`${users[n].username} was in vc for ${time/1000}s\n`);

                            users[n].voiceTime += time;
                            users[n].score = calculateScore(users[n]);
                            
                            //Update last user activity embed
                            embed.editUserEmbed(users[n]);

                            fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
                        }
                        else{
                            console.log(`Found no user: ${memberID}!`);
                        }
                    })
                }
            }
            //Update leaderboard embed
            embed.sendEmbed(discordClient, discordServerID, discordChannelID);

            //Quit
            stop();
        }
        return;
    }

    //NOT DM
    // Read users.json file 
    fs.readFile("users.json", function(err, data) { 
        
        // Check for errors 
        if (err) throw err; 
    
        // Converting to JSON 
        const users = JSON.parse(data); 

        let n = searchID(users, message.author.id);

        //console.log(userFound,n);
        if (n){
            users[n].messages += 1;
            users[n].score = calculateScore(users[n]);

            console.log(`${message.author.username} has sent ${users[n].messages} messages`);

            fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err;  });

            //Update leaderboard embed
            embed.sendEmbed(discordClient, discordServerID, discordChannelID);

            //Update last user activity embed
            embed.editUserEmbed(users[n]);
        }
        else{
            // Defining new user 
            let userEntry = { 
                userID:    message.member.id,
                username:  message.member.user.username,
                messages:   1,
                voiceTime:  0,
                voiceJoin:  0,
                score: 5
            }; 
            //Add new user to json
            users.push(userEntry);
            fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });

            //Update leaderboard embed
            embed.sendEmbed(discordClient, discordServerID, discordChannelID);

            //Update last user activity embed
            embed.editUserEmbed(userEntry);
        }
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

        // Read users.json file 
        fs.readFile("users.json", function(err, data) { 
            if (err) throw err; 
        
            // Converting to JSON 
            const users = JSON.parse(data); 
            let n = searchID(users, oldMember.member.id);

            //console.log(userFound,n);
            if (n){
                //If channel is afk no points is given
                if (afkChannels.includes(newVoice)){
                    users[n].voiceJoin = 0;
                }
                else{
                    users[n].voiceJoin = joinTime;
                }

                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err;  });
            }else{
                // Defining new user 
                let userEntry = { 
                    userID:    oldMember.member.id,
                    username:  oldMember.member.user.username,
                    messages:   0,
                    voiceTime:  0,
                    voiceJoin:  joinTime,
                    score: 0
                }; 

                //Add new user to json
                users.push(userEntry);
                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
            }
        }); 
    
    //User leaves
    }else if (newVoice == null) {
        console.log(`${username} left!\n`);

        // Read users.json file 
        fs.readFile("users.json", function(err, data) { 
            if (err) throw err; 
        
            // Converting to JSON array
            const users = JSON.parse(data); 

            //See if userID is in json
            let n = searchID(users, oldMember.member.id);

            //console.log(userFound,n);
            if (n){
                let user = users[n];
                let time;

                var date = new Date();
                var leaveTime = date.getTime();
                var joinTime = user.voiceJoin;

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
                
                console.log(`${user.username} was in vc for ${time/1000}s\n`);

                //Credit user
                user.voiceTime += time;
                user.score = calculateScore(user);
           
                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });

                //Update leaderboard embed
                embed.sendEmbed(discordClient, discordServerID, discordChannelID);

                //Update last user activity embed
                embed.editUserEmbed(user);

            } else {
                console.log(`User not found in list: ${oldMember.member.id}`);
            }
        })
    } 

    //User switches voice channel
    else {
        console.log(`${username} switched channels!`);

        if ((afkChannels.includes(newVoice))){
            console.log(`${oldMember.member.displayName} is afk`);

            //Write time to user

            // Read users.json file 
            fs.readFile("users.json", function(err, data) { 
                if (err) throw err; 
            
                // Converting to JSON 
                const users = JSON.parse(data); 

                //See if userID is in json
                let n = searchID(users, oldMember.member.id);

                //console.log(userFound,n);
                if (n){
                    let user = users[n];

                    var date = new Date();
                    var leaveTime = date.getTime();
                    var joinTime = users[n].voiceJoin;

                    let time = leaveTime - joinTime;

                    //Check if user join before bot started
                    if (joinTime - bootTime < 0){
                        console.log(`${username} joined before bot started!`);
                        time = 0;
                    }
                    
                    console.log(`${user.username} was in vc for ${time/1000}s\n`);

                    //Credit user
                    user.voiceTime += time;
                    user.score = calculateScore(user);
        
                    user.voiceJoin = 0;

                    fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
                }
                else{
                    console.log(`User not found, ID: ${oldMember.member.id}`);
                }
            })
        }
        else if (afkChannels.includes(oldVoice)){
            console.log(`${oldMember.member.displayName} is no longer afk`);

            //start time user

            // Read users.json file 
            fs.readFile("users.json", function(err, data) { 
                if (err) throw err; 
            
                // Converting to JSON 
                const users = JSON.parse(data); 

                //See if userID is in json
                let n = searchID(users, oldMember.member.id);

                //console.log(userFound,n);
                if (n){
                    var date = new Date();
                    var joinTime = date.getTime();
            
                    users[n].voiceJoin = joinTime;

                    fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
                }
                else{
                    console.log(`User could not be found ID: ${oldMember.member.id}`);
                }
            })
        }
    }
})

function calculateScore(entry){
    //5 points for message, 30 points per hour in vc
    let calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)));
    return Math.round(calculation);
}

//Find user by id, if not found then = null
function searchID(users, id){
    for (var n in users){
        if (users[n].userID == id){
            //console.log("Found UserID");
            return n;
        }
    }
    //console.log("User not Found :P");
    return null;
}

//Stop the bot and logout from discord api
function stop(){
    console.log(`Logging out: ${discordClient.user.tag}!\n`)
    discordClient.user.setActivity("with stats!", {type: "PLAYING"});  //LISTENING //PLAYING

    //Destoy client after 5 sec
    const timer = ms => new Promise( res => setTimeout(res, ms));
    timer(5000).then( _ => discordClient.destroy() );
}


//Login to the discord API
discordClient.login(token);