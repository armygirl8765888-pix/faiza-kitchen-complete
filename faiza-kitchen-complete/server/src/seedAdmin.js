import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {User} from "./models.js";
const run=async()=>{
 if(!process.env.MONGODB_URI||!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD) throw new Error("Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env");
 if(process.env.ADMIN_PASSWORD.length<12) throw new Error("Use an admin password with at least 12 characters.");
 await mongoose.connect(process.env.MONGODB_URI);
 const email=process.env.ADMIN_EMAIL.toLowerCase().trim();
 const password=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);
 await User.findOneAndUpdate({email},{name:process.env.ADMIN_NAME||"Faiza Kitchen Admin",email,password,role:"admin"},{upsert:true,new:true,setDefaultsOnInsert:true});
 console.log("Admin account is ready:",email);
 await mongoose.disconnect();
};
run().catch(e=>{console.error(e.message);process.exit(1);});
