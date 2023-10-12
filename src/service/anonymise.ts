import "dotenv/config";
import CustomerInterface from "../types/customer.interface";
import PartialCustomerInterface from "../types/partialCustomer.interface";
const hash = require("custom-hash");

const ANONYMISE_CHARACTERS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890".split("");

hash.configure({ charSet: ANONYMISE_CHARACTERS, maxLength: 8 });

const anonymiseText = (text: string): string => {
  return hash.digest(text);
};

export const anonymiseCustomer = <
  T extends CustomerInterface | PartialCustomerInterface,
>(
  customer: T
): T => {
  const { firstName, lastName, email, address } = customer;
  return {
    ...customer,
    ...(firstName && {
      firstName: anonymiseText(firstName),
    }),
    ...(lastName && {
      lastName: anonymiseText(lastName),
    }),
    ...(email && {
      email: anonymiseText(email.split("@")[0]) + "@" + email.split("@")[1],
    }),
    ...(address && {
      address: {
        ...address,
        line1: anonymiseText(address.line1),
        ...(address.line2 ? { line2: anonymiseText(address.line2) } : {}),
        postCode: anonymiseText(address.postCode),
      },
    }),
  };
};

export const anonymisePartialCustomer = (
  partialCustomer: PartialCustomerInterface
): PartialCustomerInterface => {
  return {
    ...anonymiseCustomer(partialCustomer),
    ...(partialCustomer["address.line1"] && {
      "address.line1": anonymiseText(partialCustomer["address.line1"]),
    }),
    ...(partialCustomer["address.line2"] && {
      "address.line2": anonymiseText(partialCustomer["address.line2"]),
    }),
    ...(partialCustomer["address.postCode"] && {
      "address.postCode": anonymiseText(partialCustomer["address.postCode"]),
    }),
  };
};
