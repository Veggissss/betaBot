//Make a discord client with loaded commands and events
const Discord = require('discord.js');
const { GatewayIntentBits, Partials } = require('discord.js');
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


const client = new Client( { partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember ], allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildEmojisAndStickers, 
    GatewayIntentBits.GuildIntegrations, 
    GatewayIntentBits.GuildWebhooks, 
    GatewayIntentBits.GuildInvites, 
    GatewayIntentBits.GuildVoiceStates, 
    GatewayIntentBits.GuildPresences, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildMessageTyping, 
    GatewayIntentBits.DirectMessages, 
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.GuildModeration
    ]
});

module.exports = client;