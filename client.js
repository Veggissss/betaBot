//Make a discord client with loaded commands and events
const Discord = require('discord.js');
const { Intents } = require('discord.js');
const fs = require('fs');


class Client extends Discord.Client {
  constructor(options) {
    super(options);

    /**
     * @type {Discord.Collection<string, Command>}
     */

    this.commands = new Discord.Collection();
    //this.prefix = config.prefix;
  }

  start() {
    fs.readdirSync('./Commands')
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => {
        /**
         * @type {Command}
         */
        const command = require(`./Commands/${file}`);
        console.log(`Command ${command.name} loaded`);
        this.commands.set(command.name, command);
      });

    fs.readdirSync('./Events')
      .filter((file) => file.endsWith('.js'))
      .forEach((file) => {
        //console.log(file);
        /**
         * @type {Event}
         */
        const event = require(`./Events/${file}`);
        console.log(`Event ${event.name} loaded`);

        if(event.once){
          //this.once(event.event, event.run.bind(null, this));
          this.once(event.name, (...args) => event.execute(...args, this));
        }
        else{
          //this.on(event.event,  event.event.run.bind(null, this));
          this.on(event.name, (...args) => event.execute(...args, this));
        }
      });
  }
}


const client = new Client( {allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
  intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MEMBERS, 
    Intents.FLAGS.GUILD_BANS, 
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, 
    Intents.FLAGS.GUILD_INTEGRATIONS, 
    Intents.FLAGS.GUILD_WEBHOOKS, 
    Intents.FLAGS.GUILD_INVITES, 
    Intents.FLAGS.GUILD_VOICE_STATES, 
    Intents.FLAGS.GUILD_PRESENCES, 
    Intents.FLAGS.GUILD_MESSAGES, 
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
    Intents.FLAGS.GUILD_MESSAGE_TYPING, 
    Intents.FLAGS.DIRECT_MESSAGES, 
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ]
}); //Intents? []

//where would you call start()?
module.exports = client;