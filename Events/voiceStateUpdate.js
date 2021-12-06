require('dotenv').config();

const { MongoClient } = require('mongodb')

//Import local
const { sendEmbed, editDailyEmbed } = require('../embed.js');

//Mongodb
const dbPass = process.env.MONGOPASS;
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

//Global Variables
const afkChannels = process.env.AFKID;                                //Channels that gives 0 points

//Update bootime
const dt = new Date();
const bootTime = dt.getTime();

module.exports = {
	name: 'voiceStateUpdate',
	execute(oldMember, newMember, client) {
        const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        
        let username = oldMember.member.user.username;

        let oldVoice = oldMember.channelId; 
        let newVoice = newMember.channelId; 

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
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in voiceStateUpdate.js");
                    console.log(err);
                    return;
                }
        
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
                        score: 0,
                        dailyTime: 0,
                        dailyClaims: 0,
                        dailyStreak: 0,
                        dailyMax: 0
                    }; 

                    //Add to db
                    collection.insertOne(userEntry, function(err, res) {
                        //if (err) throw err;
                        if (err){
                            console.log("Could not insert to db in voiceStateUpdate.js");
                            console.log(err);
                            return;
                        }
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
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in voiceStateUpdate.js");
                    console.log(err);
                    return;
                }
        
                const collection = dbClient.db("Narkos").collection("Users");
                //collection.findOne({userID : oldMember.member.user.id}).then(user => {
                 
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

                        //Add to temp userprofile so score can be updated
                        let userEntry = { 
                            userID:    user[0].userID,
                            username:  user[0].username,
                            messages:  user[0].messages,
                            voiceTime: user[0].voiceTime + time,
                            voiceJoin: user[0].voiceJoin,
                            score:     user[0].score,
                            dailyTime: user[0].dailyTime,
                            dailyClaims: user[0].dailyClaims,
                            dailyStreak: user[0].dailyStreak,
                            dailyMax: user[0].dailyMax
                        };
        
                        //Update score
                        userEntry.score = calculateScore(userEntry);

                        //Write to db
                        collection.updateOne({userID: oldMember.member.user.id}, { $set: userEntry }).then(res =>{
                            //console.log("Updated: "+oldMember.member.user.id);
                            
                            //Close db connection
                            dbClient.close();
                        });
                        

                        //Update leaderboard embed
                        sendEmbed(client);

                        //Update daily embed
                        var voiceMins= Math.round((time/1000/60)*10)/10;
                        var voiceHour= Math.round((userEntry.voiceTime/1000/60/60)*10)/10;
                        editDailyEmbed(client,oldMember.member.user.id, msg = `${userEntry.username} was in vc for \`${voiceMins}\` min.\n${userEntry.username} has now a total of \`${voiceHour}\` hrs.`);
                    }
                    else {
                        dbClient.close();
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
                    //if (err) throw err;
                    if (err){
                        console.log("Could not connect to db in voiceStateUpdate.js");
                        console.log(err);
                        return;
                    }
            
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

                            //Add to temp userprofile so score can be updated
                            let userEntry = { 
                                userID:    user[0].userID,
                                username:  user[0].username,
                                messages:  user[0].messages,
                                voiceTime: user[0].voiceTime + time,
                                voiceJoin: user[0].voiceJoin,
                                score:     user[0].score,
                                dailyTime: user[0].dailyTime,
                                dailyClaims: user[0].dailyClaims,
                                dailyStreak: user[0].dailyStreak,
                                dailyMax: user[0].dailyMax
                            };

                            //Update score
                            userEntry.score = calculateScore(userEntry);

                            //Write to db
                            collection.updateOne({userID: oldMember.member.user.id}, { $set: userEntry }).then(res =>{
                                //console.log("Updated: "+oldMember.member.user.id);
                                
                                //Close db connection
                                dbClient.close();
                            });
                        }
                        else{
                            dbClient.close();
                            console.log(`User not found, ID: ${oldMember.member.user.id}`);
                        }
                    })
                })
            }
            else if (afkChannels.includes(oldVoice)){
                console.log(`${oldMember.member.displayName} is no longer afk`);

                //start time user

                dbClient.connect(err => {
                    //if (err) throw err;
                    if (err){
                        console.log("Could not connect to db in voiceStateUpdate.js");
                        console.log(err);
                        return;
                    }
            
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
                            dbClient.close();
                            console.log(`User could not be found ID: ${oldMember.member.user.id}`);
                        }
                    })
                })
            }
        }
    }
}

function calculateScore(entry){
    //5 points for message, 30 points per hour in vc
    let calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)));
    return Math.round(calculation);
}
