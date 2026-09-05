const jwt=require('jsonwebtoken');
const User=require('../models/User');
async function protect(req,res,next){

  try{const h=req.headers.authorization||''; 
    if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Authentication required'}); 
    const token=h.slice(7); 
    const decoded=jwt.verify(token,process.env.JWT_SECRET); 
    req.user=await User.findById(decoded.id).select('-password'); 
    if(!req.user) return res.status(401).json({message:'User not found'}); next();
  }
  catch(e){
    return res.status(401).json({message:'Invalid or expired token'});
  }
}
function adminOnly(req,res,next){
  if(req.user?.role!=='admin') return res.status(403).json({message:'Admin access required'});
  next();
}
module.exports={protect,adminOnly,optionalAuth};

// Like protect, but never blocks the request: if a valid token is present
// req.user is set, otherwise the request just continues unauthenticated.
// Used so public artist routes can decide what to include (e.g. manager
// contact info) based on whether the caller is logged in, without making
// login required just to view the roster.
async function optionalAuth(req,res,next){
  try{
    const h=req.headers.authorization||'';
    if(!h.startsWith('Bearer ')) return next();
    const token=h.slice(7);
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    req.user=await User.findById(decoded.id).select('-password');
    next();
  }
  catch(e){
    next();
  }
}
