
const httpServer = require("http");
const io = require("socket.io")(httpServer, {

});

io.on("connection", (socket) => {

});

httpServer.listen(4000);