const router=require('express').Router(); 
const jwt=require('jsonwebtoken'); 
const User=require('../models/User'); 
const {protect}=require('../middleware/auth');

function tokenFor(user) {
    return jwt.sign(
        {
            id: user._id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES || '7d'
        }
    );
}
router.post('/register',async(req,res)=>{
    try{
        const {
            firstName,lastName,email,password,phone,company
        }=req.body;
        if(!firstName||!lastName||!email||!password) 
            return res.status(400).json({message:'First name, last name, email and password are required'}
        );
        if(password.length<6)
            return res.status(400).json({message:'Password must be at least 6 characters'}
        );
        if(await User.findOne({email}))
            return res.status(409).json({message:'An account with that email already exists'}
        );
        const user=await User.create({
            firstName,lastName,email,password,phone,company}
        );
        res.status(201).json({token:tokenFor(user),
            user:{id:user._id,
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                role:user.role
            }
        });
    }
    catch(e){res.status(500).json({message:e.message});
}});
router.post('/login',async(req,res)=>{
    try{
        const {email,password}=req.body;
        const user=await User.findOne({email});
        if(!user||!(await user.comparePassword(password))){
            return res.status(401).json({
                message:'Invalid email or password'
            });
        }
        res.json({token:tokenFor(user),

            user:{
                id:user._id,
                firstName:user.firstName,
                lastName:user.lastName,
                email:user.email,
                phone:user.phone,
                company:user.company,
                role:user.role
            }
        });
    }
    catch(e){res.status(500).json({
        message:e.message});
    }
});
router.get('/me', protect, async (req, res) => {
    res.json({
        user: req.user
    });
});
module.exports=router;
