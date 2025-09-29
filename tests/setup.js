const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env.NODE_ENV = "test";

// Global test setup
let mongoServer;

beforeAll(async () => {
  // Connect to test database
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 10000,
      });
    } catch (err) {
      // Do not hard-fail CI/dev when DB is not reachable; allow non-DB tests to run
      // eslint-disable-next-line no-console
      console.warn("⚠️  Test DB connection failed, falling back to in-memory:", err?.message || err);
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 3000,
      });
    }
  } else {
    // Spin up in-memory Mongo when no URI is provided
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 3000,
    });
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up database and close connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
