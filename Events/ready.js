
module.exports = {
	name: 'ready',
	once: true,
	execute(client) {
        console.log(`Logged in as ${client.user.tag}!\n`)
        client.user.setActivity("To User Activity", {type: "LISTENING"});  //LISTENING //PLAYING
    }
}