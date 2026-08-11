var TicketStatus = /* @__PURE__ */ ((TicketStatus2) => {
  TicketStatus2["PENDING"] = "PENDING";
  TicketStatus2["PROVISIONAL"] = "PROVISIONAL";
  TicketStatus2["PAID"] = "PAID";
  TicketStatus2["BOARDED"] = "BOARDED";
  TicketStatus2["COMPLETED"] = "COMPLETED";
  return TicketStatus2;
})(TicketStatus || {});
var PaymentMethod = /* @__PURE__ */ ((PaymentMethod2) => {
  PaymentMethod2["CASH"] = "CASH";
  PaymentMethod2["ONLINE"] = "ONLINE";
  PaymentMethod2["NONE"] = "NONE";
  PaymentMethod2["ESCROW"] = "ESCROW";
  PaymentMethod2["GRAMCOIN"] = "GRAMCOIN";
  PaymentMethod2["SONIC"] = "SONIC";
  PaymentMethod2["UDHAAR"] = "UDHAAR";
  PaymentMethod2["BARTER"] = "BARTER";
  return PaymentMethod2;
})(PaymentMethod || {});
export {
  PaymentMethod,
  TicketStatus
};
