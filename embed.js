const Discord = require('discord.js')
const fs = require('fs');

//Rank ids:
const rank_delta = "491506230355951636";
const rank_mafia = "693894552179834891";
const rank_trusted = "491151062019997696";
const rank_foreigners = "641358849865154581";
const rank_dj = "451446408827109387";

//Global variables
let guild = null;
let statsChannel = null;
let serverIcon = null;

//Sends and updates leaderboard and gives out ranks
function sendEmbed(discordClient = new Discord.Client(), GuildID, ChannelID){
    
    //Update global variables
    guild = discordClient.guilds.cache.get(GuildID);
    statsChannel = discordClient.channels.cache.get(ChannelID);
    serverIcon = guild.iconURL({ format: 'gif', dynamic: true, size: 256 });

    // Read users.json file 
    fs.readFile("users.json", function(err, data) { 
            
        // Check for errors 
        if (err) throw err; 
    
        // Converting to JSON obj
        const users = JSON.parse(data); 

        //Sort by score
        users.sort(getSortOrder("score"));

        //Give top user rank
        const topData = fs.readFileSync("top.json"); 
        const topRank = JSON.parse(topData);

        if (topRank.userID != users[0].userID){
            let role = guild.roles.cache.find(role => role.id === "711141574964412416");

            removeRole(topRank.userID,role);
            giveRole(users[0].userID,role);
            console.log(`Removed toprank from ${topRank.username} and gave it to ${users[0].username}`);

            fs.writeFileSync("top.json", JSON.stringify(users[0], null, 2), err => { if (err) throw err; });
        }
        
        //User embeds slit up to 50
        let i = 0;
        while(users.length > 0){
            i++;
            leaderboardEmbed(users, i);
            //Remove 50
            users.splice(0,50);
        }

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
        userNames += `\`${i + 1}\` ${users[i].username}\n`;
        userMsgTime += `\`${voiceHour} hrs / ${users[i].messages} msg\`\n`;
        userScore+= `\`${score}\`\n`;

        //Role rewards (delta,mafia,trusted,foregeiner) + DJ
        switch(score){
            case 10000:
                var rank = rank_delta;
                break;
            case 5000:
                var rank = rank_mafia;
                break;
            case 2000:
                var rank = rank_trusted;
                break;
            case 500:
                var rank = rank_foreigners;
                break;
            default:
                var rank = rank_dj;
                break;
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
            .setAuthor(`Leaderboard for Narkos   /   ${guild.memberCount} members`)    //servericon or ,discordClient.user.avatarURL()
            .setColor(getRandomColor()) //.setColor(0x51267)
            .addFields(
                { name: 'Username', value: userNames,   inline: true },
                { name: 'Stats',    value: userMsgTime, inline: true },
                { name: 'Score',    value: userScore,   inline: true })
            .setFooter('Score:  5 points per message  /  30 points per hour');
    }
    editEmbed(leaderboard, iteration);
}

function editUserEmbed(user){
    var voiceMins= user.voiceTime/1000/60;
    var voiceHour= Math.round((voiceMins/60)*10)/10;

    getMember(user.userID).then(member =>{
        let userCard = new Discord.MessageEmbed()
        .setAuthor(`${user.username}'s stats`)
        .setColor(getRandomColor()) //.setColor(0x51267)
        .setThumbnail(member.user.avatarURL({ dynamic: true }))
        .addFields(
            { name: 'Hours',    value: voiceHour,   inline: true },
            { name: 'Messages', value: user.messages, inline: true },
            { name: 'Score',    value: user.score,   inline: true })
        .setFooter('Shows last active user')
        .setTimestamp();

        //-1 is reseved for userCards
        editEmbed(userCard, -1);
    })
}

function editEmbed(embed, i){
    //Message embeds ids
    const embedID = fs.readFileSync("embed.json");
    const embedJson = JSON.parse(embedID); 

    //Find index
    let n = searchJson(embedJson, i);

    if (n){
        //Edit message, send it otherwise
        statsChannel.messages.fetch({around: embedJson[n].id, limit: 1}).then(msg => {
            const fetchedMsg = msg.first();

            if (fetchedMsg != undefined){
                fetchedMsg.edit(embed);
            }
            else{
                console.log("Rewards embed not found");
            }
        });
    }
    else{
        console.log("Could't find iteration: ",i);
        statsChannel.send(embed).then(sent => {
            let newMessageID = {
                iteration: i,
                id: sent.id
            };

            embedJson.push(newMessageID);

            fs.writeFileSync("embed.json", JSON.stringify(embedJson, null, 2), err => { if (err) throw err; });
        });
    }
}

//Find user by id, if not found then = null
function searchJson(jsonArray, i){
    for (var n in jsonArray){
        if (jsonArray[n].iteration == i){
            //console.log("Found UserID");
            return n;
        }
    }
    //console.log("User not Found :P");
    return null;
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

//Returns comparer function
function getSortOrder(prop) {    
    return function(a, b) {    
        if (a[prop] > b[prop]) {    
            return -1;    
        } 
        else if (a[prop] < b[prop]) {    
            return 1;    
        }    
        return 0;    
    }    
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
        console.log(`Member not found: ${userID}`);
        return null;
    }
}


module.exports = {sendEmbed, editUserEmbed};