import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/clodinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
    console.log("email: ",email);

    //you can validate like simple if and can use some function

    // if(fullName===""){
    //     throw new ApiError(400,"fullName is required")
    // }

    if(
        [fullName,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All field are required")
    }

    const existedUser=User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or user already exist")
    }

    //req.body mein sara data ata hai
    //multer hume req.files ka access deta hi

    //? it is used if req.file is undefine or null then it prevent crashing

    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user=await User.create({
        fullName,
        avatar: avatar.url,

        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"somthing went wrong while registring user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})

export {registerUser}