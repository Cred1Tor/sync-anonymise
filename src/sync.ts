import "dotenv/config";
import mongoose from "mongoose";
import { Customer, CustomerAnonymised } from "./models/customer";
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
} from "./service/sync";

const INTERVAL = 1000;
export const MAX_BATCH_SIZE = 1000;

async function runInSyncMode(): Promise<void> {
  await mongoose.connect(process.env.DB_URI);
  await updateSinceLastOnline();

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
}

async function runInFullReindexMode(): Promise<void> {
  await mongoose.connect(process.env.DB_URI);

  for (let i = 0; ; i++) {
    const customers = await Customer.find()
      .sort("createdAt")
      .skip(i * MAX_BATCH_SIZE)
      .limit(MAX_BATCH_SIZE)
      .lean();

    if (customers.length === 0) {
      await mongoose.disconnect();
      return;
    }

    const anonymisedCustomers = customers.map(anonymiseCustomer);

    const bulkOps = anonymisedCustomers.map((doc) => {
      return {
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true,
        },
      };
    });

    await CustomerAnonymised.bulkWrite(bulkOps)
      .then((result) => {
        result.modifiedCount &&
          console.log(`Modified ${result.modifiedCount} customers`);
        result.upsertedCount &&
          console.log(`Upserted ${result.upsertedCount} customers`);
      })
      .catch((error) => {
        console.error("Error reindexing customers:", error);
        process.exit(1);
      });
  }
}

const isFullReindex = process.argv.includes("--full-reindex");

if (isFullReindex) {
  runInFullReindexMode();
} else {
  runInSyncMode();
}
