import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {User,MenuItem,Order} from "./models.js";
import {auth,adminOnly} from "./auth.js";
import {starterMenu} from "./seedMenu.js";
import {MongoMemoryServer} from "mongodb-memory-server";

const app=express();
app.use(helmet());
app.use(cors({origin:(process.env.CLIENT_URL||"http://localhost:5173").split(",").map(x=>x.trim()),credentials:false}));
app.use(express.json({limit:"1mb"}));
app.use("/api/auth",rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:true,legacyHeaders:false}));
app.use("/api/ai",rateLimit({windowMs:60*1000,limit:15,standardHeaders:true,legacyHeaders:false}));

const tokenFor=u=>jwt.sign({id:u._id,role:u.role,name:u.name},process.env.JWT_SECRET,{expiresIn:"7d"});
const safeUser=u=>({id:u._id,name:u.name,email:u.email,role:u.role,phone:u.phone||"",addresses:u.addresses||[]});

app.get("/api/health",(_req,res)=>res.json({ok:true,service:"Faiza Kitchen API"}));

app.post("/api/auth/register",async(req,res)=>{
 try{
  const {name,email,password,phone}=req.body;
  if(!name?.trim()||!email?.trim()||!password||password.length<8) return res.status(400).json({message:"Name, valid email and password (at least 8 characters) are required."});
  const normalized=email.trim().toLowerCase();
  if(await User.findOne({email:normalized})) return res.status(409).json({message:"This email is already registered. Please log in."});
  const user=await User.create({name:name.trim(),email:normalized,password:await bcrypt.hash(password,12),phone:String(phone||"").trim()});
  res.status(201).json({token:tokenFor(user),user:safeUser(user)});
 }catch(e){res.status(500).json({message:"Could not create account."});}
});
app.post("/api/auth/login",async(req,res)=>{
 const email=String(req.body.email||"").trim().toLowerCase();
 const user=await User.findOne({email});
 if(!user||!(await bcrypt.compare(req.body.password||"",user.password))) return res.status(401).json({message:"Email or password is incorrect."});
 res.json({token:tokenFor(user),user:safeUser(user)});
});
app.get("/api/auth/me",auth,async(req,res)=>{
 const user=await User.findById(req.user.id).select("-password");
 if(!user)return res.status(404).json({message:"Account not found."});
 res.json(safeUser(user));
});
app.patch("/api/account/profile",auth,async(req,res)=>{
 const {name,phone}=req.body;
 const user=await User.findByIdAndUpdate(req.user.id,{name:String(name||"").trim(),phone:String(phone||"").trim()},{new:true,runValidators:true}).select("-password");
 if(!user)return res.status(404).json({message:"Account not found."});
 res.json(safeUser(user));
});
app.get("/api/menu",async(_req,res)=>{
 for(const item of starterMenu) await MenuItem.updateOne({name:item.name},{$setOnInsert:item},{upsert:true});
 res.json(await MenuItem.find({available:true}).sort({category:1,name:1}));
});

app.post("/api/orders",auth,async(req,res)=>{
 try{
  const {items,phone,address,recipientName,area,city,deliveryInstructions}=req.body;
  if(!Array.isArray(items)||!items.length||!phone?.trim()||!address?.trim()||!area?.trim()||!city?.trim())
   return res.status(400).json({message:"Please add a phone number, street address, area and city."});
  if(items.length>30)return res.status(400).json({message:"Too many different items in one order."});
  const ids=items.map(x=>x.id);
  const menu=await MenuItem.find({_id:{$in:ids},available:true});
  const orderItems=items.map(x=>{
   const m=menu.find(y=>String(y._id)===String(x.id));
   if(!m)throw new Error("One item is no longer available. Please refresh your menu.");
   const quantity=Math.max(1,Math.min(20,Math.floor(Number(x.quantity)||1)));
   return {menuItem:m._id,name:m.name,price:m.price,quantity};
  });
  const subtotal=orderItems.reduce((s,x)=>s+x.price*x.quantity,0);
  const deliveryFee=Number(process.env.DELIVERY_FEE||0);
  const order=await Order.create({
   customer:req.user.id,customerName:String(recipientName||req.user.name).trim(),email:"",
   phone:String(phone).trim(),address:`${String(address).trim()}, ${String(area).trim()}, ${String(city).trim()}`,
   deliveryInstructions:String(deliveryInstructions||"").trim().slice(0,500),
   items:orderItems,subtotal,deliveryFee,total:subtotal+deliveryFee,paymentMethod:"Cash on Delivery"
  });
  res.status(201).json(order);
 }catch(e){res.status(400).json({message:e.message||"Could not place order."});}
});
app.get("/api/orders/mine",auth,async(req,res)=>res.json(await Order.find({customer:req.user.id}).sort({createdAt:-1})));
app.get("/api/orders/track/:id",async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))return res.status(404).json({message:"Order not found."});
 const order=await Order.findById(req.params.id).select("customerName items total status createdAt");
 if(!order)return res.status(404).json({message:"Order not found."});
 res.json(order);
});
app.get("/api/admin/orders",auth,adminOnly,async(_req,res)=>res.json(await Order.find().sort({createdAt:-1})));
app.patch("/api/admin/orders/:id",auth,adminOnly,async(req,res)=>{
 const allowed=["Pending","Confirmed","Preparing","Out for Delivery","Delivered","Cancelled"];
 if(!allowed.includes(req.body.status))return res.status(400).json({message:"Invalid order status."});
 const order=await Order.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true});
 if(!order)return res.status(404).json({message:"Order not found."});
 res.json(order);
});
app.post("/api/admin/menu",auth,adminOnly,async(req,res)=>{
 const {name,description,category,price,image}=req.body;
 if(!name?.trim()||!category||!Number.isFinite(Number(price))||Number(price)<1)return res.status(400).json({message:"Name, category and valid price are required."});
 res.status(201).json(await MenuItem.create({name,description,category,price:Number(price),image,available:true}));
});
app.patch("/api/admin/menu/:id",auth,adminOnly,async(req,res)=>{
 const item=await MenuItem.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
 if(!item)return res.status(404).json({message:"Menu item not found."});
 res.json(item);
});
app.delete("/api/admin/menu/:id",auth,adminOnly,async(req,res)=>{
 await MenuItem.findByIdAndDelete(req.params.id);res.json({message:"Menu item deleted."});
});
app.post("/api/ai/chat",async(req,res)=>{
 try{
  if(!process.env.OLLAMA_API_KEY)return res.status(503).json({message:"Faiza Assistant is being set up. Please use the menu or contact the restaurant."});
  const message=String(req.body.message||"").trim().slice(0,1200);
  if(!message)return res.status(400).json({message:"Please enter a message."});
  const items=await MenuItem.find({available:true}).select("name description category price").lean();
  const menuContext=items.map(x=>`${x.name} | ${x.category} | Rs ${x.price} | ${x.description}`).join("\n");
  const response=await fetch(`${(process.env.OLLAMA_HOST||"https://ollama.com").replace(/\/$/,"")}/api/chat`,{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OLLAMA_API_KEY}`},
   body:JSON.stringify({model:process.env.OLLAMA_MODEL||"gemma4:31b",stream:false,messages:[
    {role:"system",content:`You are Faiza Kitchen's polite Pakistani desi-food website assistant. Match the customer's language; use simple English or Roman Urdu. Only discuss the current menu below. Never invent prices, ingredients, discounts, opening hours or delivery estimates. If asked about an unlisted item, say it is not currently listed and suggest contacting the restaurant. Do not collect passwords, card details or sensitive information. You cannot place orders; direct customers to add items to cart and checkout. MENU:\n${menuContext}`},
    {role:"user",content:message}
   ]})
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"AI provider request failed.");
  res.json({reply:data.message?.content||"Sorry, I could not prepare an answer."});
 }catch(e){res.status(502).json({message:"Faiza Assistant is temporarily unavailable. Please try again later."});}
});

const start=async()=>{
 if(!process.env.MONGODB_URI||!process.env.JWT_SECRET)throw new Error("MONGODB_URI and JWT_SECRET are required.");
 let mongoUri=process.env.MONGODB_URI;
 let memoryServer;
 if(mongoUri.startsWith("mongodb://127.0.0.1:27017")){
  try{
   await mongoose.connect(mongoUri,{serverSelectionTimeoutMS:2000});
  }catch{
   memoryServer=await MongoMemoryServer.create();
   mongoUri=memoryServer.getUri();
   await mongoose.connect(mongoUri);
   console.log("Using a temporary local MongoDB for development.");
  }
 }else{
  await mongoose.connect(mongoUri);
 }
 const port=process.env.PORT||5000;
 app.listen(port,()=>console.log(`Faiza Kitchen API running on port ${port}`));
};
start().catch(e=>{
 console.error("Server startup failed:",e.message);
 if(e.name==="MongooseServerSelectionError"){
  console.error("MongoDB Atlas could not authenticate or reach the cluster. Verify the database user password and add this computer's current public IP to Atlas Network Access.");
 }
 process.exit(1);
});
