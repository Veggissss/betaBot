const { Client, MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

//Global variables
var guild = null;
var statsChannel = null;

//Get config
const config = require('./config.js');

//Mongodb
const dbClient = config.getDatabaseClient();
const GuildID = config.getGuildId();
const scoreboardChannelId = config.getScoreboardChannelId();

const rankRewards = config.getRankRewards();

var currentSort = { score: -1 };
var currentPage = 0;

//Sends and updates leaderboard and gives out ranks
function sendEmbed(client = new Client(), sort = currentSort, page = currentPage) {
    currentSort = sort;
    currentPage = page;

    //Update global variables
    guild = client.guilds.cache.get(GuildID);
    statsChannel = client.channels.cache.get(scoreboardChannelId);

    //Get serverIcon
    var serverIcon = guild.iconURL({ dynamic: true, size: 256 });

    //Check for updated topuser
    checkTop();

    //Get users value based on sort and page
    dbClient.connect(err => {
        //if (err) throw err;
        if (err) {
            console.log("Could not connect to db in embed.js");
            console.log(err);
            return;
        }
        const collection = dbClient.db("Narkos").collection("Users");

        collection.find().sort(sort).toArray().then(users => {
            //User embeds slit up to 30
            const offset = page * 30;
            users = users.slice(offset, offset + 30);

            leaderboardEmbed(users, page);
        });
    })

    //Send rewards embed
    const rewards = new MessageEmbed()
        .setAuthor(`Rewards for Narkos`)
        .setColor(getRandomColor())
        .setThumbnail(serverIcon)
        .addFields(
            { name: 'Reward', value: `<@&${rankRewards[5]}>\n<@&${rankRewards[4]}>\n<@&${rankRewards[3]}>\n<@&${rankRewards[2]}>\n<@&${rankRewards[1]}>\n<@&${rankRewards[0]}>`, inline: true },
            { name: 'Required Score', value: "Rank 1\n10 000\n5 000\n2 000\n500\nNone", inline: true })
        .setFooter('Updates when user leaves vc!');

    //Index 0 is rewards
    editEmbed(rewards, 0);
}

//Sees if the top user has changed
function checkTop() {
    dbClient.connect(err => {
        //if (err) throw err;
        if (err) {
            console.log("Could not connect to db in embed.js");
            console.log(err);
            return;
        }

        const collection = dbClient.db("Narkos").collection("Users");

        collection.find().sort({ score: -1 }).toArray().then(users => {
            const userTop = users[0];

            //See if we got a new top rank
            dbClient.db("Narkos").collection("Top").findOne().then(top => {
                //console.log(top);
                if (top.userID != userTop.userID) {
                    let role = guild.roles.cache.find(role => role.id === rankRewards[rankRewards.length - 1]);

                    removeRole(top.userID, role);
                    giveRole(userTop.userID, role);
                    console.log(`Removed toprank from ${top.username} and gave it to ${userTop.username}`);

                    //Write to db
                    var newValues = {
                        $set: {
                            userID: userTop.userID,
                            username: userTop.username,
                            messages: userTop.messages,
                            voiceTime: userTop.voiceTime,
                            voiceJoin: userTop.voiceJoin,
                            score: userTop.score,
                            dailyTime: userTop.dailyTime,
                            dailyClaims: userTop.dailyClaims,
                            dailyStreak: userTop.dailyStreak,
                            dailyMax: userTop.dailyMax
                        }
                    };

                    dbClient.db("Narkos").collection("Top").updateOne({ userID: top.userID }, newValues, function (err, res) {
                        if (err) throw err;
                    })
                }
            });
        });
    })
}

function leaderboardEmbed(users, page = 0) {
    //Accumulated string
    let userScore = '';
    let userNames = '';
    let userMsgTime = '';

    //Max 50 per embed size limit (1024 characters) per field value
    for (var i = 0; i < users.length; i++) {
        var score = users[i].score;
        var voiceMins = users[i].voiceTime / 1000 / 60;
        var voiceHour = Math.round((voiceMins / 60) * 10) / 10;
        var userNr = (page * 30) + (i + 1);

        //⌛ 💬
        userNames += `\`${userNr}\` ${users[i].username}\n`;
        userMsgTime += `\`${voiceHour} hrs / ${users[i].messages} msg\`\n`;
        userScore += `\`${score}\`\n`;
    }

    //Top leaderboard
    const leaderboard = new MessageEmbed()
        .setAuthor(`Leaderboard for Narkos   /   ${guild.memberCount} members`)
        .setColor(getRandomColor())
        .addFields(
            { name: 'Username', value: userNames, inline: true },
            { name: 'Stats', value: userMsgTime, inline: true },
            { name: 'Score', value: userScore, inline: true })
        .setFooter('Score:  5 points per message  /  30 points per hour');

    editEmbed(leaderboard, 1);
}

//Embed that shows a user's stats + daily claims
function editDailyEmbed(client, user_id, msg = "No message provided") {
    const milliday = 86400000;

    guild = client.guilds.cache.get(GuildID);
    statsChannel = client.channels.cache.get(scoreboardChannelId);

    dbClient.connect(err => {
        //if (err) throw err;
        if (err) {
            console.log("Could not connect to db in embed.js");
            console.log(err);
            return;
        }

        const collection = dbClient.db("Narkos").collection("Users");

        collection.findOne({ userID: user_id }).then(user => {
            if (!user) {
                console.log(`UserID: ${user_id}} is not in database!`);
                return;
            }

            guild.members.fetch(user.userID).then(member => {
                let userCard = new MessageEmbed()
                    .setAuthor(`Daily Rewards Stats`)
                    .setColor(getRandomColor())
                    .setDescription(msg)
                    .setThumbnail(member.user.avatarURL({ dynamic: true }))
                    .addFields(
                        { name: 'Daily Claims', value: `\`${user.dailyClaims}\``, inline: true },
                        { name: 'Current Streak', value: `\`${user.dailyStreak}\``, inline: true },
                        { name: 'Highest Streak', value: `\`${user.dailyMax}\``, inline: true }) //,{ name: 'Score',   value: `\`${user.score}\``, inline: false}
                    .setFooter('Next claim available')
                    .setTimestamp(user.dailyTime + milliday);

                let rank = rankRewards[0];
                if (user.score >= 10000) {
                    rank = rankRewards[4];
                }
                else if (user.score >= 5000) {
                    rank = rankRewards[3];
                }
                else if (user.score >= 2000) {
                    rank = rankRewards[2];
                }
                else if (user.score >= 500) {
                    rank = rankRewards[1];
                }

                let role = guild.roles.cache.find(role => role.id === rank);

                //console.log(`Gave rank ${role.name} to ${users[i].username}`);
                giveRole(user.userID, role);

                //-1 is reseved for userCards
                editEmbed(userCard, -1);
            })
        })
    })
}

function editEmbed(embed, i) {
    //Connect to db
    dbClient.connect(err => {
        //if (err) throw err;
        if (err) {
            console.log("Could not connect to db in embed.js");
            console.log(err);
            return;
        }

        const collection = dbClient.db("Narkos").collection("Embeds");
        collection.findOne({ iteration: i }).then(embeds => {

            if (embeds) {
                //Edit message, send it otherwise
                statsChannel.messages.fetch({ around: embeds.id, limit: 1 }).then(msg => {
                    const fetchedMsg = msg.first();

                    if (fetchedMsg != undefined) {
                        //Add buttons for sorting options
                        if (i == 1) {
                            const buttonMsg = new MessageButton()
                                .setCustomId('sortByMsg')
                                .setLabel('Messages')
                                .setStyle('PRIMARY');

                            const buttonScore = new MessageButton()
                                .setCustomId('sortByScore')
                                .setLabel('Score')
                                .setStyle('DANGER');

                            const buttonHrs = new MessageButton()
                                .setCustomId('sortByHrs')
                                .setLabel('Hours')
                                .setStyle('SUCCESS');

                            const buttonRepo = new MessageButton()
                                .setLabel('Git')
                                .setURL("https://github.com/Veggissss/betaBot")
                                .setStyle('LINK');

                            const selectPage = new MessageSelectMenu()
                                .setCustomId('selectPage')
                                .setPlaceholder('Change page')
                                .addOptions([
                                    {
                                        label: 'Page 1',
                                        description: 'Show user nr.1-30!',
                                        value: '1',
                                    },
                                    {
                                        label: 'Page 2',
                                        description: 'Show user nr.31-60!',
                                        value: '2',
                                    },
                                ]);

                            const rowButtons = new MessageActionRow().addComponents(buttonHrs, buttonMsg, buttonScore, buttonRepo);
                            const rowMenu = new MessageActionRow().addComponents(selectPage);

                            fetchedMsg.edit({ embeds: [embed], components: [rowButtons, rowMenu] });
                        }
                        //User stat card
                        else if (i == -1) {
                            const buttonName = new MessageButton()
                                .setCustomId('updateName')
                                .setLabel('Update Username')
                                .setStyle('DANGER');

                            const buttonStats = new MessageButton()
                                .setCustomId('showStats')
                                .setLabel('Show My Stats')
                                .setStyle('PRIMARY');

                            const buttonDaily = new MessageButton()
                                .setCustomId('claimDaily')
                                .setLabel('Claim Daily')
                                .setStyle('SUCCESS');

                            const row = new MessageActionRow()
                                .addComponents(
                                    buttonDaily, buttonStats, buttonName
                                );

                            fetchedMsg.edit({ embeds: [embed], components: [row] });
                        }
                        else {
                            fetchedMsg.edit({ embeds: [embed], components: [] });
                        }
                    }
                    //If message is deleted
                    else {
                        console.log("Rewards embed not found!");
                        statsChannel.send({ embeds: [embed] }).then(sent => {
                            collection.updateOne({ iteration: i }, { $set: { id: sent.id } }, function (err, res) {
                                if (err) {
                                    console.log("Error updating new iteration!");
                                }
                            });
                        })
                    }
                });
            }
            else {
                console.log("Could't find iteration: ", i);
                statsChannel.send({ embeds: [embed] }).then(sent => {
                    //Add to db
                    collection.insertOne({ iteration: i, id: sent.id }, function (err, res) {
                        //if (err) throw err;
                        if (err) {
                            console.log("Could not insert to db in embed.js");
                            console.log(err);
                            return;
                        }
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
function giveRole(userID, role) {
    getMember(userID).then(member => {
        if (member == null) {
            return;
        }
        member.roles.add(role);
    })
}

//Give role rewards
function removeRole(userID, role) {
    getMember(userID).then(member => {
        if (member == null) {
            return;
        }
        member.roles.remove(role);
    })
}

//Get guildMember
async function getMember(userID) {
    try {
        return await guild.members.fetch(userID);
    } catch (error) {
        //console.log(`Member not found: ${userID}`);
        return null;
    }
}

function calculateScore(entry) {
    //5 points for message, 30 points per hour in vc
    let calculation = (5 * entry.messages) + (30 * (entry.voiceTime / 1000 / 60 / 60)) + (entry.dailyClaims * (50 * (1 + Math.log10(1 + entry.dailyMax))));
    return Math.round(calculation);
}


module.exports = { sendEmbed, editDailyEmbed, calculateScore };