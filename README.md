# CSE330
James Berthoud, 473641, jamesberthoud

Carolina Alisio, 473022, calisio

# Creative Portion
For our creative portion, we first implemented the ability to make other users admins.  Admins (similar to the creator of the room) can make other users admins, ban users and kick users from the room.  Upon leaving a room, they lose their admin powers (except for the creator - they keep their admin powers upon leaving/rejoining).

We also gave users the ability to sign out, and rejoin with a different nickname.  They lose all admin powers and all messages are cleared, but the same rooms (assuming none have been added/deleted) will be available.

Furthermore, we included the functionality of alerting the other users (in the chatbox) in the room when users join/leave  rooms, and when they sign off completely. 

Finally, we gave users the ability to delete rooms. Any user may delete a room, and this will remove all the users from that room, place them back into the homeroom (including their sockets), and removes that room from our chat room list dictionary.