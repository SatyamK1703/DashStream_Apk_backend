# API Tests for DashStream React Native App

## Overview

This directory contains tests for verifying that the backend API endpoints work correctly with the React Native app. The tests cover all major API endpoints including authentication, user profile, services, bookings, and notifications.

## Running the Tests

You can run the API tests using the following command from the project root:

```bash
npm run test:api
```

Or directly run the test script:

```bash
node src/tests/run-tests.js
```

## Test Coverage

The tests cover the following areas:

1. **Authentication**
   - Registration
   - Login

2. **User Profile**
   - Get profile
   - Update profile

3. **Services**
   - Get all services
   - Get service categories

4. **Bookings**
   - Create booking
   - Get my bookings
   - Get single booking
   - Update booking status
   - Add tracking update

5. **Notifications**
   - Get notifications
   - Get unread count
   - Register device token
   - Get my devices
   - Mark all as read
   - Mark single notification as read
   - Deregister device token

## Test Results

The test script will output detailed results for each endpoint tested, including:

- ✓ Passed tests
- ✗ Failed tests
- ⚠ Skipped tests

At the end of the test run, a summary will be displayed showing the total number of tests, how many passed, failed, or were skipped, and the total duration of the test run.

## Troubleshooting

If tests are failing, check the following:

1. Make sure the server is running (`npm run dev`)
2. Verify that the API_URL in the test script is correct
3. Check that the database is properly connected
4. Ensure all required environment variables are set

## Adding New Tests

To add new tests:

1. Add a new test function in `api-test.js`
2. Call the function from the `runTests()` function
3. Follow the existing pattern for making API calls and logging results