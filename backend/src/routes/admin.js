const router=require('express').Router(); 
const User=require('../models/User'); 
const Artist=require('../models/Artist'); 
const Booking=require('../models/Booking'); 
const {protect,adminOnly}=require('../middleware/auth');
router.get('/stats',protect,adminOnly,async(req,res)=>{
    const [clients,artists,bookings,pending]=await Promise.all([User.countDocuments({role:'client'}),
        Artist.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({status:'pending'})]
    );
    res.json({clients,artists,bookings,pending});
});
router.get('/clients',protect,adminOnly,async(req,res)=>
    res.json(await User.find({role:'client'}).select('-password').sort({createdAt:-1}))
);
module.exports=router;
