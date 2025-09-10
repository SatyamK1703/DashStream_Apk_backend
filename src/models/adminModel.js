import mongoose from 'mongoose';
const adminSchema = new mongoose.Schema({
    name:{
        type:String,
        require:[true,'Name is required']
    },
    email:{
        type:String,
        lowercase:true
    },
    phone:{
        type:String,
        require:[true,'Phone number is required']
    },
     managedAreas: [
      {
        areaName: { type: String, required: true },
        city: { type: String, required: true }, 
        pincode:[string], 
        professionals: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },


})

const admin =mongoose.Model('admin',adminSchema);
export default admin;
