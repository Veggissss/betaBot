# BetaBot
BetaBot is a simple Discord bot that logs message / hour counts and stores them in a MongoDB database.

### Features
* Scoreboard with hours and message count
* Role rewards
* Daily claims

### Configuration
1. You need to change a few things in `config.js`, such as rank ids and score requirements along with the server id and channel id.
2. A MongoDB connection is also required that holds tree collections `Embeds`, `Top` and `Users`, cofigure connection in `config.js`


## Builds

### Option 1: Docker
A docker image of the application, built for the arm32 platform (Raspberry Pi) can be found [here](https://hub.docker.com/r/veggissss/betabot).

Run it using:
```docker
docker pull veggissss/betabot

# Replace the secret enviorment tokens
docker run --name=BetaBot --restart=unless-stopped -e DISCORDTOKEN=Discord_Bot_Token_Here -e MONGOPASSWORD=Mongo_Token_Here -d betabot:latest

# Find container id
docker ps

# Access container
docker exec -it BetaBot /bin/bash

# Configure `config.js` using
nano config.js
exit

# Save as a new configured image (Optional)
docker commit BetaBot ConfiguredBetaBot:latest
```
### Option 2: Local run
If you don't want to use docker you can:
```docker
git clone git@github.com:Veggissss/betaBot.git
npm install

# Configure `config.js`
node index.js
```