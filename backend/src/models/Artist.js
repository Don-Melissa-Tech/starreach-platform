const mongoose=require('mongoose');

const priceSchema=new mongoose.Schema({
    name:{type:String,required:true},
    price:{type:Number,required:true},
    currency:{type:String,default:'USD'},description:String
},
{_id:false});

const managerSchema=new mongoose.Schema({
    name:String,email:String,phone:String,whatsapp:String
},
{_id:false});

const artistSchema=new mongoose.Schema({
    name:{type:String,required:true},
    category:{type:String,required:true},role:String,bio:String,image:String,location:String,
    featured:{type:Boolean,default:true},prices:[priceSchema],manager:managerSchema
},
{timestamps:true});
module.exports=mongoose.model('Artist',artistSchema);
