const Discord = require('discord.js')
const fs = require('fs');

//Sends and updates leaderboard and gives out ranks
function sendEmbed(discordClient = new Discord.Client(), GuildID, ChannelID){
    
    const statsChannel = discordClient.channels.cache.get(ChannelID);
    const guild = discordClient.guilds.cache.get(GuildID);
    const serverIcon = guild.iconURL();

    //Message embeds ids
    const embedID = fs.readFileSync("embed.json");
    const messageID = JSON.parse(embedID); 

    //Rank ids:
    const rank_delta = "491506230355951636";
    const rank_mafia = "693894552179834891";
    const rank_trusted = "491151062019997696";
    const rank_foreigners = "641358849865154581";
    const rank_dj = "451446408827109387";

    // Read users.json file 
    fs.readFile("users.json", function(err, data) { 
            
        // Check for errors 
        if (err) throw err; 
    
        // Converting to JSON 
        const users = JSON.parse(data); 

        //Sort by score
        users.sort(GetSortOrder("score"));

        //Give top user rank
        const topData = fs.readFileSync("top.json"); 
        const topRank = JSON.parse(topData); 

        if (topRank.userID != users[0].userID){
            let role = guild.roles.cache.find(role => role.id === "711141574964412416");

            RemoveRole(guild,topRank.userID,role);
            GiveRole(guild,users[0].userID, role);
            console.log(`Removed toprank from ${topRank.username} and gave it to ${users[0].username}`);

            fs.writeFileSync("top.json", JSON.stringify(users[0], null, 2), err => { if (err) throw err; });
        }
        
        let userScore='';
        let userNames = '';
        let userMsgTime = '';

        for (var i = 0; i < users.length; i++) {
            var score = users[i].score;
            var username = users[i].username;
            var messages = users[i].messages;
            var voiceTime= users[i].voiceTime;

            let voiceMins= voiceTime/1000/60;
            let voiceHour= Math.round((voiceMins/60)*10)/10;

            userNames += `\`${i + 1}\` ${username}\n`;
            userMsgTime += `\`${messages} messages / ${voiceHour} hours\`\n`;
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
            GiveRole(guild, users[i].userID, role);
            //console.log(`Gave rank ${role.name} to ${users[i].username}`);
        }

        const leaderboard = new Discord.MessageEmbed()
            .setAuthor(`Leaderboard for Narkos   /   ${guild.memberCount} members`)    //servericon or ,discordClient.user.avatarURL()
            .setColor('#0099ff') //.setColor(0x51267)
            .addFields(
                { name: 'Username', value: userNames,   inline: true },
                { name: 'Stats',    value: userMsgTime, inline: true },
                { name: 'Score',    value: userScore,   inline: true })
            .setFooter('Score:  5 points per message  /  30 points per hour');
        
        //Edit message, send it otherwise
        statsChannel.messages.fetch({around: messageID.leaderboard, limit: 1}).then(msg => {
            const fetchedMsg = msg.first();

            if (fetchedMsg != undefined){
                fetchedMsg.edit(leaderboard);
            }
            else{
                console.log("Scoreboard embed not found");
                statsChannel.send(leaderboard).then(sent => {
                    messageID.leaderboard = sent.id;

                    fs.writeFileSync("embed.json", JSON.stringify(messageID, null, 2), err => { if (err) throw err; });
                });
            }
        });

        const rewards = new Discord.MessageEmbed()
            .setAuthor(`Rewards for Narkos`)
            .setColor('#0099ff')
            .setThumbnail(serverIcon)
            .addFields(
                { name: 'Reward',           value: `<@&${"711141574964412416"}>\n<@&${rank_delta}>\n<@&${rank_mafia}>\n<@&${rank_trusted}>\n<@&${rank_foreigners}>\n<@&${rank_dj}>`, inline: true },
                { name: 'Required Score',   value: "Rank 1\n10 000\n5 000\n2 000\n500\nNone", inline: true })
            .setFooter('Updates when user leaves vc!');
        
        //Edit message, send it otherwise
        statsChannel.messages.fetch({around: messageID.rewards, limit: 1})
        .then(msg => {
            const fetchedMsg = msg.first();

            if (fetchedMsg != undefined){
                fetchedMsg.edit(rewards);
            }
            else{
                console.log("Rewards embed not found");
                statsChannel.send(rewards).then(sent => {
                    messageID.rewards = sent.id;
        
                    fs.writeFileSync("embed.json", JSON.stringify(messageID, null, 2), err => { if (err) throw err; });
                });
            }
        });
    })
}

//Returns comparer function
function GetSortOrder(prop) {    
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
async function GiveRole(guild,userID,role){
    try{
        (await guild.members.fetch(userID)).roles.add(role);
    }
    catch (error){
        console.log(`Can't give role to member, member not found.\nUser ID: ${userID}`);
    }
}

//Give role rewards
async function RemoveRole(guild,userID,role){
    try{
        (await guild.members.fetch(userID)).roles.remove(role);
    }
    catch (error){
        console.log(`Can't remove role to member.\nUser ID: ${userID}`);
    }
}


module.exports = {sendEmbed};