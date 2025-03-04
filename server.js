// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Payment Gateway Integration with Stripe
const stripe = require('stripe')('sk_test_YourTestKeyHere'); // Replace with your actual Stripe test secret key

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------
// MongoDB Connection
// ---------------------------
mongoose
  .connect('mongodb://localhost:27017/railwayReservation')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) =>
    console.error('MongoDB connection error. Please ensure MongoDB is running.', err)
  );

// ---------------------------
// Mongoose Models
// ---------------------------

// Train Schema & Model
const trainSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  source: { type: String, required: true },
  destination: { type: String, required: true },
  seats: { type: Number, required: true },
});
const Train = mongoose.model('Train', trainSchema);
const ticketSchema = new mongoose.Schema({
  pnr: { type: String, required: true, unique: true },
  trainNo: { type: String, required: true },
  passengerName: { type: String, required: true },
  passengerAge: { type: Number, required: true },
  status: { type: String, default: 'CONFIRMED' },
});
const Ticket = mongoose.model('Ticket', ticketSchema);
app.post('/trains', async (req, res) => {
  const { number, name, source, destination, seats } = req.body;
  if (!number || !name || !source || !destination || seats == null) {
    return res.status(400).json({ message: 'All train details are required.' });
  }
  try {
    const existingTrain = await Train.findOne({ number });
    if (existingTrain) {
      return res.status(400).json({ message: 'Train with this number already exists.' });
    }
    const newTrain = new Train({
      number,
      name,
      source,
      destination,
      seats: parseInt(seats, 10),
    });
    await newTrain.save();
    res.json({ message: 'Train added successfully!', train: newTrain });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/**
 * Reserve a ticket.
 */
app.post('/tickets/reserve', async (req, res) => {
  const { trainNo, passengerName, passengerAge } = req.body;
  if (!trainNo || !passengerName || passengerAge == null) {
    return res.status(400).json({ message: 'All reservation details are required.' });
  }
  try {
    const train = await Train.findOne({ number: trainNo });
    if (!train || train.seats <= 0) {
      return res.status(400).json({ message: 'No seats available or invalid train number.' });
    }
    let pnr;
    let existingTicket;
    do {
      pnr = Math.floor(10000 + Math.random() * 90000).toString();
      existingTicket = await Ticket.findOne({ pnr });
    } while (existingTicket);

    const newTicket = new Ticket({
      pnr,
      trainNo,
      passengerName,
      passengerAge: parseInt(passengerAge, 10),
      status: 'CONFIRMED',
    });
    await newTicket.save();

    // Deduct a seat from the train
    train.seats = train.seats - 1;
    await train.save();

    res.json({ message: 'Ticket booked!', pnr, ticket: newTicket });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/**
 * Check ticket status by PNR.
 */
app.get('/tickets/:pnr', async (req, res) => {
  const { pnr } = req.params;
  try {
    const ticket = await Ticket.findOne({ pnr });
    if (ticket) {
      res.json({ pnr, ticket });
    } else {
      res.status(404).json({ message: 'Ticket not found.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/**
 * Cancel a ticket using its PNR.
 */
app.delete('/tickets/:pnr', async (req, res) => {
  const { pnr } = req.params;
  try {
    const ticket = await Ticket.findOne({ pnr });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }
    const trainNo = ticket.trainNo;
    await Ticket.deleteOne({ pnr });
    await Train.updateOne({ number: trainNo }, { $inc: { seats: 1 } });
    res.json({ message: 'Ticket cancelled successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

/**
 * (Optional) List all trains.
 */
app.get('/trains', async (req, res) => {
  try {
    const trains = await Train.find({});
    res.json(trains);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ---------------------------
// Payment Gateway Integration
// ---------------------------
/**
 * Create a payment intent.
 * Expects JSON with:
 * - amount: The amount to be charged (in the smallest currency unit, e.g., cents).
 * - currency: (Optional) Currency code (default is 'usd').
 *
 * This endpoint supports multiple payment methods such as credit/debit cards,
 * net banking, and UPI.
 */
app.post('/payment/create', async (req, res) => {
  const { amount, currency } = req.body;
  if (!amount) {
    return res.status(400).json({ message: 'Amount is required.' });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in the smallest currency unit
      currency: currency || 'usd',
      payment_method_types: ['card', 'netbanking', 'upi'],
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      message: 'Payment intent created successfully.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment creation failed', error: error.message });
  }
});

// ---------------------------
// Start the Server
// ---------------------------
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
