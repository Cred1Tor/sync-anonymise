import "dotenv/config";
import mongoose from "mongoose";
import { getFakeCustomers } from "./service/customers";
import getRandomCount from "./service/getRandomCount";
import { Customer } from "./models/customer";

const MIN_CUSTOMERS = 10;
const MAX_CUSTOMERS = 20;
const INTERVAL = 200;

run();

async function run() {
  await mongoose.connect(process.env.DB_URI);

  setInterval(async () => {
    const randomCount = getRandomCount(MIN_CUSTOMERS, MAX_CUSTOMERS);
    const customers = getFakeCustomers(randomCount);

    try {
      await Customer.insertMany(customers);
      console.log(`Created ${customers.length} customers`);
    } catch (error) {
      console.error("Error inserting customers:", error);
      process.exit(1);
    }
  }, INTERVAL);
}
