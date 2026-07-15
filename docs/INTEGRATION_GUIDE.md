# Real Database Integration Guide

The included web app runs in demo mode so it can be shown immediately. For a production-style version, use this approach.

## Oracle Connection

Install the Oracle Node.js driver:

```bash
npm install oracledb
```

Create a `.env` file:

```text
ORACLE_USER=courseconnect
ORACLE_PASSWORD=your_password
ORACLE_CONNECT_STRING=localhost/XEPDB1
```

Recommended app flow:

1. Keep Oracle tables and PL/SQL package from `database/oracle`.
2. Create a service file that connects using `oracledb`.
3. Call `courseconnect_pkg` procedures from the Node.js service.
4. Use ref cursors to return report data to the API.

## MongoDB Connection

Install the MongoDB Node.js driver:

```bash
npm install mongodb
```

Add to `.env`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=courseconnect
```

Recommended app flow:

1. Use Oracle for structured operations.
2. Use MongoDB for resources, reviews, and discussion threads.
3. Store the Oracle `course_id` value as `courseId` in MongoDB documents.
4. Join the two data sources in the application service layer when needed.

## Why Demo Mode Is Still Useful

Demo mode lets the project run during presentation even if Oracle or MongoDB are not installed on the lecturer's machine. The database scripts still prove the required database implementation.
