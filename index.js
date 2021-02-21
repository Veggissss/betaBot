//Author Veggissss
//StatBot started 08.02.2021
//Calculates time spent in vc and the amount messages sendt per user

//Import local files
const config = require('./settings.json');
const embed  = require('./embed.js');

const Discord = require('discord.js');                              //Remember you need "npm i opusscript" to play sounds!
const fs = require('fs');

//Create discord client
const discordClient = new Discord.Client();                         //{partials: ["MESSAGE","CHANNEL","REACTION","USER","GUILD_MEMBER"]}

//Global Variables
const discordServerID = "451365873668849664";                       //Discord server ID
const discordChannelID = "808649489307926529";                      //Channel where scoreboard should be posted
const afkChannels = ["451371568577249281","808276679389610005"];    //Channels that gives 0 points

//discord startup:
discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!\n`)
  discordClient.user.setActivity("with fire!", {type: "PLAYING"});  //LISTENING //PLAYING
})

//Direct Messages:
discordClient.on('message', (message) => {
  if(!message.author.bot){
    //console.log(message.content);

    //Ignore DMs
    if (message.channel.type == "dm"){
        return
    }

    // Read users.json file 
    fs.readFile("users.json", function(err, data) { 
        
        // Check for errors 
        if (err) throw err; 
    
        // Converting to JSON 
        const users = JSON.parse(data); 

        let search = searchID(users, message.author.id);
        let userFound = search[0], n = search[1];

        //console.log(userFound,n);
        if (userFound){
            var entry = users[n];
            entry.messages += 1;

            //5 points for message, 30 points per hour in vc
            var calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)))
            var newScore = Math.round(calculation)
            
            entry.score = newScore;

            console.log(`${message.author.username} has sent ${entry.messages} messages`);

            fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err;  });

            //Update leaderboard embed
            embed.sendEmbed(discordClient, discordServerID, discordChannelID);
        }
        else{
            // Defining new user 
            let user = { 
                userID:    message.member.id,
                username:  message.member.user.username,
                messages:   0,
                voiceTime:  0,
                voiceJoin:  0,
                afkJoin: 0,
                score: 0
            }; 
            //Add new user to json
            users.push(user);
            fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });

            //Update leaderboard embed
            embed.sendEmbed(discordClient, discordServerID, discordChannelID);
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
            
            // Check for errors 
            if (err) throw err; 
        
            // Converting to JSON 
            const users = JSON.parse(data); 

            let search = searchID(users, oldMember.member.id);
            let userFound = search[0]
            let n = search[1];

            //console.log(userFound,n);
            if (userFound){
                var entry = users[n];

                //If channel is afk no points is given
                if (afkChannels.includes(oldMember.channelID) || (afkChannels.includes(newMember.channelID))){
                    entry.afkJoin = joinTime;
                }
                else{
                    entry.afkJoin = 0;
                }

                entry.voiceJoin = joinTime;

                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err;  });
            }else{
                // Defining new user 
                let user = { 
                    userID:    oldMember.member.id,
                    username:  oldMember.member.user.username,
                    messages:   0,
                    voiceTime:  0,
                    voiceJoin:  joinTime,
                    afkJoin: 0,
                    score: 0
                }; 

                //Add new user to json
                users.push(user);
                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
            }
        }); 
    
    //User leaves
    }else if (newVoice == null) {
        console.log(`${username} left!\n`);

        var date = new Date();
        var leaveTime = date.getTime();

        // Read users.json file 
        fs.readFile("users.json", function(err, data) { 
            if (err) throw err; 
        
            // Converting to JSON array
            const users = JSON.parse(data); 

            //See if userID is in json
            let search = searchID(users, oldMember.member.id);

            //Boolean and an array index
            var userFound = search[0], n = search[1];

            //console.log(userFound,n);
            if (userFound){
                var entry = users[n];

                joinTime = entry.voiceJoin;

                afkTime = entry.afkJoin;

                if (afkTime != 0){
                    time = afkTime - joinTime;
                }
                else{
                    time = leaveTime - joinTime;
                }
                
                console.log(`${entry.username} was in vc for ${time/1000}s\n`);

                entry.voiceTime += time;

                //5 points for message, 30 points per hour in vc
                let calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)))
                let newScore = Math.round(calculation)
                
                entry.score = newScore;

                fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });

                //Update leaderboard embed
                embed.sendEmbed(discordClient, discordServerID, discordChannelID);

            } else {
                console.log("User not found.");
            }
        })
    } 

    //User switches voice channel
    else {
        console.log(`${username} switched channels!`);

        if (afkChannels.includes(oldMember.channelID) || (afkChannels.includes(newMember.channelID))){
            console.log(`${oldMember.member.displayName} is afk`);

            // Read users.json file 
            fs.readFile("users.json", function(err, data) { 
                if (err) throw err; 
            
                // Converting to JSON 
                const users = JSON.parse(data); 

                //See if userID is in json
                let search = searchID(users, oldMember.member.id);

                //Boolean and an array index
                var userFound = search[0], n = search[1];

                //console.log(userFound,n);
                if (userFound){
                    var entry = users[n];

                    var date = new Date();
                    var afkTime = date.getTime();

                    entry.afkJoin = afkTime;

                    fs.writeFileSync("users.json", JSON.stringify(users,null,2), err => { if (err) throw err; });
                }
                else{console.log("User not found.");}
            })
        }
    }
})

//Find user by id and return bool and index
function searchID(users, id){
    for (var n in users){
        if (users[n].userID == id){
            //console.log("Found UserID");
            return [true, n];
        }
    }
    //console.log("User not Found :P");
    return [false, null];
}


//Login to the discord API
discordClient.login(config.discord_token)