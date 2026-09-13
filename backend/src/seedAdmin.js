require('dotenv').config(); 
const mongoose=require('mongoose'); 
const User=require('./models/User'); 
const actor=require('./models/Actor'); 
const connectDB=require('./config/db');
(async()=>{
    try{
        await connectDB();
        const email=process.env.ADMIN_EMAIL||'admin@starreach.com';
        let u=await User.findOne({email});
        if(!u)u=await User.create({
            firstName:'StarReach',
            lastName:'Admin',
            email,
            password:process.env.ADMIN_PASSWORD||'Melissa_2028!',
            role:'admin'
        });
        else{
            u.role='admin';
            u.password=process.env.ADMIN_PASSWORD||u.password;await u.save();
        }
        console.log('Admin ready:',email);
        if(await actor.countDocuments()===0)
            {
                const names=[
                    [
                    'Michael B. Jordan',
                    'Actor & Performer',
                    'micheal_face.jpg'],
                    ['Daniel K',
                        'Keynote Speaker',
                        'actor-2.jpg'
                    ],
                    [
                        'Maya Rose',
                        'Comedian & Host',
                        'actor-3.jpg'
                    ],
                    ['Jonas Field',
                        'Athlete & Analyst',
                        'actor-4.jpg'
                    ],
                    ['Lena Star',
                        'DJ & Producer',
                        'actor-5.jpg'
                    ],
                    ['Ana Torres',
                        'TV Host & Presenter',
                        'actor-6.jpg'
                    ],
                    ['Chris Voice',
                        'Gospel actor'
                        ,'actor-7.jpg'
                    ],
                    ['Nora James',
                        'Actress & Host',
                        'actor-8.jpg'
                    ],
                    ['Victor Ray',
                        'Live Band',
                        'actor-9.jpg'
                    ],
                    ['Ella Prime',
                        'Influencer',
                        'actor-10.jpg'
                    ],
                    ['Samuel King',
                        'Speaker',
                        'actor-11.jpg'
                    ],
                    ['Rita Bloom',
                        'Musician',
                        'actor-12.jpg']
                ];
                await actor.insertMany(
                    names.map((x,i)=>({name:x[0],
                        category:i%2===0?'Actor':i%2===1?'Actor':'Entertainer',
                        role:x[1],
                        image:'/images/'+x[2],
                        location:'United State, America',
                        bio:'A professional StarReach talent available for carefully managed events, appearances and brand engagements.',
                        prices:[
                            {
                                name:'Appearance / Section',
                                price:25000,
                                description:'Standard booking section'
                            },
                            {
                                name:'Premium Section',
                                price:45000,
                                description:'Extended appearance and premium requirements'
                            },
                            {
                                name:'Brand / Corporate Package',
                                price:75000,
                                description:'Custom corporate engagement'
                            }
                        ]
                    })
                )
            );
            console.log('Demo actors seeded.');
        }
        await mongoose.disconnect();
    }
    catch(e){
        console.error(e);process.exit(1);
    }
})();
