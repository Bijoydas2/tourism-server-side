const express = require('express');
const cors = require('cors');
const app=express();
const port =process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const admin = require("firebase-admin");
const decoded= Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')

const serviceAccount = JSON.parse(decoded);


// middleware 
app.use(cors());
app.use(express.json());


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uevarui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyFirebaseToken = async(req,res,next)=>{
    const authHeader = req.headers?.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')){
      return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1]
    try{
       const decoded = await admin.auth().verifyIdToken(token);
       console.log('decoded token',decoded)
       req.decoded= decoded;
       next()
    }
    catch(error){
      return res.status(401).send({message : 'unauthorized access'})
    }
    
  }

  const verifyTokenEmail = (req,res,next)=>{
        if (req.query.email !== req.decoded.email){
         return res.status(403).send({ message: 'forbidden access' });

      }
      next()
 }

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const packagesCollection = client.db('packageCode').collection('tourPackages');
    const bookingCollection = client.db('packageCode').collection('bookings');
    const newsletterCollection = client.db('packageCode').collection('newletter')
    //  features-package api
    app.get('/featuredPackages',async(req,res)=>{
       const cursor = packagesCollection
      .find({})
      .sort({ bookingCount: -1 }) 
      .limit(8);
      const result = await cursor.toArray();
      res.send(result)
    })
    // all-packeges

    app.get('/packages', async (req, res) => {
    const email = req.query.email;
    const search = req.query.search || '';
     
    const query = {
    ...(email && { guide_email: email }),
    ...(search && {
      $or: [
        { tour_name: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } }
      ]
    })
  };
  const packages = await packagesCollection.find(query).toArray();
  res.send(packages);
  });



  app.get('/packages/myPackages', verifyFirebaseToken,verifyTokenEmail, async (req, res) => {
  const email = req.query.email;
  const query = { guide_email: email };
  const myPackages = await packagesCollection.find(query).toArray();
  res.send(myPackages);
  });

   
    // package details api
    app.get('/packages/:id',async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result =await packagesCollection.findOne(query);
     
      res.send(result)
    })

  app.post('/newsletter', async (req, res) => {
      try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
          return res.status(400).send({ message: 'Valid email is required' });
        }

        const existing = await newsletterCollection.findOne({ email });
        if (existing) {
          return res.status(409).send({ message: 'Email already subscribed' });
        }

        await newsletterCollection.insertOne({ email, createdAt: new Date().toISOString() });
        res.status(201).send({ message: 'Subscribed successfully' });
      } catch (error) {
        res.status(500).send({ message: 'Failed to subscribe' });
      }
    });


    app.post('/packages',verifyFirebaseToken,verifyTokenEmail,async(req,res)=>{
      const newPackage= req.body;
      const result = await packagesCollection.insertOne(newPackage);
      res.send(result)
    })
    app.patch('/packages/:id',verifyFirebaseToken,verifyTokenEmail,async(req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
    $set: updatedData
    };
    const result = await packagesCollection.updateOne(filter, updateDoc)
    res.send(result)
   });
   app.delete('/packages/:id',verifyFirebaseToken,verifyTokenEmail, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
   
    const result = await packagesCollection.deleteOne(query);
    res.send(result);
   });

    //  booking related api
    app.get('/bookings',verifyFirebaseToken,verifyTokenEmail, async(req,res)=>{
      const email =req.query.email;
   
      const query ={
            buyer_email: email
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)

    });

    app.post('/bookings',verifyFirebaseToken,async(req,res)=>{
    const booking = req.body;

    if (!booking.tour_id ) {
      return res.status(400).send({ message: 'forbidden access' });
    }
      const result = await bookingCollection.insertOne(booking);
      const tourId = booking.tour_id;
      if(tourId){
        await packagesCollection.updateOne(
           { _id: new ObjectId(tourId) },
           { $inc: { bookingCount: 1 } }
        )
      }
      res.send(result)
    })
    // Update booking 
    app.patch('/bookings/:id',verifyFirebaseToken,async (req, res) => {
      const id = req.params.id;
    
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
      $set: {
      status: 'completed'
     }
    };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
     });
    
   

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('Package Code Booking')
})

app.listen(port, ()=>{
    console.log(`Package Code server is running on Port ${port}`)
})