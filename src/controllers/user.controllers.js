import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser =asyncHandler(async (req,res)=>{
   //get user details from frontent
   //validation(is data formate enter is correct is not like --not empty)
   //check i user is aalredy exist:check by username
   // check for images,check for avtar
   //image,avtar is upload them to cloudnary
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res

    const {fullName,email,username,password} =req.body


})

export {registerUser}