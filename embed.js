require('dotenv').config();

const Discord = require('discord.js')

const { MongoClient } = require('mongodb');
const { MessageActionRow, MessageButton } = require('discord.js');

const GuildID = process.env.SERVERID;                        //Discord server ID
const ChannelID = process.env.CHANNELID;                      //Channel where scoreboard should be posted

//Rank ids:
const rank_delta = "491506230355951636";
const rank_mafia = "693894552179834891";
const rank_trusted = "491151062019997696";
const rank_foreigners = "641358849865154581";
const rank_dj = "451446408827109387";

//Global variables
var guild = null;
var statsChannel = null;
var serverIcon = null;

//Mongodb
const dbPass = process.env.MONGOPASS;
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


//Sends and updates leaderboard and gives out ranks
function sendEmbed(client = new Discord.Client(), sort = {score: -1}){
    const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    //Update global variables
    guild = client.guilds.cache.get(GuildID);
    statsChannel = client.channels.cache.get(ChannelID);
    serverIcon = guild.iconURL({ dynamic: true, size: 256 });

    checkTop();

    dbClient.connect(err => {
        if (err) throw err;
        const collection = dbClient.db("Narkos").collection("Users");
        
        collection.find().sort(sort).toArray().then(users => {
            
            //User embeds slit up to 50
            let i = 0;
            while(users.length > 0){
                i++;
                leaderboardEmbed(users, i);
                //Remove 50
                users.splice(0,50);
            }
            dbClient.close();
        });
    })

    //Send rewards embed
    const rewards = new Discord.MessageEmbed()
    .setAuthor(`Rewards for Narkos`)
    .setColor(getRandomColor())
    .setThumbnail(serverIcon)
    .addFields(
        { name: 'Reward',           value: `<@&${"711141574964412416"}>\n<@&${rank_delta}>\n<@&${rank_mafia}>\n<@&${rank_trusted}>\n<@&${rank_foreigners}>\n<@&${rank_dj}>`, inline: true },
        { name: 'Required Score',   value: "Rank 1\n10 000\n5 000\n2 000\n500\nNone", inline: true })
    .setFooter('Updates when user leaves vc!');

    //Index 0 is rewards
    editEmbed(rewards, 0);
}

//Sees if the top user has changed
function checkTop(){
    const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    dbClient.connect(err => {
        if (err) throw err;

        const collection = dbClient.db("Narkos").collection("Users");
        
        collection.find().sort({score: -1}).toArray().then(users => {
            const userTop = users[0];

            //See if we got a new top rank
            dbClient.db("Narkos").collection("Top").findOne().then(top => {
                //console.log(top);
                if (top.userID != userTop.userID){
                    let role = guild.roles.cache.find(role => role.id === "711141574964412416");

                    removeRole(top.userID,role);
                    giveRole(userTop.userID,role);
                    console.log(`Removed toprank from ${top.username} and gave it to ${userTop.username}`);

                    //Write to db
                    var newValues = { $set: { 
                        userID:    userTop.userID,
                        username:  userTop.username,
                        messages:   userTop.messages,
                        voiceTime:  userTop.voiceTime,
                        voiceJoin:  userTop.voiceJoin,
                        score: userTop.score
                    }  };

                    dbClient.db("Narkos").collection("Top").updateOne({userID: top.userID}, newValues, function(err, res) {
                        if (err) throw err;
                        dbClient.close();
                    })
                }
                else{
                    dbClient.close();
                }
            });
        });
    })
}

function leaderboardEmbed(users, iteration){
    //Str
    let userScore='';
    let userNames = '';
    let userMsgTime = '';

    //Max 50 per embed size limit (1024 characters) per field value
    for (var i = 0; i < 50 && i < users.length; i++) {
        var score = users[i].score;
        var voiceMins= users[i].voiceTime/1000/60;
        var voiceHour= Math.round((voiceMins/60)*10)/10;

        //⌛ 💬
        userNames += `\`${iteration * (i + 1)}\` ${users[i].username}\n`;
        userMsgTime += `\`${voiceHour} hrs / ${users[i].messages} msg\`\n`;
        userScore+= `\`${score}\`\n`;

        //Role rewards (delta,mafia,trusted,foregeiner) + DJ
        var rank = rank_dj;
        
        if (score >= 10000){
            rank = rank_delta;
        }
        else if (score >= 5000){
            rank = rank_mafia;
        }
        else if (score >= 2000){
            rank = rank_trusted;
        }
        else if (score >= 500){
            rank = rank_foreigners;
        }

        let role = guild.roles.cache.find(role => role.id === rank);

        //console.log(`Gave rank ${role.name} to ${users[i].username}`);
        giveRole(users[i].userID, role);
    }

 
    let leaderboard = new Discord.MessageEmbed()
        .setColor(getRandomColor()) //.setColor(0x51267)
        .addFields(
            { name: 'Username', value: userNames,   inline: true },
            { name: 'Stats',    value: userMsgTime, inline: true },
            { name: 'Score',    value: userScore,   inline: true })
        .setFooter('Score:  5 points per message  /  30 points per hour');

    //Top leaderboard
    if (iteration == 1){
        leaderboard = new Discord.MessageEmbed()
            .setAuthor(`Leaderboard for Narkos   /   ${guild.memberCount} members`)    //servericon or ,client.user.avatarURL()
            .setColor(getRandomColor()) //.setColor(0x51267)
            .addFields(
                { name: 'Username', value: userNames,   inline: true },
                { name: 'Stats',    value: userMsgTime, inline: true },
                { name: 'Score',    value: userScore,   inline: true })
            .setFooter('Score:  5 points per message  /  30 points per hour');
    }
    editEmbed(leaderboard, iteration);
}

//Smal embed that shows a user's stats
function editUserEmbed(user){
    var voiceMins= user.voiceTime/1000/60;
    var voiceHour= Math.round((voiceMins/60)*10)/10;

    getMember(user.userID).then(member =>{
        let userCard;
        if (member){
            userCard = new Discord.MessageEmbed()
            .setAuthor(`${user.username}'s stats`)
            .setColor(getRandomColor()) //.setColor(0x51267)
            .setThumbnail(member.user.avatarURL({ dynamic: true }))
            .addFields(
                { name: 'Hours',    value: `\`${voiceHour}\``,   inline: true },
                { name: 'Messages', value: `\`${user.messages}\``, inline: true },
                { name: 'Score',    value: `\`${user.score}\``,   inline: true })
            .setFooter('First Joined Discord On')
            .setTimestamp(member.user.createdAt);
        }
        //If user has left the server
        else{
            userCard = new Discord.MessageEmbed()
            .setAuthor(`${user.username}'s stats`)
            .setColor(getRandomColor()) //.setColor(0x51267)
            .addFields(
                { name: 'Hours',    value: `\`${voiceHour}\``,   inline: true },
                { name: 'Messages', value: `\`${user.messages}\``, inline: true },
                { name: 'Score',    value: `\`${user.score}\``,   inline: true })
            .setFooter('First Joined Discord On');
        }

        //-1 is reseved for userCards
        editEmbed(userCard, -1);
    })
}

function editEmbed(embed, i){
    const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    //Connect to db
    dbClient.connect(err => {
        if (err) throw err;

        const collection = dbClient.db("Narkos").collection("Embeds");

        collection.find({ iteration: i }).toArray().then(embeds => {

            if (embeds[0]){
                //Edit message, send it otherwise
                statsChannel.messages.fetch({around: embeds[0].id, limit: 1}).then(msg => {
                    const fetchedMsg = msg.first();

                    if (fetchedMsg != undefined){
                        //Add buttons for sorting options
                        if (i == 1){
                            const buttonMsg = new MessageButton()
                                .setCustomId('sortByMsg')
                                .setLabel('Messages')
                                .setStyle('PRIMARY');

                            const buttonScore = new MessageButton()
                                .setCustomId('sortByScore')
                                .setLabel('Score')
                                .setStyle('SUCCESS');

                            const buttonHrs = new MessageButton()
                                .setCustomId('sortByHrs')
                                .setLabel('Hours')
                                .setStyle('DANGER');

                            const buttonRepo = new MessageButton()
                                .setLabel('Git')
                                .setURL("https://github.com/Veggissss/betaBot")
                                .setStyle('LINK');

                            const row = new MessageActionRow()
                            .addComponents(
                                buttonHrs,buttonMsg,buttonScore,buttonRepo
                            );

                            fetchedMsg.edit({ embeds: [embed], components: [row] });
                        }
                        //User stat card
                        else if (i == -1){
                            const buttonName = new MessageButton()
                                .setCustomId('updateName')
                                .setLabel('Update Username')
                                .setStyle('SUCCESS');
                                
                            const buttonRandom = new MessageButton()
                                .setCustomId('updateRandom')
                                .setLabel('Random User')
                                .setStyle('DANGER');

                            const row = new MessageActionRow()
                            .addComponents(
                                buttonName,buttonRandom
                            );

                            fetchedMsg.edit({ embeds: [embed], components: [row] });
                        }
                        else{
                            fetchedMsg.edit({ embeds: [embed], components: [] });
                        } 
                    }
                    else{
                        console.log("Rewards embed not found");
                    }

                    //Close connection
                    dbClient.close();
                });
            }
            else{
                console.log("Could't find iteration: ",i);
                statsChannel.send({ embeds: [embed]}).then(sent => {
                    //Write to db
                    var newValues = { 
                        iteration: i,
                        id: sent.id
                    };

                    //Add to db
                    collection.insertOne(newValues, function(err, res) {
                        if (err) throw err;
                        //Close db connection
                        dbClient.close();
                    });
                });
            }
        })
    })
}

//Get a random color
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


//Give role rewards
function giveRole(userID,role){
    getMember(userID).then(member => {
        if (member == null){
            return;
        }
        member.roles.add(role);
    })
}

//Give role rewards
function removeRole(userID,role){
    getMember(userID).then(member => {
        if (member == null){
            return;
        }
        member.roles.remove(role);
    })
}

//Get guildMember
async function getMember(userID){
    try {
        return await guild.members.fetch(userID);
    } catch (error) {
        //console.log(`Member not found: ${userID}`);
        return null;
    }
}


module.exports = {sendEmbed, editUserEmbed};