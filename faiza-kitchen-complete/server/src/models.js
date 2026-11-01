import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:100},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  password:{type:String,required:true},
  role:{type:String,enum:["customer","admin"],default:"customer"},
  phone:{type:String,default:"",trim:true},
  addresses:[{
    label:{type:String,default:"Home"},
    recipientName:{type:String,default:""},
    phone:{type:String,default:""},
    street:{type:String,default:""},
    area:{type:String,default:""},
    city:{type:String,default:"Karachi"},
    instructions:{type:String,default:""}
  }]
},{timestamps:true});

const menuItemSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true},
  description:{type:String,default:""},
  category:{type:String,required:true},
  price:{type:Number,required:true,min:1},
  image:{type:String,default:""},
  available:{type:Boolean,default:true},
  featured:{type:Boolean,default:false},
  spicy:{type:Boolean,default:false}
},{timestamps:true});

const orderSchema = new mongoose.Schema({
  customer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  customerName:{type:String,required:true},
  email:{type:String,default:""},
  phone:{type:String,required:true},
  address:{type:String,required:true},
  deliveryInstructions:{type:String,default:""},
  items:[{
    menuItem:{type:mongoose.Schema.Types.ObjectId,ref:"MenuItem"},
    name:String,price:Number,quantity:Number
  }],
  subtotal:{type:Number,required:true},
  deliveryFee:{type:Number,default:0},
  total:{type:Number,required:true},
  paymentMethod:{type:String,enum:["Cash on Delivery"],default:"Cash on Delivery"},
  status:{type:String,enum:["Pending","Confirmed","Preparing","Out for Delivery","Delivered","Cancelled"],default:"Pending"}
},{timestamps:true});

export const User=mongoose.model("User",userSchema);
export const MenuItem=mongoose.model("MenuItem",menuItemSchema);
export const Order=mongoose.model("Order",orderSchema);
