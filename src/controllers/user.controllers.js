import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/clodinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser }