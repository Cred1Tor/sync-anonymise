import mongoose from "mongoose";
import CustomerInterface from "../types/customer.interface";

const schema = new mongoose.Schema<CustomerInterface>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    postCode: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Customer = mongoose.model<CustomerInterface>(
  "Customer",
  schema,
  "customers"
);
export const CustomerAnonymised = mongoose.model<CustomerInterface>(
  "CustomerAnonymised",
  schema,
  "customers_anonymised"
);
