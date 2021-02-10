const Discord = require('discord.js')
const fs = require('fs');

//Sends and updates leaderboard and gives out ranks
function sendEmbed(discordClient = new Discord.Client(),ChannelID,messageID,message2ID){
    
    const statsChannel = discordClient.channels.cache.get(ChannelID);
    const guild = discordClient.guilds.cache.get("451365873668849664");
  
    // Read users.json file 
    fs.readFile("users.json", function(err, data) { 
            
        // Check for errors 
        if (err) throw err; 
    
        // Converting to JSON 
        const users = JSON.parse(data); 

        //Sort by voiceTime
        users.sort(GetSortOrder("score"));

        //Give top user rank
        let role = guild.roles.cache.find(role => role.id === "711141574964412416");
        GiveTopRole(guild,users[0].userID, role);
        //console.log(`Gave rank ${role.name} to ${users[0].username}`);
        
        let userScore='';
        let userNames = '';
        let userMsgTime = '';

        //console.log(users);
        
        for (let i = 0; i < users.length; i++) {
            var score = users[i].score;
            var username = users[i].username;
            var messages = users[i].messages;
            var voiceTime= users[i].voiceTime;

            var voiceMins= voiceTime/1000/60;
            var voiceHour= Math.round((voiceMins/60)*10)/10;

            userNames += `\`${i + 1}\` ${username}\n`;
            userMsgTime += `\`${messages} messages / ${voiceHour} hours\`\n`;
            userScore+= `\`${score}\`\n`;

            var score = users[i].score;

            //Role rewards (delta,mafia,trusted,foregeiner) + DJ
            if (score>10000){
                var rank = "491506230355951636"
            }
            else if(score>5000){
                var rank = "693894552179834891"
            }
            else if (score>2000){
                var rank = "491151062019997696"
            }
            else if (score > 500){
                var rank = "641358849865154581";
            }
            else{
                var rank = "451446408827109387";
            }

            let role = guild.roles.cache.find(role => role.id === rank);
            GiveTopRole(guild,users[i].userID, role);
            //console.log(`Gave rank ${role.name} to ${users[i].username}`);
        }

        const leaderboard = new Discord.MessageEmbed()
        //.setAuthor(`Leaderboard for Narkos (Started 08.02.2021)`, message.guild.iconURL({ dynamic: true }))
        .setAuthor(`Leaderboard for Narkos`)
        .setColor('#0099ff') //.setColor(0x51267)
        .addFields(
            { name: 'Username',    value: userNames, inline: true },
            { name: 'Stats',  value: userMsgTime, inline: true },
            { name: 'Score',     value: userScore, inline: true })
        .setFooter('Score:  5 points per message  /  30 points per hour');
        
        //statsChannel.send(leaderboard);
        statsChannel.messages.fetch({around: messageID, limit: 1})
        .then(msg => {
            const fetchedMsg = msg.first();
            fetchedMsg.edit(leaderboard);
        });

        const rewards = new Discord.MessageEmbed()
        //.setAuthor(`Leaderboard for Narkos (Started 08.02.2021)`, message.guild.iconURL({ dynamic: true }))
        .setAuthor(`Rewards for Narkos`)
        .setColor('#0099ff')
        .setThumbnail('https://i.imgur.com/5r6uISG.png')
        .addFields(
            { name: 'Reward',           value: `<@&${"711141574964412416"}>\n<@&${"491506230355951636"}>\n<@&${"693894552179834891"}>\n<@&${"491151062019997696"}>\n<@&${"641358849865154581"}>`, inline: true },
            { name: 'Required Score',   value: "Rank 1\n10 000\n5 000\n2 000\n500", inline: true })
        .setFooter('Updates on vc join!');
        
        //statsChannel.send(rewards);
        statsChannel.messages.fetch({around: message2ID, limit: 1})
        .then(msg => {
            const fetchedMsg = msg.first();
            fetchedMsg.edit(rewards);
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
async function GiveTopRole(guild,userID, role){
    (await guild.members.fetch(userID)).roles.add(role);
}


module.exports = {sendEmbed};