//Author Veggissss
//Calculates time spent in vc and the amount messages sendt per user
require('dotenv').config();

//Import local
const token = process.env.TOKEN;

//Import the created client object
const client = require('./client.js');
const { sendEmbed } = require('./embed.js');
client.start();

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
        if (interaction.customId == "sortByMsg"){
            sendEmbed(client, sort = {messages: -1} );
        }
        if (interaction.customId == "sortByHrs"){
            sendEmbed(client, sort = {voiceTime: -1} );
        }
    }
});



//Login to the discord API
client.login(token);