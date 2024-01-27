import { NormalCompletion, ThrowCompletion } from "./utils";
export class PromiseReactionJob {
  constructor(reaction, argument) {
    return () => {
      const { capability: promiseCapability, type, handler } = reaction;
      let handlerResult;

      if (typeof handler === "undefined") {
        if (type === "fulfill") {
          handlerResult = new NormalCompletion(argument);
        } else {
          handlerResult = new ThrowCompletion(argument);
        }
      } else {
        try {
          handlerResult = new NormalCompletion(handler(argument));
        } catch (error) {
          handlerResult = new ThrowCompletion(error);
        }
      }

      if (typeof promiseCapability === "undefined") {
        if (handlerResult instanceof ThrowCompletion) {
          throw handlerResult.value;
        }
        return;
      }

      if (handlerResult instanceof ThrowCompletion) {
        promiseCapability.reject(handlerResult.value);
      } else {
        promiseCapability.resolve(handlerResult.value);
      }
    };
  }
}
