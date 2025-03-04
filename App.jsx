import React, { useState } from 'react';
import './App.css';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// PaymentForm Component for Stripe Payment
function PaymentForm({ clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (error) {
      setPaymentError(error.message);
      setPaymentSuccess(null);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setPaymentSuccess('Payment successful!');
      setPaymentError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
      <CardElement options={{ hidePostalCode: true }} />
      <button type="submit" disabled={!stripe} style={{ marginTop: '10px' }}>
        Pay
      </button>
      {paymentError && <div style={{ color: 'red', marginTop: '10px' }}>{paymentError}</div>}
      {paymentSuccess && <div style={{ color: 'green', marginTop: '10px' }}>{paymentSuccess}</div>}
    </form>
  );
}

function App() {
  // States for "Add Train" inputs
  const [trainNumber, setTrainNumber] = useState('');
  const [trainName, setTrainName] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [seats, setSeats] = useState('');

  // States for "Reserve Ticket" inputs
  const [reserveTrainNumber, setReserveTrainNumber] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerAge, setPassengerAge] = useState('');

  // States for "Check PNR" inputs and output
  const [pnrNumber, setPnrNumber] = useState('');
  const [pnrStatus, setPnrStatus] = useState('');

  // State for "Cancel Ticket" input
  const [cancelPNR, setCancelPNR] = useState('');

  // Payment related states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [clientSecret, setClientSecret] = useState(null);

  // Section control
  const [currentSection, setCurrentSection] = useState(null);

  // Backend URL (adjust if needed)
  const backendUrl = 'http://localhost:5000';

  // Navigation function
  const showSection = (section) => {
    setCurrentSection(section);
    if (section !== 'payment') {
      setClientSecret(null);
    }
  };

  // Add Train
  const addTrain = async () => {
    if (!trainNumber) {
      alert('Train number is required.');
      return;
    }
    try {
      const response = await fetch(`${backendUrl}/trains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: trainNumber,
          name: trainName,
          source,
          destination,
          seats: parseInt(seats, 10),
        }),
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert('Error adding train: ' + error.message);
    }
    setTrainNumber('');
    setTrainName('');
    setSource('');
    setDestination('');
    setSeats('');
  };
  const reserveTicket = async () => {
    try {
      const response = await fetch(`${backendUrl}/tickets/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainNo: reserveTrainNumber,
          passengerName,
          passengerAge: parseInt(passengerAge, 10),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Ticket booked! PNR: ${data.pnr}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error reserving ticket: ' + error.message);
    }
    setReserveTrainNumber('');
    setPassengerName('');
    setPassengerAge('');
  };

  // Check PNR Status
  const checkPNR = async () => {
    try {
      const response = await fetch(`${backendUrl}/tickets/${pnrNumber}`);
      const data = await response.json();
      if (response.ok) {
        const ticket = data.ticket;
        setPnrStatus(
          `PNR: ${pnrNumber}, Train: ${ticket.trainNo}, Passenger: ${ticket.passengerName || ticket.name}, Status: ${ticket.status}`
        );
      } else {
        setPnrStatus(data.message);
      }
    } catch (error) {
      setPnrStatus('Error checking PNR: ' + error.message);
    }
  };

  // Cancel Ticket
  const cancelTicket = async () => {
    try {
      const response = await fetch(`${backendUrl}/tickets/${cancelPNR}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      alert(data.message);
    } catch (error) {
      alert('Error cancelling ticket: ' + error.message);
    }
    setCancelPNR('');
  };

  // Create Payment Intent
  const createPayment = async () => {
    try {
      const response = await fetch(`${backendUrl}/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseInt(paymentAmount, 10),
          currency: 'usd',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setClientSecret(data.clientSecret);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error creating payment: ' + error.message);
    }
  };

  return (
    <div className="container" style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h2>Railway Reservation System</h2>
      <div>
        <button onClick={() => showSection('addTrain')}>Add Train</button>
        <button onClick={() => showSection('reserveTicket')}>Reserve Ticket</button>
        <button onClick={() => showSection('checkPNR')}>Check PNR Status</button>
        <button onClick={() => showSection('cancelTicket')}>Cancel Ticket</button>
        <button onClick={() => showSection('payment')}>Payment</button>
      </div>

      {currentSection === 'addTrain' && (
        <div id="addTrain" className="section" style={{ marginTop: '20px' }}>
          <h3>Add Train</h3>
          <input type="text" placeholder="Train Number" value={trainNumber} onChange={(e) => setTrainNumber(e.target.value)} />
          <br />
          <input type="text" placeholder="Train Name" value={trainName} onChange={(e) => setTrainName(e.target.value)} />
          <br />
          <input type="text" placeholder="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          <br />
          <input type="text" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <br />
          <input type="number" placeholder="Seats Available" value={seats} onChange={(e) => setSeats(e.target.value)} />
          <br />
          <button onClick={addTrain}>Add Train</button>
        </div>
      )}

      {currentSection === 'reserveTicket' && (
        <div id="reserveTicket" className="section" style={{ marginTop: '20px' }}>
          <h3>Reserve Ticket</h3>
          <input type="text" placeholder="Train Number" value={reserveTrainNumber} onChange={(e) => setReserveTrainNumber(e.target.value)} />
          <br />
          <input type="text" placeholder="Passenger Name" value={passengerName} onChange={(e) => setPassengerName(e.target.value)} />
          <br />
          <input type="number" placeholder="Age" value={passengerAge} onChange={(e) => setPassengerAge(e.target.value)} />
          <br />
          <button onClick={reserveTicket}>Book Ticket</button>
        </div>
      )}

      {currentSection === 'checkPNR' && (
        <div id="checkPNR" className="section" style={{ marginTop: '20px' }}>
          <h3>Check PNR Status</h3>
          <input type="text" placeholder="Enter PNR" value={pnrNumber} onChange={(e) => setPnrNumber(e.target.value)} />
          <br />
          <button onClick={checkPNR}>Check Status</button>
          <p>{pnrStatus}</p>
        </div>
      )}

      {currentSection === 'cancelTicket' && (
        <div id="cancelTicket" className="section" style={{ marginTop: '20px' }}>
          <h3>Cancel Ticket</h3>
          <input type="text" placeholder="Enter PNR" value={cancelPNR} onChange={(e) => setCancelPNR(e.target.value)} />
          <br />
          <button onClick={cancelTicket}>Cancel Ticket</button>
        </div>
      )}

      {currentSection === 'payment' && (
        <div id="payment" className="section" style={{ marginTop: '20px' }}>
          <h3>Payment</h3>
          {!clientSecret ? (
            <>
              <input type="number" placeholder="Amount (in cents)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              <br />
              <button onClick={createPayment}>Create Payment</button>
            </>
          ) : (
            <PaymentForm clientSecret={clientSecret} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
