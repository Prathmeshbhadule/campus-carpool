import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ENV } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Ride } from '../src/models/Ride.js';

let authToken = '';
let driverUser = null;
let testRideId = '';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(ENV.MONGODB_URI);
  }

  // Find or create test driver
  driverUser = await User.findOne({ email: '122100451001@mitaoe.ac.in' });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: '122100451001@mitaoe.ac.in',
      password: 'StudentPassword@123'
    });
  authToken = loginRes.body.data.token;
});

afterAll(async () => {
  if (testRideId) {
    await Ride.findByIdAndDelete(testRideId);
  }
  await mongoose.connection.close();
});

describe('Ride CRUD and Query API Endpoints', () => {
  it('GET /api/v1/rides should return a list of active rides with pagination metadata', async () => {
    const res = await request(app).get('/api/v1/rides?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  it('POST /api/v1/rides should fail with 422 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Incomplete ride'
      });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/rides should successfully publish a ride when authenticated', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const res = await request(app)
      .post('/api/v1/rides')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        origin: { name: 'Kothrud Stand', locality: 'Kothrud' },
        destination: { name: 'MITAOE Main Gate', locality: 'Alandi' },
        viaRoute: ['Deccan', 'Shivajinagar'],
        departureTime: futureDate.toISOString(),
        seatsTotal: 3,
        costPerSeat: 75,
        vehicle: { type: 'car', model: 'Hyundai i20', plate: 'MH 12 DE 3412' },
        notes: 'Jest automated test ride'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.origin.locality).toBe('Kothrud');
    testRideId = res.body.data._id;
  });

  it('GET /api/v1/rides/:id should return complete ride details', async () => {
    const res = await request(app).get(`/api/v1/rides/${testRideId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ride._id).toBe(testRideId);
  });
});
