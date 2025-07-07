import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/clodinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessandRefreshToken =async(userId)=>{
    try {
         const user =await User.findById(userId)
         const accessToken=user.generateAccessToken()
         const refreshToken=user.generateRefreshToken()
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"somthing went wring while generating refresh and access token")
    }
   
}

const registerUser = asyncHandler(async (req, res) => {
    // Get user details from frontend
    // Validation (is data format entered is correct, not empty)
    // Check if user already exists: check by username
    // Check for images, check for avatar
    // Image, avatar is uploaded to cloudinary
    // Create user object - create entry in db
    // Remove password and refresh token field from response
    // Check for user creation
    // Return res
//      console.log("👉 req.body:", req.body); 
//   console.log("👉 req.files:", req.files); // 
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    // Validation - check if all fields are provided
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // Log the files to debug
   // console.log("req.files:", req.files);

    // Handle file uploads - check if files exist before accessing
    let avatarLocalPath;
    let coverImageLocalPath;

    if (req.files && req.files.avatar && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Avatar is required
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    console.log("Avatar path:", avatarLocalPath);
    console.log("Cover image path:", coverImageLocalPath);

    // Upload files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar) {
        console.log("req.files:", req.files);

        throw new ApiError(400, "Avatar file upload failed")
    }

    console.log("Avatar uploaded:", avatar.url);
    if (coverImage) {
        console.log("Cover image uploaded:", coverImage.url);
    }

    // Create user in database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Get created user without password and refresh token
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req,res)=>{
    //req body se data le aao
    //username or email check to give login
    //find the user
    //password check
    //access and refresh token generate and 
     //send to user with cookie

     const {email,username,password} =req.body

     if(!username && !email){
        throw new ApiError(400,"username or email is required")
     }
     const user =await User.findOne({
        $or: [{username},{email}]
     })
     if(!user){
        throw new ApiError(404,"user does not exist")
     }

     const isPasswordValid =await user.isPasswordCorrect(password)

     if(!isPasswordValid){
        throw new ApiError(404,"Invalid user credential")
     }

     const {accessToken,refreshToken}=await generateAccessandRefreshToken(user._id)

     //doubt why refresh token is empty and 
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    //send cookies
    const options ={
        httpOnly: true,//this make it modifiable from server side only not frontent
        secure: true
    }
    return res.
    status(200).
    cookie("accessToken",accessToken,options).
    cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(200,
            {
            user: loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    )
    )


})

const logoutUser = asyncHandler(async(req,res) => {
    //middleware se request me user object add kiye
    await User.findByIdAndUpdate(
        //query to find user
        req.user._id,
        //what to update
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            //return mein jo response milega usme new vlue hogi
            new:true
        }

    )

    const options ={
        httpOnly: true,//this make it modifiable from server side only not frontent
        secure: true
    }
    return res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))   
})

const refreshAccessToken =asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

    try {
        const decodedToken =jwt.verify(incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user =await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"expired or used refresh token")
        }
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken, newRefreshToken}=await generateAccessandRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("newRefreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message ||"Invalid refresh token")
    }
    
})

const changeCurrentPasswod= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body
    //auth middleware se user object add kiye
    const user=await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Old password is incorrect")
    }
    user.password=newPassword//pre hook se password hash ho jayega joki user model me define kiya hai
    await user.save({validateBeforeSave: false})//validateBeforeSave false isliye kiya hai kyuki baaki fields ko validate nahi karna hai
    return res.status(200)
    .json(new ApiResponse(200,{}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    //auth middleware se user object add kiye isliye agar user login hai to user object milega
  
    return res.status(200)
    .json(200,req.user,"Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body
    if(!fullName || !email){
        throw new ApiError(400,"Full name and email are required")
    }
  
    const user =await User.findById(req.user?._id,
        {//$set operator is used to update the fields
        $set:{
            fullName,//fullName is coming from req.body when user is updating account details from frontend
            email
        }
    },
    {new:true}//new:true is used to return the updated document
).select("-password")

return res.status(200)
.json(new ApiResponse(200,user,"Account details updated successfully"))
  
})

//to update files like avatar we have to use multer middleware in routes

const updateAvatar = asyncHandler(async(req,res)=>{
    const  avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar =await  uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"error while uploading Avatar file to cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Avatar updated successfully"))


})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image file is required")
    }
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"error while uploading cover image file to cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Cover image updated successfully")) 


}

)

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPasswod,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
 }