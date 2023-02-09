const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();
const { MONGO_CONNECT_STRING } = process.env;

async function connectDB() {
  mongoose.set("strictQuery", true);
  mongoose.connect(
    MONGO_CONNECT_STRING,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => {
      console.log("====================================");
      console.log("Mongoose is connected!");
      console.log("====================================");
    }
  );
}

module.exports = { connectDB };
