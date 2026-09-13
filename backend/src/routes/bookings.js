const router=require('express').Router(); 
const Booking=require('../models/Booking'); 
const Actor=require('../models/Actor'); 
const {protect,adminOnly}=require('../middleware/auth');
router.post('/',protect,async(req,res)=>{
    try{
        const {actor,section,eventDate,eventType,venue,city}=req.body;
        if(!actor||!section||!eventDate||!eventType||!venue||!city)
            return res.status(400).json({message:'Please complete all required booking fields'});
        const a=await Actor.findById(actor);
        if(!a)return res.status(404).json({message:'Actor not found'});
        const b=await Booking.create({...req.body,client:req.user._id});
        res.status(201).json(await b.populate('actor','name category image'));
    }
    catch(e){
        res.status(400).json({message:e.message});
    }}
);
router.get('/mine',protect,async(req,res)=>
    res.json(await Booking.find({client:req.user._id}).populate('actor','name category image').sort({createdAt:-1}))
);
router.get('/',protect,adminOnly,async(req,res)=>
    res.json(await Booking.find().populate('client','firstName lastName email phone company').populate('actor','name category').sort({createdAt:-1}))
);
router.patch('/:id/status',protect,adminOnly,async(req,res)=>{
    const allowed=['pending','confirmed','completed','cancelled'];
    if(!allowed.includes(req.body.status))
        return res.status(400).json({message:'Invalid status'});
    const b=await Booking.findByIdAndUpdate(req.params.id,
        {status:req.body.status},
        {new:true}
    );
    res.json(b);
});
module.exports=router;
