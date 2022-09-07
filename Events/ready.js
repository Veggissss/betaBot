
module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
        console.log(`Logged in as ${client.user.tag}!\n`)
        client.user.setActivity("User Activity", {type: "LISTENING"});  //LISTENING //PLAYING
    }
}