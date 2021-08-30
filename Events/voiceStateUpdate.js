require('dotenv').config();

const { MongoClient } = require('mongodb')

//Import local
const { sendEmbed, editUserEmbed } = require('../embed.js');

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
                        sendEmbed(client);

                        //Update last user activity embed
                        editUserEmbed(user[0]);
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
    }
}

function calculateScore(entry){
    //5 points for message, 30 points per hour in vc
    let calculation = (5 * entry.messages + (30*(entry.voiceTime /1000/60/60)));
    return Math.round(calculation);
}
