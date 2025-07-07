import mongoose,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subcriber:{
        type: Schema.Types.ObjectId,//one who is subscribing
        ref: "User",
    },channel:{
        type: Schema.Types.ObjectId,//channel to which user is subscribing
        ref: "User",
        
    }
},{
    timestamps: true
})

export const Subscription = mongoose.model("Subscription",subscriptionSchema);