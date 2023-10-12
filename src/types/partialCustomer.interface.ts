import CustomerInterface from "./customer.interface";

export default interface PartialCustomerInterface
  extends Partial<CustomerInterface> {
  "address.line1"?: string;
  "address.line2"?: string;
  "address.postCode"?: string;
  "address.city"?: string;
  "address.state"?: string;
  "address.country"?: string;
}
