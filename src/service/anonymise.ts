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
  const result = { ...customer };

  if (firstName) {
    result.firstName = anonymiseText(firstName);
  }

  if (lastName) {
    result.lastName = anonymiseText(lastName);
  }

  if (email) {
    result.email =
      anonymiseText(email.split("@")[0]) + "@" + email.split("@")[1];
  }

  if (address) {
    result.address = { ...address };
    result.address.line1 = anonymiseText(address.line1);

    if (address.line2) {
      result.address.line2 = anonymiseText(address.line2);
      result.address.postCode = anonymiseText(address.postCode);
    }
  }

  return result;
};

export const anonymisePartialCustomer = (
  partialCustomer: PartialCustomerInterface
): PartialCustomerInterface => {
  const result = anonymiseCustomer(partialCustomer);

  if (partialCustomer["address.line1"]) {
    result["address.line1"] = anonymiseText(partialCustomer["address.line1"]);
  }

  if (partialCustomer["address.line2"]) {
    result["address.line2"] = anonymiseText(partialCustomer["address.line2"]);
  }

  if (partialCustomer["address.postCode"]) {
    result["address.postCode"] = anonymiseText(
      partialCustomer["address.postCode"]
    );
  }

  return result;
};
