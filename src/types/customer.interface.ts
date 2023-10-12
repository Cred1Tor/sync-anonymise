export default interface CustomerInterface {
  firstName: string;
  lastName: string;
  email: string;
  address: {
    line1: string;
    line2?: string;
    postCode: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: Date;
}
