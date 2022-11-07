//create a dictionary of chatrooms, each containing an array of users in each chatroom
chatRoomList = {"homeroom": []};

pswdDict = {"homeroom": ""};


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
        user.room = "homeroom";
        user["nickname"] = data["nickname"];
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        socket.join("homeroom");
        io.sockets.in("homeroom").emit("updateRoomList", { users: chatRoomList[user.room], chatRoomList: Object.keys(chatRoomList) })
    });

    socket.on('createNewChatRoom', function (data) {
        //creates new chat room and adds the user
        chatRoomList[data["chatRoomName"]] = [[user.id, user.nickname]];
        pswdDict[data.chatRoomName] = data.chatRoomPswd;
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
        
        io.sockets.in("homeroom").emit("updateRoomList", { users: homeroomUserArray, chatRoomList: Object.keys(chatRoomList) });
        io.sockets.in(user.room).emit("chatRoomCreated", { users: chatRoomList[user.room], chatRoomName: user.room, nickname: user.nickname });
        //dont need the next line cuz users cant kick, ban or makeAdmin themselves
        //io.sockets.in(adminRoomName).emit("userJoinedRoomADMIN", {users: chatRoomList[user.room]});
    });


    socket.on("joinRoomAttempt", function(data){
        console.log("js: " + data.roomName);
        if(pswdDict[data.roomName] != ""){
            socket.emit("roomHasPswd", {roomName: data.roomName, pswd: pswdDict[data.roomName]});
        }
        else{
            socket.emit("noPswd", {roomName: data.roomName});
        }
    });

    socket.on('joinRoom', function (data) {
        if(!user.roomsBannedFrom.includes(data.roomName)){
            socket.leave("homeroom");
            user.room = data["roomName"];
            chatRoomList[user.room].push([user.id, user.nickname]);
            socket.join(user.room);

            let adminRoomName = user.room + "ADMIN";

            if(user.roomsCreated.includes(user.room)){
                socket.join(adminRoomName);
            }

            let homeroomUserArray = updateHomeroomUserArray();

            io.sockets.in("homeroom").emit("broadcastingUserLeftRoom", {users: homeroomUserArray, nickname: user.nickname});
            io.sockets.in(user.room).emit("userJoinedRoom", { users: chatRoomList[user.room], nickname: user.nickname, chatRoomName: user.room }) ;
            socket.emit("joinRoomSuccess");
            io.sockets.in(adminRoomName).emit("userJoinedRoomADMIN", {users: chatRoomList[user.room]});
        }
        else{
            socket.emit("youreBannedFromThisRoom");
        }
        
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
        let adminRoomName = user.room + "ADMIN";
        socket.leave(adminRoomName);
        io.sockets.in(user.room).emit("broadcastingUserSignedOff", { users: chatRoomList[user.room], nickname: user.nickname });
        //maybe only emit to homeroom ??
        socket.emit("userDisconnecting", {users: chatRoomList['homeroom'], chatRoomList: Object.keys(chatRoomList)});
    });

    socket.on('leaveRoom', function (data) {
        let oldRoom = user.room;

        let userArray = chatRoomList[user.room];
        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == user.id){
                index = i;
            }
        }
        chatRoomList[user.room].splice(index, 1);
        
        //leave current room, remove name from dict[room], leave admin room 
        socket.leave(user.room);
        let adminRoomName = user.room + "ADMIN";
        socket.leave(adminRoomName);

        //rejoin homeroom
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        user.room = "homeroom";
        socket.join("homeroom");

        io.sockets.in(oldRoom).emit("broadcastingUserLeftRoom", { users: chatRoomList[oldRoom], nickname: user.nickname });
        socket.emit("rejoinHomeroom", {users: chatRoomList['homeroom'], chatRoomList: Object.keys(chatRoomList)});
        io.sockets.in("homeroom").emit("updateRoomList", {users: chatRoomList["homeroom"], chatRoomList: Object.keys(chatRoomList) });
        
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
        let adminRoomName = user.room + "ADMIN";
        socket.leave(adminRoomName);
        io.sockets.in(user.room).emit("broadcastingUserSignedOff", { users: chatRoomList[user.room], nickname: user.nickname });
        socket.emit("userDisconnecting", {});
    });


    //get socketId of kicked user from client, pass back only to kicked client
    socket.on("kickUserResponseToServer", function(data){
        if(data.socketid != user.id){
            io.to(data.socketid).emit("youGotKicked");
        }
        else{
            socket.emit("cantKickYourself");
        }
    });

    //we can then refer to kicked user as socket in this one
    //socket in the first callback would refer to the user kicking, not being kicked
    socket.on("youGotKickedResponseToServer", function(){
        let oldRoom = user.room;
        socket.leave(user.room);
        let adminRoomName = user.room + "ADMIN";
        socket.leave(adminRoomName);
        socket.join("homeroom");
        user.room = "homeroom";
        chatRoomList["homeroom"].push([socket.id, user.nickname]);
        //remove socketToBeKicked from room in chatRoomList
        let userArray = chatRoomList[oldRoom];
        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == socket.id){
                index = i;
            }
            
        };
        //socket id for kicked user
        chatRoomList[oldRoom].splice(index, 1);
        io.sockets.in(oldRoom).emit("userKicked", { users: chatRoomList[oldRoom], kickedUser: user.nickname }) ;
        io.sockets.in(adminRoomName).emit("userKickedADMIN", { users: chatRoomList[oldRoom], kickedUser: user.nickname }); 
        io.to(socket.id).emit("rejoinHomeroom", {users: chatRoomList['homeroom'], chatRoomList: Object.keys(chatRoomList)});
        io.sockets.in("homeroom").emit("userJoinedRoom", {chatRoomName: "", users: chatRoomList["homeroom"], nickname: user.nickname})
    });


    socket.on("makeAdmin", function(data){
        let socketToBeAdmin = io.sockets.sockets.get(data.socketid);
        let adminRoomName = user.room + "ADMIN";
        if(!socketToBeAdmin.rooms.has(adminRoomName)){
            socketToBeAdmin.join(adminRoomName);
            io.sockets.in(adminRoomName).emit("userJoinedRoomADMIN", {users: chatRoomList[user.room]});
        }
        else{
            socket.emit("alreadyAdmin");
        }
        
    });

    socket.on("userBanned1", function(data){
        if(data.socketid != user.id){
            io.to(data.socketid).emit("youGotBanned");
        }
        else{
            socket.emit("cantBanYourself");
        }
    });

    socket.on("userBanned2", function(data){
        //add user.room to user.bannedList
        user.roomsBannedFrom.push(user.room);

        let oldRoom = user.room;
        //remove user from room in chatRoomList
        socket.leave(user.room);
        let adminRoomName = user.room + "ADMIN";
        socket.leave(adminRoomName);
        socket.join("homeroom");
        chatRoomList["homeroom"].push([socket.id, user.nickname]);
        user.room = "homeroom";
        //remove socket from room in chatRoomList
        let userArray = chatRoomList[oldRoom];
        let index = 0;
        for (let i = 0; i < userArray.length; i++){
            if (userArray[i][0] == socket.id){
                index = i;
            }
            
        };
        chatRoomList[oldRoom].splice(index, 1);

        io.sockets.in(user.room).emit("userBannedResponse", {users: chatRoomList[oldRoom], bannedUser: user.nickname});
        io.sockets.in(adminRoomName).emit("userBannedADMIN", { users: chatRoomList[oldRoom], kickedUser: user.nickname }); 
        io.to(socket.id).emit("rejoinHomeroom", {users: chatRoomList['homeroom'], chatRoomList: Object.keys(chatRoomList)});
        io.sockets.in("homeroom").emit("userJoinedRoom", {chatRoomName: "", users: chatRoomList["homeroom"], nickname: user.nickname})

    });

    socket.on("deleteRoom", function(data){
        let usersInRoomToDelete = chatRoomList[data["roomToDelete"]];
        usersInRoomToDelete.forEach(element => {
            io.to(element[0]).emit("movingDelRoomUsersHomeroom");
        });
        delete(chatRoomList[data["roomToDelete"]]);
        io.sockets.in("homeroom").emit("updateRoomList", {users: chatRoomList["homeroom"], chatRoomList: Object.keys(chatRoomList)});
    });

    socket.on("moveUserToHomeroom", function(data){
        socket.leave(user.room);
        socket.join("homeroom");
        chatRoomList["homeroom"].push([user.id, user.nickname]);
        user.room = "homeroom";
        io.to(user.id).emit("rejoinHomeroom", {users: chatRoomList['homeroom'], chatRoomList: Object.keys(chatRoomList)});
        io.sockets.in("homeroom").emit("updateRoomList", {users: chatRoomList["homeroom"], chatRoomList: Object.keys(chatRoomList) });
    });

    //----------------------------------sending messages-----------------------------------------------

    socket.on("sendMessageToEveryone", function(data){
        io.sockets.in(user.room).emit("displayMessageToEveryone", {nickname: user.nickname, message: data["message"]});
    });

    socket.on("sendPrivateMessage", function(data){
        io.to(data["pmRecipient"]).emit("displayPM", {nickname: user.nickname, message: data["message"]});
        io.to(user.id).emit("displayPM", {nickname: user.nickname, message: data["message"]});
    });

});