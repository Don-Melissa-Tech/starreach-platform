const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  firstName:{type:String,required:true,trim:true}, lastName:{type:String,required:true,trim:true},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  phone:{type:String,trim:true}, company:{type:String,trim:true}, password:{type:String,required:true,minlength:6},
  role:{type:String,enum:['client','admin'],default:'client'}
},{timestamps:true});
userSchema.pre('save', async function(next){ 
  if(!this.isModified('password')) 
    return next(); 
  this.password=await bcrypt.hash(this.password,12); next(); 
});
userSchema.methods.comparePassword=function(password){return bcrypt.compare(password,this.password);};
module.exports=mongoose.model('User',userSchema);
