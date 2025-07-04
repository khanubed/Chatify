import  bcrypt  from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
//Sign Up setup for new user

import User from "../models/user.js";
import { generateToken } from "../lib/util.js";

export const signup = async (req,res) => {
    const {fullName , email , password , bio} = req.body;
    try {
        if (!fullName || !email || !password || !bio) {
            return res.json({success : false , message: "Missing Details"})
        }
        const user = await User.findOne({email})
        if(user){
            return res.json({success : false , message: "Email already exists"})
        }
        const salt =  await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password , salt);

        const newUser = await User.create({
            fullName , email , password: hashedPassword , bio
        });

        const token = generateToken(newUser._id);

        res.json({success:true , userData : newUser , token ,message : "Account has been created successfully"})
    } catch (error) {
        console.log(error.message);        
        res.json({success : false , message  : error.message})
    }
}
// Login setup
export const login = async (req ,res) => {
    try {        
        const { email , password } = req.body;
        const userData = await User.findOne({email})
        const isPasswordMatched = await bcrypt.compare(password,userData.password);
        if (!isPasswordMatched) {
            return res.json({success:false , message : "Invalid Credentials"})
        }        
        const token = generateToken(userData._id);

        res.json({success:true , userData  , token ,message : "Logged In successfully"})
        
    } catch (error) {
        console.log(error.message);        
        res.json({success : false , message  : error.message})
    }
}

//Controller to check is user authenticated

export const authCheck = (req , res)=>{
    res.json({success : true , user  : req.user});
}

//Profile Updater Controller

export const editProfile = async (req ,res) => {
    try {
        const {profilePic , fullName,bio } = req.body;

        const userId = req.user._id;
        let updatedUser ;

        if(!profilePic){
            updatedUser = await User.findByIdAndUpdate(userId ,{bio , fullName},{new:true})
        }else{
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(userId , {profilePic: upload.secure_url  ,fullName, bio}, {new:true});
        }

        res.json({success : true , user : updatedUser})
    } catch (error) {
        console.log(error.message)
        res.json({success : true , message : error.message})
    }
}