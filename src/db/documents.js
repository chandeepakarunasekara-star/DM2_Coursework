const config = require("../config");
const { courseIdByTitle } = require("./courseIdMap");
const { JsonDocStore } = require("./jsonDocStore");

let engine;
let mode;

if (config.mongo.enabled) {
  const { MongoAdapter } = require("./mongoAdapter");
  engine = new MongoAdapter(config.mongo);
  engine.seedIfEmpty(courseIdByTitle).catch((err) => {
    console.error("MongoDB seed check failed:", err.message);
  });
  mode = "mongodb";
} else {
  engine = new JsonDocStore(courseIdByTitle);
  mode = "json-demo";
}

module.exports = engine;
module.exports.mode = mode;
