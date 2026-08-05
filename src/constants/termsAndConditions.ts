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
    title: "Pricing, Taxes & Duties",
    content: "All prices quoted are in United States Dollars (USD). Import costs, including freight, customs duties, and related charges where applicable, are indicated separately and are based on estimates available at the time of quotation. Actual import costs will be confirmed once the shipment has been received and processed by the freight forwarder. Where the actual import costs differ from the estimate provided, the customer will be advised before the order is finalized or dispatched."
  },
  {
    title: "Availability of Goods",
    content: "The items quoted may be supplied from existing stock and/or procured specifically for this order. Availability of specially procured items is subject to supplier confirmation at the time of order."
  },
  {
    title: "Order Confirmation, Lead Time & Delivery",
    content: "Procurement of goods will commence upon receipt of an official Purchase Order (PO) and fulfillment of the agreed payment terms. Estimated delivery periods are generally 14–30 working days unless otherwise specified in the quotation. Delivery periods are estimates only and may vary due to supplier availability, manufacturing schedules, shipping, customs clearance, or other factors beyond our reasonable control."
  },
  {
    title: "Payment Terms, Warranty & Inspection",
    content: "Payment shall be made in accordance with the agreed payment terms and, unless otherwise agreed in writing, before dispatch of the goods. Products are supplied with the applicable manufacturer's warranty where available. The customer is responsible for inspecting all goods upon delivery and must report any shortages, incorrect items, or visible damage within 48 hours of receipt."
  },
  {
    title: "Acceptance",
    content: "Acceptance of this quotation or issuance of a Purchase Order constitutes acceptance of these Terms & Conditions."
  }
];
