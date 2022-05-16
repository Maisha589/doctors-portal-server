const express = require('express');
const cors = require('cors');
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;


// middleWare
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nakca.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("booking");

        app.get("/service", async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        // warning
        // This is not the proper way to query 
        // after learning more about mongodb.use aggregate lookup, pipeline, match,group
        app.get("/available", async (req, res) => {
            const date = req.query.date || "May 16, 2022";

            // step-1: get all services

            const services = await serviceCollection.find().toArray();

            // step:2 get the booking of that day outPut: [{}, {}, {}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step:3 for each service, 
            services.forEach(service => {
                // step:4 find bookings for that service. outPut: [{}, {}, {}, {}]
                const serviceBookings = bookings.filter(book => book.treatment === service.name);
                // step:5 select slots for the service bookings: ["", "", "",""]
                const bookedSlots = serviceBookings.map(book => book.slot);
                // step:6 select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step: 7 se available to slots to make it easier
                service.slots = available;
            })

            res.send(services)
        })

        /**
         * API naming convention
         * app.get("/booking") // get all bookings in this collection . or get more than one or by filter 
         * app.get("/booking") // get a specific booking
         * app.post("/booking") //add a new booking
         * app.patch("/booking/:id") //
         * app.delete("/booking/:id") //
         */
        app.get("/booking", async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })


        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };

            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            // console.log(result);
            res.send({ success: true, result });
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from doctor uncle')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})