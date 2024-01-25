/* 27.2.6 Properties of Promise Instances */
export const InternalSlots = Object.freeze({
  state: Symbol("State"),
  result: Symbol("Result"),
  fulfillReactions: Symbol("FulfillReactions"),
  rejectReactions: Symbol("RejectReactions"),
  rejectionTracker: Symbol("RejectionTracker"),
  isHandled: Symbol("IsHandled"),
});
