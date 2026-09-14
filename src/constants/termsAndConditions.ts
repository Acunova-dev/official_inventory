export interface TermClause {
  title: string;
  content: string;
}

export const QUOTATION_TERMS_AND_CONDITIONS: TermClause[] = [
  {
    title: "Quotation Validity",
    content: "This quotation is valid for 30 calendar days from the date of issue unless otherwise stated."
  },
  {
    title: "Pricing and Availability",
    content: "All prices are quoted in United States Dollars (USD). Availability of goods is subject to confirmation at the time of order."
  },
  {
    title: "Order Confirmation & Lead Time",
    content: "Orders will be processed upon confirmation and fulfillment of the applicable payment terms. Estimated delivery or collection periods will be communicated to the customer and may vary depending on product availability and supplier lead times."
  },
  {
    title: "Pre-Order Payment Terms",
    content: "For pre-orders, a 50% deposit is required to confirm the order and commence procurement. Once the ordered items have been received by Acunova Pvt Ltd, the customer will be notified. The remaining 50% balance, together with any applicable delivery charges, must be paid in full before the items are dispatched or delivered."
  },
  {
    title: "Warranty & Inspection",
    content: "Products are supplied with the applicable manufacturer's warranty where available. Customers must inspect goods upon delivery and report any shortages, incorrect items, or visible damage within 48 hours of receipt."
  },
  {
    title: "Acceptance",
    content: "Acceptance of this quotation or confirmation of an order constitutes acceptance of these Terms & Conditions."
  }
];
