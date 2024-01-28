import InternalSlots from "./internal-slots";
import { createResolvingFunctions } from "./operations";

export default class Promiz {
  constructor(executor) {
    if (typeof executor === "undefined") {
      throw new TypeError("Executor is undefined.");
    }
    if (typeof executor !== "function") {
      throw new TypeError("Executor is not a function.");
    }
    this[InternalSlots.state] = "pending";
    this[InternalSlots.result] = undefined;
    this[InternalSlots.isHandled] = false;
    this[InternalSlots.fulfillReactions] = [];
    this[InternalSlots.rejectReactions] = [];
    const { resolve, reject } = createResolvingFunctions(this);
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
}
