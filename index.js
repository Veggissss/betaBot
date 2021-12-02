//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user
require('dotenv').config();

const { MongoClient } = require('mongodb');

//Import local
const token = process.env.TOKEN;

//Import the created client object
const client = require('./client.js');
const { sendEmbed, editUserEmbed } = require('./embed.js');
client.start();

//Mongodb
const dbPass = process.env.MONGOPASS;
const uri = `mongodb+srv://Admin:${dbPass}@narkos.axdie.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

//Button interaction
client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()){
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
    else if (interaction.isButton()){
        //console.log(interaction);
        if (interaction.customId == "sortByScore"){
            sendEmbed(client, sort = {score: -1} );
        }
        else if (interaction.customId == "sortByMsg"){
            sendEmbed(client, sort = {messages: -1} );
        }
        else if (interaction.customId == "sortByHrs"){
            sendEmbed(client, sort = {voiceTime: -1} );
        }

        //Update the username
        else if (interaction.customId == "updateName"){
            const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

            dbClient.connect(err => {
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in index.js");
                    console.log(err);
                    return;
                }

                const collection = dbClient.db("Narkos").collection("Users");

                collection.updateOne({ userID: interaction.user.id }, { $set: { username: interaction.user.username } }, function(err, res) {
                    //if (err) throw err;
                    if (err){
                        console.log("Could not updateOne in db at index.js");
                        console.log(err);
                        return;
                    }

                    updateUserEmbed(interaction);

                    dbClient.close();
                });
            })
        }

        //Show a random user card
        else if (interaction.customId == "updateRandom"){
            const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

            dbClient.connect(err => {
                //if (err) throw err;
                if (err){
                    console.log("Could not connect to db in index.js");
                    console.log(err);
                    return;
                }

                const collection = dbClient.db("Narkos").collection("Users");

                collection.find().toArray().then(users => {
                    var randomUser = users[Math.floor(Math.random()*users.length)];
                    sendEmbed(client);

                    editUserEmbed(randomUser);

                    dbClient.close();
                })
            })
        }
    }
    else if (interaction.isSelectMenu()){
        if (interaction.customId == "selectPage"){
            if (!interaction.values[0]) return;

            //eg page 1 = index 0
            const p = parseInt(interaction.values[0]) - 1;
            sendEmbed(client, undefined, p);
        }
    }
});

//Update the scoreboard and user card
function updateUserEmbed(interaction){
    const dbClient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    dbClient.connect(err => {
        //if (err) throw err;
        if (err){
            console.log("Could not connect to db in index.js");
            console.log(err);
            return;
        }

        const collection = dbClient.db("Narkos").collection("Users");
        collection.find({userID: interaction.user.id}).toArray().then(user=>{
            sendEmbed(client);

            editUserEmbed(user[0]);
            dbClient.close();
        });
    })
}


//Login to the discord API
client.login(token);