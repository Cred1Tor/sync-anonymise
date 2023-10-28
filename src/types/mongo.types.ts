import mongoose from "mongoose";
import CustomerInterface from "./customer.interface";

export type ChangeStreamUpdateData = {
  _id: mongoose.Types.ObjectId;
  updatedFields: Partial<CustomerInterface>;
  removedFields: string[];
};

export type CustomerOplog = { o2: { _id: mongoose.Types.ObjectId } };
