import mongoose from "mongoose";
import CustomerInterface from "./customer.interface";

export type ChangeStreamUpdateData = {
  _id: mongoose.Types.ObjectId;
  updatedFields: Partial<CustomerInterface>;
  removedFields: string[];
};

export type CustomerInsertOplog = {
  op: "i";
  o: CustomerInterface;
  o2: {
    _id: mongoose.Types.ObjectId;
  };
};

export type AddressKey =
  | "country"
  | "city"
  | "state"
  | "postCode"
  | "line1"
  | "line2";

type Address = {
  [key in AddressKey]?: string;
};

export type CustomerUpdateOplog = {
  op: "u";
  o: {
    diff: {
      i?: Partial<CustomerInterface>;
      u?: Partial<CustomerInterface>;
      d?: keyof CustomerInterface;
      saddress?: {
        i?: Address;
        u?: Address;
        d?: {
          [key in AddressKey]?: false;
        };
      };
    };
  };
  o2: {
    _id: mongoose.Types.ObjectId;
  };
};

export type CustomerOplog = CustomerInsertOplog | CustomerUpdateOplog;

export type Update = { $set: Record<string, any>; $unset: Record<string, any> };
