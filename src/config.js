require("dotenv").config();

function truthy(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const config = {
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || "courseconnect-dev-secret",

  // Relational database mode: "oracle" when Oracle credentials are supplied,
  // otherwise the app falls back to an embedded SQLite engine that was built
  // from the exact same schema (see database/oracle/01_schema.sql) so the
  // application is fully runnable out of the box for demos/grading, while
  // remaining a straight swap-in for the real Oracle database.
  oracle: {
    enabled: truthy(process.env.ORACLE_USER) && truthy(process.env.ORACLE_CONNECT_STRING),
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING
  },

  // Document store mode: "mongo" when a connection string is supplied,
  // otherwise a file-backed JSON document store (same collections/shape as
  // database/mongodb/seed_and_queries.js) is used automatically.
  mongo: {
    enabled: truthy(process.env.MONGODB_URI),
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || "courseconnect"
  }
};

module.exports = config;
