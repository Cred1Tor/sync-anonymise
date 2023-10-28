import mongoose from "mongoose";
import { Customer, CustomerAnonymised } from "../models/customer";
import { ChangeStreamUpdateData, CustomerOplog } from "../types/mongo.types";
import CustomerInterface, { CustomerWithId } from "../types/customer.interface";
import { anonymiseCustomer } from "./anonymise";
import { MAX_BATCH_SIZE } from "../sync";

export async function insertAnonymisedCustomers(
  docs: CustomerInterface[]
): Promise<void> {
  return CustomerAnonymised.insertMany(docs)
    .then((result) => {
      if (result.length) {
        console.log(
          `${result.length} customers successfully anonymised and inserted`
        );
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export async function updateAnonymisedCustomers(
  updates: ChangeStreamUpdateData[]
): Promise<void> {
  const bulkOps = updates.map((update) => {
    return {
      updateOne: {
        filter: { _id: update._id },
        update: {
          $set: update.updatedFields,
          $unset: update.removedFields.reduce(
            (acc, propertyName) => ({ ...acc, [propertyName]: "" }),
            {}
          ),
        },
        upsert: true,
      },
    };
  });

  return CustomerAnonymised.bulkWrite(bulkOps)
    .then((result) => {
      result.modifiedCount &&
        console.log(`Modified ${result.modifiedCount} customers`);
      result.upsertedCount &&
        console.log(`Upserted ${result.upsertedCount} customers`);
    })
    .catch((error) => {
      console.error("Error updating customers:", error);
      process.exit(1);
    });
}

export async function updateSinceLastOnline(): Promise<void> {
  const dbName = mongoose.connection.db.databaseName;
  const Oplog = mongoose
    .createConnection(process.env.DB_URI.replace(dbName, "local"))
    .collection("oplog.rs");

  const lastCustomerAnonymisedUpdate = await Oplog.findOne(
    { ns: { $regex: "customers_anonymised$" } },
    { sort: [["ts", -1]] }
  );

  const ts = lastCustomerAnonymisedUpdate?.ts;

  for (let i = 0; ; i++) {
    const customerOplogs = (await Oplog.find(
      { ns: { $regex: "customers$" }, ...(ts && { ts: { $gt: ts } }) },
      { sort: [["ts", 1]], skip: i * MAX_BATCH_SIZE, limit: MAX_BATCH_SIZE }
    ).toArray()) as unknown as CustomerOplog[];

    const customerIds = customerOplogs.map((oplog) => oplog.o2._id);

    if (!customerIds.length) {
      return;
    }

    const customers = await Customer.find({ _id: { $in: customerIds } }).lean();
    await anonymiseAndReindexCustomers(customers);
  }
}

export async function anonymiseAndReindexCustomers(
  customers: CustomerWithId[]
): Promise<void> {
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

  return CustomerAnonymised.bulkWrite(bulkOps)
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
