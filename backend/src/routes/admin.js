const router=require('express').Router(); 
const User=require('../models/User'); 
const actor=require('../models/Actor'); 
const Booking=require('../models/Booking'); 
const {protect,adminOnly}=require('../middleware/auth');
router.get('/stats',protect,adminOnly,async(req,res)=>{
    const [clients,actors,bookings,pending]=await Promise.all([User.countDocuments({role:'client'}),
        actor.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({status:'pending'})]
    );
    res.json({clients,actors,bookings,pending});
});
router.get('/clients',protect,adminOnly,async(req,res)=>
    res.json(await User.find({role:'client'}).select('-password').sort({createdAt:-1}))
);
module.exports=router;
