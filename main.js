//By Kinuseka Do not redistribute

var app = require('./app'); 
var Worker = require('./essentials/workers')
const port = process.env.PORT || 3001;

app.listen(port, async function() {
    console.log('Express server listening on port ' + port);
});

app.on("close", async () => {
    await Worker.close(force=true)
})