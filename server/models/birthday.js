import mongoose from "mongoose";

const birthdaySchema = new mongoose.Schema({
  userId:{
    type : mongoose.Schema.Types.ObjectId,
    ref: "User",
    required : true
  },
  dob : Date,
  isCelebrated : Boolean,
  image : String ,
  message : String,
  heading : String,
  subHeading : String,
  createdAt : {
    type : Date,
    default : Date.now()
  }
})

const Birthday = mongoose.model("Birthday", birthdaySchema);

export default Birthday