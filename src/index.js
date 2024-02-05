import InternalSlots from "./internal-slots";
import { PromiseReactionJob } from "./jobs";
import {
  PromiseCapability,
  PromiseReaction,
  createResolvingFunctions,
  hostEnqueuePromiseJob,
  hostPromiseRejectionTracker,
  isPromise,
} from "./operations";
import { NotImplementedError } from "./utils";

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

  /* 25.6.5.4 of the spec */
  then(onFulfilled, onRejected) {
    if (!isPromise(this)) {
      throw new TypeError(
        "the promise parameter is not an instance of Promise."
      );
    }

    const C = this.constructor[Symbol.species];
    const resultCapability = new PromiseCapability(C);
    return performPromiseThen(this, onFulfilled, onRejected, resultCapability);
  }
  /* eslint-disable no-unused-vars */
  catch(onRejected) {
    throw new NotImplementedError(
      "`catch` function is not implemented yet :\\"
    );
  }
  finally(onFinally) {
    throw new NotImplementedError(
      "`funally` function is not implemented yet :\\"
    );
  }

  static onUnhandledRejection(event) {
    throw new NotImplementedError(
      "`onUnhandledRejection` event is not implemented yet :\\"
    );
  }

  static onRejectionHandled(event) {
    throw new NotImplementedError(
      "`onRejectionHandled` event is not implemented yet :\\"
    );
  }

  static any(iterable) {
    throw new NotImplementedError("`any` function is not implemented yet :\\");
  }

  static race(iterable) {
    throw new NotImplementedError("`race` function is not implemented yet :\\");
  }

  static all(iterable) {
    throw new NotImplementedError("`all` function is not implemented yet :\\");
  }

  static allSettled(iterable) {
    throw new NotImplementedError(
      "`allSettled` function is not implemented yet :\\"
    );
  }

  static resolve(x) {
    throw new NotImplementedError(
      "`resolve` function is not implemented yet :\\"
    );
  }

  static reject(r) {
    throw new NotImplementedError(
      "`reject` function is not implemented yet :\\"
    );
  }
  /* eslint-enable no-unused-vars */
}

/* 27.2.5.4 */
function performPromiseThen(
  promise,
  onFulfilled,
  onRejected,
  resultCapability
) {
  if (!isPromise(promise)) {
    throw new TypeError("the promise parameter is not an instance of Promise.");
  }
  if (typeof onFulfilled !== "function") {
    onFulfilled = undefined;
  }

  if (typeof onRejected !== "function") {
    onRejected = undefined;
  }

  const fulfillReaction = new PromiseReaction(
    resultCapability,
    "fulfill",
    onFulfilled
  );
  const rejectReaction = new PromiseReaction(
    resultCapability,
    "reject",
    onRejected
  );

  switch (Promise[InternalSlots.state]) {
    case "pending":
      Promise[InternalSlots.fulfillReactions].push(fulfillReaction);
      Promise[InternalSlots.rejectReactions].push(rejectReaction);
      break;
    case "fulfilled":
      {
        const value = Promise[InternalSlots.result];
        const fulfillJob = new PromiseReactionJob(fulfillReaction, value);
        hostEnqueuePromiseJob(fulfillJob);
      }
      break;
    case "rejected":
      {
        const reason = Promise[InternalSlots.result];
        if (Promise[InternalSlots.isHandled] === false) {
          hostPromiseRejectionTracker(promise, "handle");
        }
        const rejectJob = new PromiseReactionJob(rejectReaction, reason);
        hostEnqueuePromiseJob(rejectJob);
      }
      break;

    default:
      throw new TypeError(
        `Invalid promise state: ${Promise[InternalSlots.state]}.`
      );
  }

  Promise[InternalSlots.isHandled] = true;

  return resultCapability?.promise || undefined;
}
