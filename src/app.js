import express from "express"
import cors from "cors"
import cookieParser  from "cookie-parser"

const app= express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials: true
}))

//koi form bhra tab humne datat liya
app.use(express.json({limit: "16kb"}))

//url se data aye
app.use(express.urlencoded({extended: true,limit: "16kb"}))
//
app.use(express.static("public"))

//for cookies 
app.use(cookieParser())
export {app}