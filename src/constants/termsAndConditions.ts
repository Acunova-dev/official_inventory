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
    content: "All prices quoted are in United States Dollars (USD). Import duties, customs charges, clearance fees, and statutory taxes may apply and will be charged based on prevailing rates at the time of clearance unless explicitly stated as inclusive."
  },
  {
    title: "Availability of Goods",
    content: "All items quoted are subject to stock availability and prior sale. Lead times and delivery dates are estimated based on information from manufacturers and shipping carriers."
  },
  {
    title: "Order Confirmation, Lead Time & Delivery",
    content: "A quotation becomes a binding order only upon receipt of a written purchase order or signed quotation confirmation, accompanied by any agreed deposit or advance payment. Delivery timeframes commence from the date of order confirmation and receipt of the required deposit."
  },
  {
    title: "Payment Terms, Warranty & Inspection",
    content: "Unless credit terms have been expressly agreed in writing, full payment is required prior to dispatch or upon delivery. Goods supplied carry manufacturer warranties where applicable. The customer must inspect goods upon delivery and notify any discrepancies within 48 hours."
  },
  {
    title: "Acceptance",
    content: "By accepting this quotation, the customer agrees to these terms and conditions."
  }
];
