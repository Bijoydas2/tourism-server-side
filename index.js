const express = require('express');
const cors = require('cors');
const app=express();
const port =process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middleware 
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uevarui.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const packagesCollection = client.db('packageCode').collection('tourPackages');
    const bookingCollection = client.db('packageCode').collection('bookings')
    //  features-package api
    app.get('/featured-packages',async(req,res)=>{
       const cursor = packagesCollection
      .find({})
      .sort({ bookingCount: -1 }) 
      .limit(6);
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
 
   
    // package details api
    app.get('/packages/:id',async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result =await packagesCollection.findOne(query);
      res.send(result)
    })
    app.post('/packages', async(req,res)=>{
      const newPackage= req.body;
      const result = await packagesCollection.insertOne(newPackage);
      res.send(result)
    })
    app.patch('/packages/:id',async(req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
    $set: updatedData
    };
    const result = await packagesCollection.updateOne(filter, updateDoc)
    res.send(result)
   });
   app.delete('/packages/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    const result = await packagesCollection.deleteOne(query);
    res.send(result);
   });

    //  booking related api
    app.get('/bookings',async(req,res)=>{
      const email =req.query.email;

      const query ={
            buyer_email: email
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)

    });

    app.post('/bookings',async(req,res)=>{
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })
    // Update booking 
    app.patch('/bookings/:id', async (req, res) => {
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
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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