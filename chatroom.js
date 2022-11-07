//create a dictionary of chatrooms, each containing an array of users in each chatroom
chatRoomList = {"homeroom": []};


//dictionary of admins
//{ [roomName : [admin1, admin2] ] }
//chatRoomAdmins = {};

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
        room: "homeroom",
        roomsCreated: [],
        roomsBannedFrom: []
        // TO DO: Add 'banned from' room list
    }

    function createNicknameArray(){
        let userIdArray = chatRoomList[user.room];
        let userNicknameArray = [];
        for (let i = 0; i < userIdArray.length; i++){
            let [id, nickname] = userIdArray[i];
            userNicknameArray.push([id, nickname]);
        }
        return userNicknameArray;
    }
    
    function updateHomeroomUserArray(){
        let homeroomUserArray = chatRoomList["homeroom"];
        let index = 0;
        for (let i = 0; i < homeroomUserArray.length; i++){
            if (homeroomUserArray[i][0] == user.id){
                index = i;
            }
        }
        homeroomUserArray.splice(index, 1);
        return homeroomUserArray;
    }

    socket.on('userLoggedOn', function (data) {
        user["nickname"] = data["nickname"];
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        socket.join("homeroom");
        let userNicknameArray = createNicknameArray();
        //userNicknameArray checked, returns the right thing
        io.sockets.in("homeroom").emit("sendingChatRoomList", { users: userNicknameArray, chatRoomList: Object.keys(chatRoomList) })
    });

    socket.on('createNewChatRoom', function (data) {
        //creates new chat room and adds the user
        chatRoomList[data["chatRoomName"]] = [[user.id, user.nickname]];
        socket.leave("homeroom");

        //assign values in user object
        user.room = data["chatRoomName"];
        user.roomsCreated.push(user.room);

        //join both actual room and admin room
        socket.join(data["chatRoomName"]);
        let adminRoomName = user.room + "ADMIN";
        socket.join(adminRoomName);

        //update the homeroom users array in chatRoomList
        let homeroomUserArray = updateHomeroomUserArray(); // correctly removes the user from chatRoomList["homeroom"]

        io.sockets.in("homeroom").emit("broadcastingUserLeftRoom", {users: homeroomUserArray, nickname: user.nickname});
        
        let userNicknameArray = createNicknameArray();
        io.sockets.in("homeroom").emit("updateRoomList", { users: homeroomUserArray, chatRoomList: Object.keys(chatRoomList) });
        io.sockets.in(user.room).emit("chatRoomCreated", { users: userNicknameArray, chatRoomName: user.room, nickname: user.nickname });
    });

    socket.on('joinRoom', function (data) {
        socket.leave("homeroom");
        user.room = data["roomName"];

        //when a user joins, they're not an admin by default
        //TODO: if creator rejoins, put them in admin room too
        chatRoomList[user.room].push([user.id, user.nickname]);
        socket.join(user.room);

        let homeroomUserArray = updateHomeroomUserArray();

        let userNicknameArray = chatRoomList[user.room];

        io.sockets.in("homeroom").emit("broadcastingUserLeftRoom", {users: homeroomUserArray, nickname: user.nickname});
        io.sockets.in(user.room).emit("userJoinedRoom", { users: userNicknameArray, nickname: user.nickname, chatRoomName: user.room }) ;
        let adminRoomName = user.room + "ADMIN";
        io.sockets.in(adminRoomName).emit("userJoinedRoomADMIN", {users: userNicknameArray});
    });

    socket.on('signingOff', function (data) {
        let userArray = chatRoomList[user.room];
        let index = 0;
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

        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == user.id){
                index = i;
            }
        }
        chatRoomList[user.room].splice(index, 1);
        
        socket.leave(user.room);
        let userNicknameArray = createNicknameArray();
        io.sockets.in(user.room).emit("broadcastingUserLeftRoom", { users: userNicknameArray, nickname: user.nickname });
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        user.room = "homeroom";
        socket.join("homeroom");
        io.sockets.in("homeroom").emit("updateRoomList", {users: chatRoomList["homeroom"], chatRoomList: Object.keys(chatRoomList) });
        socket.emit("rejoinHomeroom", {nickname : user.nickname});
    });

    socket.on('disconnect', function(){
        let userArray = chatRoomList[user.room];
        let index = 0;
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


    socket.on("kickUserResponseToServer", function(data){
        //console.log(chatRoomList);
        let socketToBeKicked = io.sockets.sockets.get(data.socketid);
        socketToBeKicked.leave(user.room);
        socketToBeKicked.join("homeroom");

        //remove socketToBeKicked from room in chatRoomList
        let userArray = chatRoomList[user.room];
        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == data.socketid){
                index = i;
            }
            
        };
        //socket id for kicked user
        let kickedUser = chatRoomList[user.room][index];
        chatRoomList[user.room].splice(index, 1);

        io.sockets.in(user.room).emit("userKicked", { users: chatRoomList[user.room], kickedUser: kickedUser }) ;
        let adminRoomName = user.room + "ADMIN";
        io.sockets.in(adminRoomName).emit("userKickedADMIN", { users: chatRoomList[user.room], kickedUser: kickedUser });
        io.sockets.to(kickedUser).emit("rejoinHomeroom");
    
    });


    //new----------------------------------------
    socket.on("makeAdmin", function(){
        let adminRoomName = user.room + "ADMIN";
        socket.join(adminRoomName);
        socket.emit("userJoinedRoomADMIN", {users: chatRoomList[user.room]});
    });


    socket.on("userBanned", function(data){
        //add user.room to user.bannedList
        user.roomsBannedFrom.push(user.room);

        //remove socketToBeBanned from room in chatRoomList
        let userArray = chatRoomList[user.room];
        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == data.socketid){
                index = i;
            }
            
        };
        chatRoomList[user.room].splice(index, 1);

        io.sockets.in(user.room).emit("userBannedResponse", {users: chatRoomList[user.room], bannedUser: user.nickname});

        socket.leave(user.room);
        socket.join("homeroom");
        //TODO: check if user.room is automatically updated

        //TODO: somewhere else, check if room is in banned list before join

    });

    //----------------------------------sending messages-----------------------------------------------

    socket.on("sendMessage", function(data){
        io.sockets.in(user.room).emit("displayMessage", {nickname: user.nickname, message: data["message"]});
    });


});