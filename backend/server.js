// require('dotenv').config(); 

// const path=require('path'); 
// const express=require('express'); 

// const cors=require('cors'); 
// const morgan=require('morgan'); 
// const connectDB=require('./src/config/db');
// const app=express(); app.use(cors()); 
// app.use(express.json({limit:'2mb'})); 
// app.use(morgan('dev')); 
// app.use(express.static(path.join(__dirname,'public')));
// app.get('/api/health',(req,res)=>res.json({ok:true,service:'StarReach API'}));
// app.use('/api/auth',require('./src/routes/auth')); 
// app.use('/api/artists',require('./src/routes/artists')); 
// app.use('/api/bookings',require('./src/routes/bookings')); 
// app.use('/api/admin',require('./src/routes/admin'));
// app.use((req,res,next)=>{if(req.path.startsWith('/api/'))return res.status(404).json({message:'API route not found'});
// res.sendFile(path.join(__dirname,'public','index.html'));});
// const PORT=process.env.PORT||5000; 
// (async()=>{try{await connectDB();app.listen(PORT,()=>console.log(`StarReach server running on port ${PORT}`));

// }catch(e){process.exit(1);

// }})();


require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./src/config/db');

const app = express();

app.use(cors());

app.use(express.json({
  limit: '15mb'
}));

app.use(morgan('dev'));

app.use(express.static(
  path.join(__dirname, 'public')
));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'StarReach API'
  });
});

app.use('/api/auth', require('./src/routes/auth'));

app.use('/api/artists', require('./src/routes/artists'));

app.use('/api/bookings', require('./src/routes/bookings'));

app.use('/api/admin', require('./src/routes/admin'));

// API 404 handler
app.use((req, res, next) => {

  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      message: 'API route not found'
    });
  }

  // Frontend fallback
  res.sendFile(
    path.join(__dirname, 'public', 'index.html')
  );
});

const PORT = process.env.PORT || 5000;

(async () => {

  try {

    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `StarReach server running on port ${PORT}`
      );
    });

  } catch (error) {

    console.error(
      'Server startup failed:',
      error.message
    );

    process.exit(1);
  }

})();