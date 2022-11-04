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

    function createNicknameArray(){
        let userIdArray = chatRoomList[user.room];
        let userNicknameArray = [];
        for (let i = 0; i < userIdArray.length; i++){
            let [id, nickname] = userIdArray[i];
            userNicknameArray.push(nickname);
        }
        return userNicknameArray;
    }
    // This callback runs when a new Socket.IO connection is established.

    socket.on('userLoggedOn', function (data) {
        user["nickname"] = data["nickname"];
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        socket.join("homeroom");
        let userNicknameArray = createNicknameArray();
        io.sockets.in("homeroom").emit("sendingChatRoomList", { users: userNicknameArray, chatRoomList: Object.keys(chatRoomList) })
    });

    socket.on('createNewChatRoom', function (data) {
        chatRoomList[data["chatRoomName"]] = [[user.id, user.nickname]];
        socket.join(data["chatRoomName"]);
        user.room = data["chatRoomName"];
        let userNicknameArray = createNicknameArray();
        io.sockets.in("homeroom").emit("updateRoomList", { chatRoomList: Object.keys(chatRoomList) });
        io.sockets.in(user.room).emit("chatRoomCreated", { users: userNicknameArray, chatRoomName: user.room, nickname: user.nickname })
    });

    socket.on('joinRoom', function (data) {
        socket.leave("homeroom");
        chatRoomList[data["roomName"]].push([user.id, user.nickname]);
        socket.join(data["roomName"]);
        user.room = data["roomName"];
        let userNicknameArray = createNicknameArray();
        io.sockets.in(user.room).emit("userJoinedRoom", { users: userNicknameArray, nickname: user.nickname, chatRoomName: user.room }) 
    });

    socket.on('signingOff', function (data) {
        let userArray = chatRoomList[user.room];
        let index = 0
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == user.id){
                index = i;
            }
        }
        chatRoomList[user.room].splice(index, 1);
        socket.leave(user.room);
        let userNicknameArray = createNicknameArray();
        io.sockets.in(user.room).emit("broadcastingUserSignedOff", { users: userNicknameArray, nickname: user.nickname });
        //maybe only emit to homeroom ??
        socket.emit("userDisconnecting", {});
        console.log("disconnect: " + socket.id);
    });

    socket.on('leaveRoom', function (data) {
        let userArray = chatRoomList[user.room];
        let index = 0
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == user.id){
                index = i;
            }
        }
        chatRoomList[user.room].splice(index, 1);
        socket.leave(user.room);
        let userNicknameArray = createNicknameArray();
        io.sockets.in(user.room).emit("broadcastingUserLeftRoom", { users: userNicknameArray, nickname: user.nickname });
        socket.join("homeroom");
        io.sockets.in("homeroom").emit("updateRoomList", { chatRoomList: Object.keys(chatRoomList) });
        socket.emit("rejoinHomeroom", {nickname : user.nickname});
    });

    socket.on('disconnect', function(){
        let userArray = chatRoomList[user.room];
        let index = 0
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == user.id){
                index = i;
            }
        }
        chatRoomList[user.room].splice(index, 1);
        socket.leave(user.room);
        let userNicknameArray = createNicknameArray();
        io.sockets.in(user.room).emit("broadcastingUserSignedOff", { users: userNicknameArray, nickname: user.nickname });
        //maybe only emit to homeroom ??
        socket.emit("userDisconnecting", {});
        console.log("disconnect: " + socket.id);
    });

});