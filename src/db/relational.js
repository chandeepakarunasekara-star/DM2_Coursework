const config = require("../config");
const { SqliteEngine } = require("./sqliteEngine");

let engine;
let mode;

if (config.oracle.enabled) {
  const { OracleEngine } = require("./oracleEngine");
  engine = new OracleEngine(config.oracle);
  mode = "oracle";
} else {
  engine = new SqliteEngine();
  mode = "sqlite-demo";
}

module.exports = engine;
module.exports.mode = mode;
