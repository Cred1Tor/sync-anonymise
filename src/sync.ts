import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "./models/customer";
import {
  anonymiseCustomer,
  anonymisePartialCustomer,
} from "./service/anonymise";
import CustomerInterface from "./types/customer.interface";
import { ChangeStreamUpdateData } from "./types/mongo.types";
import {
  updateSinceLastOnline,
  insertAnonymisedCustomers,
  updateAnonymisedCustomers,
  anonymiseAndReindexCustomers,
} from "./service/sync";

const INTERVAL = 1000;
export const MAX_BATCH_SIZE = 1000;

async function runInSyncMode(): Promise<void> {
  await mongoose.connect(process.env.DB_URI);

  const changeStream = Customer.watch();
  let additions: CustomerInterface[] = [];
  let updates: ChangeStreamUpdateData[] = [];
  let lastInsertTime = Date.now();

  changeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      additions.push(anonymiseCustomer(change.fullDocument));
    }

    if (change.operationType === "update") {
      updates.push({
        _id: change.documentKey._id,
        updatedFields: anonymisePartialCustomer(
          change.updateDescription.updatedFields
        ),
        removedFields: change.updateDescription.removedFields,
      });
    }

    if (additions.length + updates.length >= MAX_BATCH_SIZE) {
      insertAnonymisedCustomers(additions);
      updateAnonymisedCustomers(updates);

      additions = [];
      updates = [];
      lastInsertTime = Date.now();
    }
  });

  setInterval(() => {
    const timeSinceLastInsertion = Date.now() - lastInsertTime;

    if (timeSinceLastInsertion >= INTERVAL) {
      insertAnonymisedCustomers(additions);
      updateAnonymisedCustomers(updates);
      additions = [];
      updates = [];
      lastInsertTime = Date.now();
    }
  }, INTERVAL);

  await updateSinceLastOnline();
}

async function runInFullReindexMode(): Promise<void> {
  await mongoose.connect(process.env.DB_URI);

  for (let i = 0; ; i++) {
    const customers = await Customer.find()
      .sort("_id")
      .skip(i * MAX_BATCH_SIZE)
      .limit(MAX_BATCH_SIZE)
      .lean();

    if (customers.length === 0) {
      await mongoose.disconnect();
      return;
    }

    await anonymiseAndReindexCustomers(customers);
  }
}

const isFullReindex = process.argv.includes("--full-reindex");

if (isFullReindex) {
  runInFullReindexMode();
} else {
  runInSyncMode();
}
