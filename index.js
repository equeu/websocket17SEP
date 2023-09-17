const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());

const { mongoUrl } = require('./dbConnection');
const RoomModel = require('./models/roomsdata'); // Path to your roomModel.js file
const Message = require('./models/message');
const badgeModel = require('./models/badges');
const User = require('./models/user');
const userRoutes = require('./routes/userRoutes');
const { connect } = require('./models/user');
const Notification = require('./models/notifications'); //
const server = http.createServer(app);

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('DB connection successful');
});

mongoose.connection.on('error', (err) => {
  console.log('DB connection failed', err);
});

app.use(userRoutes);

app.get('/fetchData', async (req, res) => {
  try {
    //console.log('fetch data');
    // Use the Mongoose model to fetch data
    const documents = await RoomModel.find();
    //console.log(documents);
    res.json(documents);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/users/:userId/increment-likes', async (req, res) => {
  const { userId } = req.params; // Get the user's ID from the route parameter

  try {
    const user = await User.findOneAndUpdate(
      { email: userId },
      { $inc: { likes: 1 } }, // Increment the 'likes' field by 1
      { new: true } // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new notification
app.post('/notifications', async (req, res) => {
  try {
    const { sender, recipient, message,type } = req.body;
    const notification = new Notification({ sender, recipient, message,type });
    await notification.save();
    res.status(201).json({ message: 'Notification created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});





app.post('/addfriend', async (req, res) => {
  const { username, useremail, friendUsername, friendEmail } = req.body;
  console.log('friend req');

  try {
    // Find the sender by their email (assuming email is unique)
    const sender = await User.findOne({ email: useremail });

    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Find the receiver by their email
    const receiver = await User.findOne({ email: friendEmail });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create a friend object for the sender
    const senderFriend = {
      username: friendUsername,
      email: friendEmail,
    };

    // Create a friend object for the receiver
    const receiverFriend = {
      username: username, // Add sender's username to the receiver's friend list
      email: sender.email, // Use sender's email
    };

    // Push the friend object into the sender's 'friends' array
    sender.friends.push(senderFriend);

    // Push the friend object into the receiver's 'friends' array
    receiver.friends.push(receiverFriend);

    await sender.save();
    await receiver.save();

    res.status(200).json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/updateposition', async (req, res) => {
  try {
    const { roomId1, userId, x, y } = req.body;
    console.log(roomId1, userId, x, y);

    // Find the room by its ID
    const room = await RoomModel.findOne({ roomId: roomId1 });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Find the user within the room by their email
    const userIndex = room.users.findIndex((email) => email === userId);
    console.log(userIndex);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found in the room' });
    }

    // Ensure the user's coordinates object exists or create a new one
    if (!room.coordinates[userIndex]) {
      room.coordinates[userIndex] = { email: userId, x: x, y: y }; // Create a new coordinate object with email and position
    } else {
      // Update the user's position
      room.coordinates[userIndex].x = x;
      room.coordinates[userIndex].y = y;
    }

    // Save the updated room document
    await room.save();

    res.status(200).json({ message: 'User position updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.get('/getusercoordinates', async (req, res) => {
  try {
    const { roomId, userEmails } = req.query;
    // console.log(userEmails);
    // Check if userEmails is an array
    if (!Array.isArray(userEmails)) {
      return res.status(400).json({ error: 'Invalid userEmails parameter' });
    }

    // Find the room by its ID
    const room = await RoomModel.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Find the users within the room by their emails
    const userCoordinates = room.coordinates
      .filter((coord) => userEmails.includes(coord.email))
      .map((coord) => ({ x: coord.x, y: coord.y, email: coord.email }));

    if (userCoordinates.length === 0) {
      return res.status(404).json({ error: 'No matching users found in the room' });
    }

    // Return the user coordinates
    res.status(200).json(userCoordinates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Add this route in your Express application
app.put('/notifications/:notificationId/mark-as-read', async (req, res) => {
  const { notificationId } = req.params;

  try {
    // Update the notification by its _id to set "read" to true
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/users/:userId/friends', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user by their ID
    const user = await User.findOne({ email: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract the friends array from the user document
    const friends = user.friends;

    res.json({ friends });
  } catch (error) {
    console.error('Error fetching user friends:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

















// Get unread notifications for a user
app.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ recipient: userId, read: false }).populate('sender');
    res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.post('/muteuser', async (req, res) => {

  const {u,t,romid}=req.body.mutedata;
  //console.log(u, t);
  try {
    // Use a transaction to handle the message insertion
    const session = await mongoose.startSession();
    session.startTransaction();
  
    const roomx = await RoomModel.findOne({ roomId: romid }); // Use findOne instead of find
    if (roomx) {
      // Modify the muted array
      roomx.muted.push(u);
      roomx.muted.push(t);
  
      await roomx.save({ session });
    }
  
    await session.commitTransaction();
    session.endSession();
  console.log("Muted Sucessfully!");
  }
  catch(e)
  {
    console.log("error muting "+ e);
  }
});
function generateRandomString() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const length = 7;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}
app.post('/blockuser', async (req, res) => {

  const {u,rx}=req.body.blockdata;
  // console.log(u);
  try {
    // Use a transaction to handle the message insertion
    const session = await mongoose.startSession();
    session.startTransaction();
  
    const roomx = await RoomModel.findOne({ roomId: romid }); // Use findOne instead of find
    if (roomx) {
      // Modify the muted array
      roomx.blocked.push(u);

  
      await roomx.save({ session });
    }
  
    await session.commitTransaction();
    session.endSession();
  console.log("User Blocked Sucessfully!");
  }
  catch(e)
  {
    console.log("error Blocking user:  "+ e);
  }
});

app.post('/createroom', async (req, res) => {

  const {name,pic,bio,videoUrl,usern}=req.body.roombody;
  console.log("HEEE"+name,pic,bio,videoUrl,usern);
  res.send(200);
  try {

    const session = await mongoose.startSession();
    session.startTransaction();
const p={email: usern , x:215,y:125};
const myrid=generateRandomString();
  const a={
    roomId: myrid,
    name: name,
    coordinates: p,
    badgeurl: pic,
    videourl: videoUrl,
    bio: bio,
    mods: [usern],


  }
    const roomx = await RoomModel(a); // Use findOne instead of find
    
      await roomx.save({ session });



      const currenttimex = moment().tz('Asia/Karachi').format('YYYY-MM-DD HH:mm:ss');

     
        const messagebox = {
          room_id: myrid,
          messages: [
            {
              user_id: usern,
              content: 'xxrp7',
              time: currenttimex
            },
            {
              user_id: usern,
              content: 'xxrp7',
              time: currenttimex
            },
            {
              user_id: usern,
              content: 'xxrp7',
              time: currenttimex
            }
          ],
        };

        const newMessage = new Message(messagebox);
        await newMessage.save({ session });

        console.log('Initialized Room Chat...');
      
    
  
    await session.commitTransaction();
    session.endSession();
  console.log("Room Created Sucessfully!");
  }
  catch(e)
  {
    console.log("Error Creating Room :  "+ e);
  }
});


// WebSocket connection handling
const wss = new WebSocket.Server({ server });

const roomDataMap = new Map();

// Define a function to fetch and send updates for a specific room
async function fetchAndSendUpdates(roomid) {
  try {
    const result = await getfromdb(roomid);

    // Get the connected clients for the specific room
    const clients = roomDataMap.get(roomid) || [];

    // Send the result to all connected clients of this room
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(result));
      }
    });
  } catch (error) {
    console.error(`Error in background data retrieval for room ${roomid}:`, error);
  }
}

// Run the fetchAndSendUpdates function for each room every 3 seconds
setInterval(() => {
  for (const roomid of roomDataMap.keys()) {
    fetchAndSendUpdates(roomid);
  }
}, 2000);


wss.on('connection', (socket) => {
  console.log('WebSocket client connected');
  var roomid = '';
  var finaldatax;
  var userid;
  socket.on('message', async (message) => {
    try {
      const jsonData = JSON.parse(message);
      if('userId' in jsonData)
      {
        try {
          const { roomId1, userId, x, y } = jsonData;
          console.log("GOT IN SOCKETS:" + roomId1, userId, x, y);
        
          // Start a Mongoose session for transactions
          const session = await mongoose.startSession();
          session.startTransaction();
        
          try {
            // Find the room by its ID within the session
            const room = await RoomModel.findOne({ roomId: roomId1 }).session(session);
        
            if (!room) {
              session.abortTransaction(); // Rollback the transaction
              console.log("Room Not Found!");
            }
        
            // Find the user within the room by their email
            const userIndex = room.users.indexOf(userId);
        
            if (userIndex === -1) {
              session.abortTransaction(); // Rollback the transaction
              // return res.status(404).json({ error: 'User not found in the room' });
              console.log("User Not Found!");
            }
        
            // Ensure the user's coordinates object exists or create a new one
            if (!room.coordinates[userIndex]) {
              room.coordinates[userIndex] = { email: userId, x: x, y: y }; // Create a new coordinate object with email and position
            } else {
              // Update the user's position
              room.coordinates[userIndex].x = x;
              room.coordinates[userIndex].y = y;
            }
        
            // Save the updated room document within the session
            await room.save({ session });
        
            // Commit the transaction
            await session.commitTransaction();
        
            // res.status(200).json({ message: 'User position updated successfully' });
          } catch (error) {
            console.error(error);
           
            // res.status(500).json({ error: 'Internal server error' });
          } finally {
            session.endSession(); // End the session
          }
        } catch (error) {
          console.error(error);
          // res.status(500).json({ error: 'Internal server error' });
        }
        


      }
      else if ('roomId' in jsonData) {
        //console.log("I AM SENDING DATS");
      const roomid = jsonData.roomId;

      // Store the client in the roomDataMap based on the roomid
      if (!roomDataMap.has(roomid)) {
        roomDataMap.set(roomid, []);
      }
      roomDataMap.get(roomid).push(socket);

      // Fetch initial data for this specific room and send it to the client
      fetchAndSendUpdates(roomid);
    }
    else if ('room_id' in jsonData) 
{
  //console.log("ADDING MESSAFE");
    const mess=jsonData.mymessage;
    const roomide=jsonData.room_id;
    addservermessage(mess,roomide);
    //console.log("Sucess!");
}

  }
    
    catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });
  

});
async function addservermessage(msg,rid){
  try {
    const  mymessage =msg;
    const roomid=rid;
    const currenttime = moment().tz('Asia/Karachi').format('YYYY-MM-DD HH:mm:ss');

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      let room = await Message.findOne({ room_id: roomid }).session(session);

      if (!room) {
        console.error('Room not found');
        const messagebox = {
          room_id: roomid,
          messages: [],
        };

        const newMessage = new Message(messagebox);
        await newMessage.save({ session });

        console.log('Created New Chat...');
      }

      const newmessage = {
        user_id: mymessage.user_id,
        content: mymessage.content,
        time: currenttime,
      };

      if (room) {
        room.messages.push(newmessage);
        await room.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      console.log('Message Inserted! Using Sockets');
      // res.json({ code: 200, message: 'Message inserted successfully' });
   
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error Inserting Message!', error);
    
  }
}




async function getfromdb( r) {
  try {
    const roomid = r;
    // const userid = u;

    const mess = await Message.aggregate([
      {
        $match: { room_id: roomid },
      },
      {
        $project: {
          _id: 0,
          room_id: 1,
          messages: {
            $map: {
              input: '$messages',
              as: 'message',
              in: {
                user_id: '$$message.user_id',
                content: '$$message.content',
                time: '$$message.time',
              },
            },
          },
        },
      },
    ]);

    const bad = await badgeModel.aggregate([
      {
        $match: { badgeid: '123' },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    let useremails = [];
    if (mess[0] !== undefined) {
      useremails = [...new Set(mess[0].messages.map((message) => message.user_id))];
    }

    const userdetails = await User.aggregate([
      {
        $match: { email: { $in: useremails } },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const roomdetails = await RoomModel.aggregate([
      {
        $match: { roomId: roomid },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    const userdata = userdetails.reduce((result, item) => {
      const { username, password, email, badge, pic, backgroundPic, bio ,likes,friends,premium} = item;
      result[email] = {
        name: username,
        email: email,
        password: password,
        badge: badge,
        pic: pic,
        backgroundPic: backgroundPic,
        bio: bio,
        likes: likes,
        friends: friends,
        preminum: premium
      };
      return result;
    }, {});

    RoomModel.updateMany({}, { $set: { 'users': useremails } })
    .then(result => {
      // console.log('Users array replaced for:', result.nModified, 'documents');
    })
    .catch(err => {
      console.error('Error updating users:', err);
    });

    RoomModel.updateMany(
      {
        'coordinates.x': { $exists: false },
        'coordinates.y': { $exists: false },
      },
      {
        $set: {
          'coordinates.x': 215, // Default x-coordinate
          'coordinates.y': 125, // Default y-coordinate
        },
      }
    )
      .then(result => {
        // console.log('Coordinates added for users without coordinates:', result.nModified);
      })
      .catch(err => {
        console.error('Error updating coordinates:', err);
      });



    const newData = {
      ...roomdetails[0],
      users: useremails,
    };


    
    const finaldata = {
      mess: mess[0],
      userdetails: userdata,
      badges: bad[0],
      roomdata: newData,
    };

    return finaldata;
  } catch (error) {
    console.error('Error in getfromdb:', error);
    throw error;
  }
}
app.post('/updatebadge', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, badgeUrl } = req.body.badgedata;

    const user = await User.findOneAndUpdate(
      { email }, // Search condition
      { badge: badgeUrl }, // Update field
      { new: true } // Return the updated document
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Badge updated successfully', user });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

app.post('/updateprofilepic', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { useremail, profileurl } = req.body.imgdata;
    // console.log(useremail);
    // console.log(profileurl);

    const user = await User.findOneAndUpdate(
      { email: useremail }, // Search condition
      { pic: profileurl }, // Update field
      { new: true } // Return the updated document
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Profile Pic updated successfully', user });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});


server.listen(PORT, () => {
  console.log('Sockets Server listening on port ' + PORT);
});
