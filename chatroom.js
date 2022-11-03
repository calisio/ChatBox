//create a dictionary of chatrooms, each containing an array of users in each chatroom
chatRoomList = {"homeroom": []};

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
    const user = {
        id: socket.id,
        room: "homeroom"
        // TO DO: Add 'banned from' room
    }

    console.log("socket id: " + socket.id);
    // This callback runs when a new Socket.IO connection is established.

    socket.on('userLoggedOn', function (data) {
        user["nickname"] = data["nickname"];
        chatRoomList["homeroom"].push[user.id];
        socket.join("homeroom");
        console.log("keys of chatRoomList: " + Object.keys(chatRoomList));
        io.sockets.in("homeroom").emit("sendingChatRoomList", { chatRoomList: Object.keys(chatRoomList) })
    });

    socket.on('createNewChatRoom', function (data) {
        chatRoomList[data["chatRoomName"]] = [user.id];
        console.log("chatRoomList in createNewChatRoom: ")
        console.log(chatRoomList);
        socket.join(data["chatRoomName"]);
        console.log(data["chatRoomName"]);
        user.room = data["chatRoomName"];
        io.sockets.in("homeroom").emit("updateRoomList", { chatRoomList: Object.keys(chatRoomList) });
        io.sockets.in(user.room).emit("chatRoomCreated", { chatRoomName: user.room, nickname: user.nickname })
    });

    socket.on('joinRoom', function (data) {
        console.log("room name in join room" + data['roomName']);
        console.log(chatRoomList);
        socket.leave("homeroom");
        chatRoomList[data["roomName"]].push(user.id);
        socket.join(data["roomName"]);
        user.room = data["roomName"];
        console.log(user.room);
        io.sockets.in(user.room).emit("userSignedOn", { nickname: user.nickname, chatRoomName: user.room }) 
    });

    socket.on('signingOff', function (data) {
        socket.leave("homeroom");
    });

    socket.on('leaveRoom', function (data) {
        let index = chatRoomList[user.room].indexOf[user.id];
        chatRoomList[user.room].splice(index, 1);
        socket.leave(user.room);
        io.sockets.in(user.room).emit("broadcastingUserSignOff", { nickname: user.nickname });
        socket.join("homeroom");
        io.sockets.in("homeroom").emit("updateRoomList", { chatRoomList: Object.keys(chatRoomList) });
        socket.emit("rejoinHomeroom", {nickname : user.nickname});
    });

    socket.on('disconnect', function(){
        console.log("disconnect: " + socket.id);
    });

});