require('dotenv').config();

const { MongoClient } = require('mongodb')
const { sendEmbed,calculateScore, editDailyEmbed } = require('../embed.js');

const dbPass = process.env.MONGOPASS;

//Mongodb
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

module.exports = {
	name: 'messageCreate',
	execute(message, client) {
        const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        if(!message.author.bot){
        //DMs
        if (message.channel.type == "dm"){
            console.log(message.content);
            return;
        }
    
        //NOT DM
        // Read users.json file 
        dbClient.connect(err => {
            //if (err) throw err;
            if (err){
                console.log("Could not connect to db in messageCreate.js");
                console.log(err);
                return;
            }
    
            const collection = dbClient.db("Narkos").collection("Users");
            collection.find({userID: message.author.id}).toArray().then(user=>{
                
                //User in db
                if (user[0]){
                    console.log(`${message.author.username} has sent ${user[0].messages + 1} messages`);
    
                    let userEntry = { 
                        userID:    user[0].userID,
                        username:  user[0].username,
                        messages:  user[0].messages+1,
                        voiceTime: user[0].voiceTime,
                        voiceJoin: user[0].voiceJoin,
                        score:     user[0].score,
                        dailyTime: user[0].dailyTime,
                        dailyClaims: user[0].dailyClaims,
                        dailyStreak: user[0].dailyStreak,
                        dailyMax: user[0].dailyMax
                    };
    
                    //Update score
                    userEntry.score = calculateScore(userEntry);
    
                    var newValues = { $set: userEntry };
                    collection.updateOne({userID: message.author.id}, newValues).then(res =>{
                        //console.log("UPDATED!");
                        
                        //Close db connection
                        dbClient.close();
                    });
    
                    //Update leaderboard embed
                    sendEmbed(client);
                    
                    editDailyEmbed(client,message.author.id, msg = `${userEntry.username} has now sent ${userEntry.messages} messages.\n And have got \`${userEntry.score}\` points in score!`);
                }
                else{
                    console.log("User not found!");
                    // Defining new user 
                    let userEntry = { 
                        userID:    message.member.id,
                        username:  message.member.user.username,
                        messages:   1,
                        voiceTime:  0,
                        voiceJoin:  0,
                        score: 5,
                        dailyTime: 0,
                        dailyClaims: 0,
                        dailyStreak: 0,
                        dailyMax: 0
                    }; 
    
                    //Add to db
                    collection.insertOne(userEntry, function(err, res) {
                        //if (err) throw err;
                        if (err){
                            console.log("Could not add user to db in messageCreate.js");
                            console.log(err);
                            return;
                        }

                        console.log(`Added ${message.member.user.username} to db!`);
                        
                        //Close db connection
                        dbClient.close();
                    });
    
                    //Update leaderboard embed
                    sendEmbed(client);
                }
            })
        })
        }
    }
}
