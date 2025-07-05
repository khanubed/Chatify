
import { Mongoose } from "mongoose";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io ,userSocketMap } from "../server.js";
import User from "../models/user.js";
//Function to get all users except the logged in user



export const getUsersForSideBar = async (req , res) => {
    try {
        const userId = req.user._id ;
        const filteredUsers = await User.find({_id : {$ne : userId }}).select("-password");

        //Function Counting unseen messages
        const unseenMessages = {};
        const promises = filteredUsers.map(
            async (user) => {
                const messages = await Message.find({senderId: user._id , receiverId:userId , seen : false})
                if (messages.length>0) {
                    unseenMessages[user._id] = messages.length ;
                }
            }
        )
        await Promise.all(promises)
        res.json({success: true , users : filteredUsers , unseenMessages})  
    } catch (error) {
        console.log(error.message);
        res.json({success : false , message : error.message})
    }
}

// Function to get all messages with selected user
export const getMessages = async (req , res) => {
    try {
        const {id : selectedUserId} = req.params ;
        const myId = req.user._id;

        const messages = await Message.find({
            $or : [
                {senderId: myId , receiverId : selectedUserId},
                {senderId: selectedUserId , receiverId : myId}
            ]
        })
        await Message.updateMany({senderId:selectedUserId , receiverId : myId}, {seen : true});
        res.json({success: true  , messages})
    } catch (error) {
        console.log(error.message);
        res.json({success : false , message : error.message})
    }
}

//Api to mark message as seen using message id 
export const markMessageAsSeen = async (req,res) => {
    try {
        const {id} = req.params;
        await Message.findByIdAndUpdate(id ,{seen : true});
        res.json({success: true});
    } catch (error) {
        console.log(error.message);
        res.json({success : false , message : error.message})
    }
}

// Function to send message to selected user
export const sendMessage = async (req , res) => {
    try {
        const {text, image} = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id

        let imageURL ;
        if(image){
            const uploadImage = await cloudinary.uploader.upload(image)
            imageURL = uploadImage.secure_url;
        }
        const newMessage = await Message.create({
            senderId ,
            receiverId,
            text ,
            image : imageURL
        })

        //Emitting the new message to yo reciever's socket
        const recieverSocketId = userSocketMap[receiverId];
        if (recieverSocketId) {
            io.to(recieverSocketId).emit("newMessage", newMessage)
        }
        const senderSocketId = userSocketMap[senderId];
        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", newMessage);
        }

        res.json({success: true , newMessage});
    } catch (error) {
        console.log(error.message);
        res.json({success : false , message : error.message})
    }
}