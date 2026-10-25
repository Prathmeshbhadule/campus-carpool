import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ENV } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Ride } from '../src/models/Ride.js';
import { Booking } from '../src/models/Booking.js';

let driverToken = '';
let passengerToken1 = '';
let passengerToken2 = '';
let testRide = null;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(ENV.MONGODB_URI);
  }

  // Driver login
  const driverLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: '122100451001@mitaoe.ac.in', password: 'StudentPassword@123' });
  driverToken = driverLogin.body.data.token;

  // Passenger 1 login (Snehal)
  const pass1Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: '122100451004@mitaoe.ac.in', password: 'StudentPassword@123' });
  passengerToken1 = pass1Login.body.data.token;

  // Passenger 2 login (Pooja)
  const pass2Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: '122100451006@mitaoe.ac.in', password: 'StudentPassword@123' });
  passengerToken2 = pass2Login.body.data.token;

  // Create an isolated ride with exactly 1 available seat
  const driverUser = await User.findOne({ email: '122100451001@mitaoe.ac.in' });
  testRide = await Ride.create({
    driver: driverUser._id,
    origin: { name: 'Aundh Chowk', locality: 'Aundh', coordinates: [18.5580, 73.8075] },
    destination: { name: 'MITAOE Main Gate', locality: 'Alandi', coordinates: [18.6756, 73.8906] },
    departureTime: new Date(Date.now() + 86400000 * 2),
    seatsTotal: 1,
    seatsAvailable: 1,
    costPerSeat: 60,
    vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
    status: 'open'
  });
});

afterAll(async () => {
  if (testRide) {
    await Booking.deleteMany({ ride: testRide._id });
    await Ride.findByIdAndDelete(testRide._id);
  }
  await mongoose.connection.close();
});

describe('Booking API & Overbooking Concurrency Safety', () => {
  it('Driver should not be allowed to book seats on their own ride (400)', async () => {
    const res = await request(app)
      .post(`/api/v1/rides/${testRide._id}/bookings`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        seatsBooked: 1,
        pickupSpot: 'Aundh'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Concurrent booking requests on a 1-seat ride must atomically allow 1 and reject the other with 409', async () => {
    // Dispatch two concurrent requests
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/v1/rides/${testRide._id}/bookings`)
        .set('Authorization', `Bearer ${passengerToken1}`)
        .send({ seatsBooked: 1, pickupSpot: 'Aundh Parihar Chowk' }),
      request(app)
        .post(`/api/v1/rides/${testRide._id}/bookings`)
        .set('Authorization', `Bearer ${passengerToken2}`)
        .send({ seatsBooked: 1, pickupSpot: 'Bremen Circle' })
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one 201 (success) and one 409 (conflict/overbooking blocked)
    expect(statuses).toEqual([201, 409]);

    // Check ride state in DB
    const updatedRide = await Ride.findById(testRide._id);
    expect(updatedRide.seatsAvailable).toBe(0);
    expect(updatedRide.status).toBe('full');

    // Test honest payment marking on the successful booking
    const successfulBookingId = res1.status === 201 ? res1.body.data._id : res2.body.data._id;
    const paymentRes = await request(app)
      .patch(`/api/v1/bookings/${successfulBookingId}/payment`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        paymentStatus: 'paid_cash',
        paymentNote: 'Settled in cash at pickup'
      });

    expect(paymentRes.status).toBe(200);
    expect(paymentRes.body.data.paymentStatus).toBe('paid_cash');
  });
});
