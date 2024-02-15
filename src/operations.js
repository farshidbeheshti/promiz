import { isObject } from "./utils";
import InternalSlots from "./internal-slots";
import { PromiseReactionJob } from "./jobs";

/* 27.2.1.3 */
export function createResolvingFunctions(promise) {
  const alreadyResolved = { value: false };

  let resolve = (resolution) => {
    // just return if the promise is already resolved!
    if (alreadyResolved.value) {
      return;
    }

    alreadyResolved.value = true;

    /* as 25.6.1.3.2-7: must not resolve to the same promise */
    if (Object.is(resolution, promise)) {
      const selfResolutionError = new TypeError(
        "must not resolve to the same promise."
      );
      return rejectPromise(promise, selfResolutionError);
    }

    if (!isObject(resolution)) {
      return fulfillPromise(promise, resolution);
    }

    let thenAction = null;
    try {
      thenAction = resolution.then;
    } catch (thenError) {
      rejectPromise(promise, thenError);
    }

    if (typeof thenAction !== "function") {
      return fulfillPromise(promise, resolution);
    }
    // So `thenAction` is callable and must wait until thenable resolves!
    const job = new PromiseResolveThenableJob(promise, resolution, thenAction);

    hostEnqueuePromiseJob(job);
  };

  resolve.promise = promise;
  resolve.alreadyResolved = alreadyResolved;

  let reject = (reason) => {
    // just return if the promise is already resolved!
    if (alreadyResolved.value) {
      return;
    }
    alreadyResolved.value = true;
    return rejectPromise(promise, reason);
  };

  reject.promise = promise;
  reject.alreadyResolved = alreadyResolved;

  return {
    resolve,
    reject,
  };
}

/* 27.2.1.4 */
export function fulfillPromise(promise, value) {
  if (promise[InternalSlots.state] !== "pending") {
    throw new Error("Promise is already settled.");
  }
  const reactions = promise[InternalSlots.fulfillReactions];

  promise[InternalSlots.result] = value;
  promise[InternalSlots.fulfillReactions] = undefined;
  promise[InternalSlots.rejectReactions] = undefined;
  promise[InternalSlots.state] = "fulfilled";

  return triggerPromiseReactions(reactions, value);
}

export function rejectPromise(promise, reason) {
  if (promise[InternalSlots.state] !== "pending") {
    throw new Error("Promise is already settled.");
  }
  const reactions = promise[InternalSlots.rejectReactions];

  promise[InternalSlots.result] = reason;
  promise[InternalSlots.fulfillReactions] = undefined;
  promise[InternalSlots.rejectReactions] = undefined;
  promise[InternalSlots.state] = "rejected";
  if (promise[InternalSlots.isHandled] === false) {
    hostPromiseRejectionTracker(promise, "reject");
  }

  return triggerPromiseReactions(reactions, reason);
}

export function hostPromiseRejectionTracker(promise, operation) {
  const rejectionTracker = promise.constructor[InternalSlots.rejectionTracker];
  rejectionTracker.track(promise, operation);
}

export function triggerPromiseReactions(reactions, argument) {
  for (const reaction of reactions) {
    const job = new PromiseReactionJob(reaction, argument);
    hostEnqueuePromiseJob(job);
  }
  return;
}

/* 27.2.1.8 */
export function hostEnqueuePromiseJob(job) {
  // See https://developer.mozilla.org/docs/Web/API/queueMicrotask!
  queueMicrotask(job);
}

/* 27.2.1.6: IsPromise(x) */
export function isPromise(x) {
  return isObject(x) && x[InternalSlots.state];
}

/*
  27.2.1.5: NewPromiseCapability (C).
  Seems to be better being a class instead of a function although there is no
  any props belong to the class at all. For now, defined as a function for
  completeness with spec.
*/
export function PromiseCapability(C) {
  if (typeof new.target === "undefined") {
    throw new Error(
      " You must use `new` to call PromiseCapability constructor!"
    );
  }

  const executor = (resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  };
  executor.capability = this;

  this.promise = new C(executor);

  if (typeof this.resolve !== "function") {
    throw new TypeError("resolve is not callable.");
  }
  if (typeof this.reject !== "function") {
    throw new TypeError("reject is not callable.");
  }
}

export class PromiseReaction {
  constructor(capability, type, handler) {
    this.capability = capability;
    this.type = type;
    this.handler = handler;
  }
}

// 25.6.2.2 NewPromiseResolveThenableJob ( promiseToResolve, thenable, then)
export class PromiseResolveThenableJob {
  constructor(promiseToResolve, thenable, then) {
    return () => {
      const { resolve, reject } = createResolvingFunctions(promiseToResolve);

      try {
        // same as thenable.then(resolve, reject)
        then.apply(thenable, [resolve, reject]);
      } catch (thenError) {
        // same as reject(thenError)
        reject.apply(undefined, [thenError]);
      }
    };
  }
}
