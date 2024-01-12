//Import local
const { sendEmbed, calculateScore, editDailyEmbed } = require('../embed.js');
const config = require('../config.js');

//Mongodb
const dbClient = config.getDatabaseClient();
const afkChannels = config.getAfkChannels();

//Update bootime
const dt = new Date();
const bootTime = dt.getTime();

module.exports = {
    name: 'voiceStateUpdate',
    execute(oldMember, newMember, client) {
        let username = oldMember.member.user.username;

        let oldVoice = oldMember.channelId;
        let newVoice = newMember.channelId;

        //Ignore no changes
        if (oldVoice == newVoice) {
            return
        }
        //Ignore bots
        if (oldMember.member.user.bot) {
            return
        }

        //User Joins
        if (oldVoice == null) {
            console.log(`${username} joined!`);

            var date = new Date();
            var joinTime = date.getTime();

            dbClient.connect(err => {
                //if (err) throw err;
                if (err) {
                    console.log("Could not connect to db in voiceStateUpdate.js");
                    console.log(err);
                    return;
                }

                const collection = dbClient.db(config.getDbServerName()).collection("Users");
                collection.findOne({ userID: oldMember.member.user.id }).then(user => {

                    //User in db
                    if (user) {
                        let time;
                        //If channel is afk no points is given
                        if (afkChannels.includes(newVoice)) {
                            time = 0;
                        }
                        else {
                            time = joinTime;
                        }

                        var newValues = {
                            $set: {
                                voiceJoin: time
                            }
                        };

                        collection.updateOne({ userID: oldMember.member.user.id }, newValues).then(res => {
                            //console.log("Updated: "+time);
                        });
                    }
                    else {
                        // Defining new user 
                        let userEntry = {
                            userID: oldMember.member.user.id,
                            username: oldMember.member.user.username,
                            messages: 0,
                            voiceTime: 0,
                            voiceJoin: joinTime,
                            score: 0,
                            dailyTime: 0,
                            dailyClaims: 0,
                            dailyStreak: 0,
                            dailyMax: 0
                        };

                        //Add to db
                        collection.insertOne(userEntry, function (err, res) {
                            //if (err) throw err;
                            if (err) {
                                console.log("Could not insert to db in voiceStateUpdate.js");
                                console.log(err);
                                return;
                            }
                            //console.log(`Added ${oldMember.member.user.username} to db!`);
                        });
                    }
                })
            })
            //User leaves
        } else if (newVoice == null) {
            console.log(`${username} left!\n`);

            dbClient.connect(err => {
                //if (err) throw err;
                if (err) {
                    console.log("Could not connect to db in voiceStateUpdate.js");
                    console.log(err);
                    return;
                }

                const collection = dbClient.db(config.getDbServerName()).collection("Users");

                collection.findOne({ userID: oldMember.member.user.id }).then(user => {

                    //User in db
                    if (user) {
                        let time;

                        var date = new Date();
                        var leaveTime = date.getTime();

                        var joinTime = user.voiceJoin;

                        //See if user left a afk channel
                        if (afkChannels.includes(oldVoice)) {
                            console.log(`${username} left an afk channel`);
                            time = 0;
                        }
                        else {
                            time = leaveTime - joinTime;
                        }

                        //Check if user join before bot started
                        if (joinTime - bootTime < 0) {
                            console.log(`${username} joined before bot started!`);
                            time = 0;
                        }

                        console.log(`${user.username} was in vc for ${time / 1000}s\n`);

                        //Add to temp userprofile so score can be updated
                        let userEntry = {
                            userID: user.userID,
                            username: user.username,
                            messages: user.messages,
                            voiceTime: user.voiceTime + time,
                            voiceJoin: user.voiceJoin,
                            score: user.score,
                            dailyTime: user.dailyTime,
                            dailyClaims: user.dailyClaims,
                            dailyStreak: user.dailyStreak,
                            dailyMax: user.dailyMax
                        };

                        //Update score
                        userEntry.score = calculateScore(userEntry);

                        //Write to db
                        collection.updateOne({ userID: oldMember.member.user.id }, { $set: userEntry }).then(res => {
                            //console.log("Updated: "+oldMember.member.user.id);
                        });


                        //Update leaderboard embed
                        sendEmbed(client);

                        //Update daily embed
                        var voiceMins = Math.round((time / 1000 / 60) * 10) / 10;
                        var voiceHour = Math.round((userEntry.voiceTime / 1000 / 60 / 60) * 10) / 10;
                        editDailyEmbed(client, oldMember.member.user.id, msg = `${userEntry.username} was in vc for \`${voiceMins}\` min.\n${userEntry.username} has now a total of \`${voiceHour}\` hrs.`);
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

            if ((afkChannels.includes(newVoice))) {
                console.log(`${oldMember.member.displayName} is afk`);

                //Write time to user
                dbClient.connect(err => {
                    //if (err) throw err;
                    if (err) {
                        console.log("Could not connect to db in voiceStateUpdate.js");
                        console.log(err);
                        return;
                    }

                    const collection = dbClient.db(config.getDbServerName()).collection("Users");
                    collection.findOne({ userID: oldMember.member.user.id }).then(user => {

                        //User in db
                        if (user) {
                            var date = new Date();
                            var leaveTime = date.getTime();
                            var joinTime = user.voiceJoin;

                            let time = leaveTime - joinTime;

                            //Check if user join before bot started
                            if (joinTime - bootTime < 0) {
                                console.log(`${username} joined before bot started!`);
                                time = 0;
                            }

                            console.log(`${user.username} was in vc for ${time / 1000}s\n`);

                            //Add to temp userprofile so score can be updated
                            let userEntry = {
                                userID: user.userID,
                                username: user.username,
                                messages: user.messages,
                                voiceTime: user.voiceTime + time,
                                voiceJoin: user.voiceJoin,
                                score: user.score,
                                dailyTime: user.dailyTime,
                                dailyClaims: user.dailyClaims,
                                dailyStreak: user.dailyStreak,
                                dailyMax: user.dailyMax
                            };

                            //Update score
                            userEntry.score = calculateScore(userEntry);

                            //Write to db
                            collection.updateOne({ userID: oldMember.member.user.id }, { $set: userEntry }).then(res => {
                                //console.log("Updated: "+ oldMember.member.user.id);
                            });
                        }
                        else {
                            console.log(`User not found, ID: ${oldMember.member.user.id}`);
                        }
                    })
                })
            }
            else if (afkChannels.includes(oldVoice)) {
                console.log(`${oldMember.member.displayName} is no longer afk`);

                //start time user
                dbClient.connect(err => {
                    //if (err) throw err;
                    if (err) {
                        console.log("Could not connect to db in voiceStateUpdate.js");
                        console.log(err);
                        return;
                    }

                    const collection = dbClient.db(config.getDbServerName()).collection("Users");
                    collection.findOne({ userID: oldMember.member.user.id }).then(user => {

                        //User in db
                        if (user) {
                            var date = new Date();
                            var joinTime = date.getTime();

                            user.voiceJoin = joinTime;

                            //Write to db
                            var newValues = {
                                $set: {
                                    voiceJoin: joinTime
                                }
                            };

                            collection.updateOne({ userID: oldMember.member.user.id }, newValues).then(res => {
                                //console.log("Updated: "+ oldMember.member.user.id);
                            });
                        }
                        else {
                            console.log(`User could not be found ID: ${oldMember.member.user.id}`);
                        }
                    })
                })
            }
        }
    }
}

