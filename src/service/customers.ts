import { faker } from "@faker-js/faker";
import CustomerInterface from "../types/customer.interface";

const getFakeCustomer = (): CustomerInterface => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName }),
    address: {
      line1: faker.location.streetAddress({ useFullAddress: false }),
      line2: faker.location.secondaryAddress(),
      postCode: faker.location.zipCode(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
    },
    createdAt: faker.date.past({ years: 5 }),
  };
};

export const getFakeCustomers = (count: number): CustomerInterface[] =>
  Array(count).fill(null).map(getFakeCustomer);
