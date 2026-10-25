import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ENV } from '../src/config/env.js';
import { User } from '../src/models/User.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(ENV.MONGODB_URI);
  }
  await User.deleteMany({ email: { $in: ['122100459999@mitaoe.ac.in', '122100458888@mitaoe.ac.in'] } });
});

afterAll(async () => {
  // Clean up any test accounts
  await User.deleteMany({ email: { $in: ['122100459999@mitaoe.ac.in', '122100458888@mitaoe.ac.in'] } });
  await mongoose.connection.close();
});

describe('Auth API Endpoints', () => {
  const testUser = {
    name: 'Test Student',
    email: '122100459999@mitaoe.ac.in',
    password: 'Password@123',
    role: 'student',
    prn: '122100459999',
    department: 'Software Engineering',
    phone: '9876543210'
  };

  it('POST /api/v1/auth/register should successfully register a student with valid MITAOE email and PRN', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.user.department).toBe('Software Engineering');
  });

  it('POST /api/v1/auth/register should register with AIML Engineering department', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUser,
        email: '122100458888@mitaoe.ac.in',
        prn: '122100458888',
        department: 'AIML Engineering'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.department).toBe('AIML Engineering');
  });

  it('POST /api/v1/auth/register should reject non-mitaoe domain with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...testUser,
        email: 'invalid@gmail.com'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register should reject duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login should authenticate registered user and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('POST /api/v1/auth/login should reject incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
