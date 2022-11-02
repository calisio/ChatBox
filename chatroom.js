//create a dictionary of chatrooms, each containing an array of users in each chatroom
chatRoomList = {};

// Require the packages we will use:
const http = require("http"),
    fs = require("fs");

const port = 3456;
const file = "chatroom.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.

    socket.on('createNewChatRoom', function (data) {
        chatRoomList[data["chatRoomName"]] = [data["nickname"]];
        socket.join(data["chatRoomName"]);
        io.sockets.emit("sendingChatRoomList", { chatRoomList: Object.keys(chatRoomList) }) // broadcast the message to other users
    });

    socket.on('userLoggedOn', function (data) {
        console.log("chatRoomList:" + chatRoomList["room1"]);
        console.log("keys of chatRoomList: " + Object.keys(chatRoomList));
        io.sockets.emit("sendingChatRoomList", { chatRoomList: Object.keys(chatRoomList) }) // broadcast the message to other users
    });

    socket.on('joinRoom', function (data) {
        // This callback runs when the server receives a new message from the client.
        //chatRoomList[].push(data["nickname"]);
        console.log("nickname: " + data["nickname"]); // log it to the Node.JS output
        io.sockets.emit("userSignedOn", { nickname: data["nickname"] }) // broadcast the message to other users
    });

    socket.on('signingOff', function (data) {
        // let index = users.indexOf(data['nickname']);
        // users.splice(index, 1);
        // console.log(index);
        // console.log("users array after signOff:" + users);
        // socket.broadcast.emit("broadcastingUserSignOff", { nickname: data["nickname"] }) // broadcast the message to other users
    });

    socket.on('leaveRoom', function (data) {
        
        let index = users.indexOf(data['nickname']);
        users.splice(index, 1);
        console.log(index);
        console.log("users array after signOff:" + users);
        socket.broadcast.emit("broadcastingUserSignOff", { nickname: data["nickname"] }) // broadcast the message to other users
    });

    io.sockets.on('disconnect', function(){
        //remove the user from users array
        let index = users.indexOf(socket);
        users.splice(index, 1);
        console.log(index);
        console.log(users);
    });
});