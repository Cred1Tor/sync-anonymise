import mongoose from "mongoose";
import { CustomerAnonymised } from "../models/customer";
import {
  ChangeStreamUpdateData,
  CustomerUpdateOplog,
  Update,
  AddressKey,
  CustomerOplog,
} from "../types/mongo.types";
import CustomerInterface from "../types/customer.interface";
import PartialCustomerInterface from "../types/partialCustomer.interface";
import { anonymiseCustomer, anonymisePartialCustomer } from "./anonymise";
import { MAX_BATCH_SIZE } from "../sync";

export function insertAnonymisedCustomers(
  docs: CustomerInterface[]
): Promise<any> {
  return CustomerAnonymised.insertMany(docs)
    .then(
      (result) =>
        result.length &&
        console.log(
          `${result.length} customers successfully anonymised and inserted`
        )
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

function updateAnonymisedCustomer(
  updateData: ChangeStreamUpdateData
): Promise<any> {
  return CustomerAnonymised.findByIdAndUpdate(updateData._id, {
    $set: updateData.updatedFields,
    $unset: updateData.removedFields.reduce(
      (acc, propertyName) => ({ ...acc, [propertyName]: "" }),
      {}
    ),
  });
}

export function updateAnonymisedCustomers(
  updates: ChangeStreamUpdateData[]
): Promise<any> {
  return Promise.all(updates.map((update) => updateAnonymisedCustomer(update)))
    .then(
      () =>
        updates.length &&
        console.log(
          `${updates.length} customers successfully anonymised and updated`
        )
    )
    .catch((error) => {
      console.error("Error updating anonymised characters:", error);
      process.exit(1);
    });
}

function formUpdateFromOplog(
  oplog: CustomerUpdateOplog
): [mongoose.Types.ObjectId, Update] {
  const update: Update = { $set: {}, $unset: {} };
  const partialCustomer: PartialCustomerInterface = {};
  const { saddress, i, u, d } = oplog.o.diff;
  Object.assign(partialCustomer, u, i);
  Object.assign(update.$unset, d);

  if (saddress) {
    const { i, u, d } = saddress;
    Object.entries(Object.assign({}, i, u)).forEach((entry) => {
      const key = entry[0] as AddressKey;
      const value = entry[1];
      partialCustomer[`address.${key}`] = value;
    });
    Object.keys(Object.assign({}, d)).forEach((key) => {
      update.$unset[`address.${key}`] = false;
    });
  }

  update.$set = {
    ...update.$set,
    ...anonymisePartialCustomer(partialCustomer),
  };

  return [oplog.o2._id, update];
}

function updateFromOplogs(oplogs: CustomerOplog[]): Promise<any> {
  const docsToInsert: CustomerInterface[] = [];
  const docsToUpdate: [mongoose.Types.ObjectId, Update][] = [];

  oplogs.forEach((oplog) => {
    if (oplog.op === "i") {
      docsToInsert.push(anonymiseCustomer(oplog.o));
    }

    if (oplog.op === "u") {
      docsToUpdate.push(formUpdateFromOplog(oplog));
    }
  });

  return Promise.all([
    CustomerAnonymised.insertMany(docsToInsert)
      .then(
        (result) =>
          result.length &&
          console.log(
            `Inserted ${result.length} new customers since last online`
          )
      )
      .catch((error) => {
        console.error("Eror inserting customers:", error);
        process.exit(1);
      }),
    Promise.all(
      docsToUpdate.map(([_id, update]) =>
        CustomerAnonymised.findByIdAndUpdate(_id, update)
      )
    )
      .then(
        () =>
          docsToUpdate.length &&
          console.log(
            `Updated ${docsToUpdate.length} customers since last online`
          )
      )
      .catch((error) => {
        console.error("Eror updating customers:", error);
        process.exit(1);
      }),
  ]);
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
    const customersOplogs = (await Oplog.find(
      { ns: { $regex: "customers$" }, ...(ts && { ts: { $gt: ts } }) },
      { sort: [["ts", 1]], skip: i * MAX_BATCH_SIZE, limit: MAX_BATCH_SIZE }
    ).toArray()) as unknown as CustomerOplog[];

    if (!customersOplogs.length) {
      return;
    }

    await updateFromOplogs(customersOplogs);
  }
}
