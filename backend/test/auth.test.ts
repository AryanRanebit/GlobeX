import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database';

const app = createApp();

describe('Auth API', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Clean up user
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
    await disconnectDatabase();
  });

  it('should sign up a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        companyName: 'Test Inc',
        companyType: 'Manufacturer',
        industry: 'Textiles'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.tokens).toBeDefined();
  });

  it('should fail to sign up with duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        name: 'Test User 2',
        email: 'test@example.com',
        password: 'Password123!',
        companyName: 'Test Inc 2',
        companyType: 'Manufacturer',
        industry: 'Textiles'
      });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Email already in use');
  });

  it('should log in existing user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.tokens).toBeDefined();
  });

  it('should fail to log in with incorrect password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword123!'
      });
    
    expect(res.status).toBe(401);
  });
});
