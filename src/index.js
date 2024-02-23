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
import {
  NormalCompletion,
  NotImplementedError,
  ThrowCompletion,
  isConstructor,
  isObject,
  PromiseAggregateError,
  iteratorStep,
  iteratorValue,
  iteratorClose,
} from "./utils";

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

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    if (!isPromise(this)) {
      throw new TypeError("Value is not an instance of Promise.");
    }
    const C = this.constructor[Symbol.species];
    let thenFinally, catchFinally;
    if (typeof onFinally !== "function") {
      thenFinally = catchFinally = onFinally;
    } else {
      thenFinally = (value) => {
        const result = onFinally.apply(undefined);
        const promise = promiseResolve(C, result);
        const valueThunk = () => value;
        return promise.then(valueThunk);
      };
      catchFinally = (reason) => {
        const result = onFinally.apply(undefined);
        const promise = promiseResolve(C, result);
        const thrower = () => {
          throw reason;
        };
        return promise.then(thrower);
      };
      thenFinally.C = catchFinally.C = C;
      thenFinally.onFinally = catchFinally.onFinally = onFinally;
    }

    return this.then(thenFinally, catchFinally);
  }

  /* 27.2.4.6 */
  static reject(r) {
    const C = this;
    const capability = new PromiseCapability(C);
    capability.reject(r);

    return capability.promise;
  }

  /* 27.2.4.7 */
  static resolve(x) {
    const C = this;
    if (!isObject(C)) {
      throw new TypeError("Call resolve() in context of an object!");
    }

    return promiseResolve(C, x);
  }

  /* 27.2.4.3 Promise.any(iterable) */
  static any(iterable) {
    const C = this;
    const promiseCapability = new PromiseCapability(C);
    let iteratorRecord;

    try {
      const promiseResolve = getPromiseResolve(C);
      iteratorRecord = getIterator(iterable);
      const result = performPromiseAny(
        iteratorRecord,
        C,
        promiseCapability,
        promiseResolve
      );
      return result;
    } catch (error) {
      let result = new ThrowCompletion(error);

      if (iteratorRecord && iteratorRecord.done === false) {
        result = iteratorClose(iteratorRecord, result);
      }

      promiseCapability.reject(result.value);
      return promiseCapability.promise;
    }
  }

  /* 27.2.4.5 Promise.race(iterable) */
  static race(iterable) {
    const C = this;
    const PromiseCapability = new PromiseCapability(C);
    let iteratorRecord;

    try {
      const PromiseResolve = getPromiseResolve(C);
      iteratorRecord = getIterator(iterable);
      const result = performPromiseRace(
        iteratorRecord,
        C,
        PromiseCapability,
        PromiseResolve
      );
      return result;
    } catch (error) {
      let result = new ThrowCompletion(error);

      if (iteratorRecord && iteratorRecord.done === false) {
        result = iteratorClose(iteratorRecord, result);
      }

      PromiseCapability.reject(result.value);
      return PromiseCapability.Promise;
    }
  }

  /* eslint-disable no-unused-vars */
  static all(iterable) {
    throw new NotImplementedError("`all` function is not implemented yet :\\");
  }

  static allSettled(iterable) {
    throw new NotImplementedError(
      "`allSettled` function is not implemented yet :\\"
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

/* 27.2.4.3.1 */
function performPromiseAny(
  iteratorRecord,
  constructor,
  resultCapability,
  promiseResolve
) {
  if (!isConstructor(constructor)) {
    throw new TypeError("Value must be a constructor.");
  }

  if (typeof promiseResolve !== "function") {
    throw new TypeError("resolve is not callable.");
  }

  const errors = [];
  const remainingElementsCount = { value: 1 };
  let index = 0;

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    let next;

    try {
      next = iteratorStep(iteratorRecord);
    } catch (error) {
      iteratorRecord.done = true;
      resultCapability.reject(error);
      return resultCapability.promise;
    }

    if (next === false) {
      remainingElementsCount.value = remainingElementsCount.value - 1;
      if (remainingElementsCount.value === 0) {
        const error = new PromiseAggregateError();
        Object.defineProperty(error, "errors", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: errors,
        });

        resultCapability.reject(error);
      }

      return resultCapability.promise;
    }

    let nextValue;

    try {
      nextValue = iteratorValue(next);
    } catch (error) {
      iteratorRecord.done = true;
      resultCapability.reject(error);
      return resultCapability.promise;
    }

    errors.push(undefined);
    const nextPromise = promiseResolve.call(constructor, nextValue);
    const rejectElement = createPromiseAnyRejectElement(
      index,
      errors,
      resultCapability,
      remainingElementsCount
    );

    remainingElementsCount.value = remainingElementsCount.value + 1;
    nextPromise.then(resultCapability.resolve, rejectElement);
    index = index + 1;
  }
}

/* 27.2.4.5.1 */
function performPromiseRace(
  iteratorRecord,
  constructor,
  resultCapability,
  promiseResolve
) {
  if (!isConstructor(constructor)) {
    throw new TypeError("Value must be a constructor.");
  }

  if (typeof promiseResolve !== "function") {
    throw new TypeError("resolve is not callable.");
  }

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    let next;

    try {
      next = iteratorStep(iteratorRecord);
    } catch (error) {
      iteratorRecord.done = true;
      resultCapability.reject(error);
      return resultCapability.promise;
    }

    if (next === false) {
      iteratorRecord.done = true;
      return resultCapability.promise;
    }

    let nextValue;

    try {
      nextValue = iteratorValue(next);
    } catch (error) {
      iteratorRecord.done = true;
      resultCapability.reject(error);
      return resultCapability.promise;
    }

    const nextPromise = promiseResolve.call(constructor, nextValue);
    nextPromise.then(resultCapability.resolve, resultCapability.reject);
  }
}

function createPromiseAnyRejectElement(
  index,
  errors,
  promiseCapability,
  remainingElementsCount
) {
  const alreadyCalled = { value: false };

  return (x) => {
    if (alreadyCalled.value) {
      return;
    }

    alreadyCalled.value = true;

    errors[index] = x;
    remainingElementsCount.value = remainingElementsCount.value - 1;

    if (remainingElementsCount.value === 0) {
      const error = new PromiseAggregateError();
      Object.defineProperty(error, "errors", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: errors,
      });

      return promiseCapability.reject(error);
    }
  };
}

/* 27.2.4.7.1 */
function promiseResolve(C, x) {
  if (isPromise(x)) {
    const xConstructor = x.constructor;
    if (Object.is(xConstructor, C)) {
      return x;
    }
  }
  const promiseCapability = new PromiseCapability(C);
  promiseCapability.resolve(x);
  return promiseCapability.promise;
}

/* 7.3.10 GetMethod(V, P) */
function getMethod(V, P) {
  if (!(P in V)) {
    return new ThrowCompletion(new TypeError("Property not found."));
  }
  const func = V[P];
  if (func === undefined || func === null) {
    return new NormalCompletion(undefined);
  }
  if (typeof func !== "function") {
    return new ThrowCompletion(new TypeError("`func` is not a method."));
  }
  return new NormalCompletion(func);
}

/* 7.4.2 GetIteratorFromMethod(obj,method) */
export function getIteratorFromMethod(obj, method) {
  const iterator = method.call(obj);
  if (!isObject(iterator)) {
    throw new TypeError("Iteartor should be an object");
  }
  const nextMethod = iterator.next;
  const iteratorRecord = {
    iterator,
    nextMethod,
    done: false,
  };
  return iteratorRecord;
}

/* 7.4.3 GetIterator(obj, kind) */
export function getIterator(obj, kind) {
  kind = kind || "sync";
  if (kind !== "sync" && kind !== "async") {
    throw new TypeError("Invalid kind. It could be either 'sync' or 'async'");
  }
  let method = getMethod(obj);
  if (kind === "async") {
    if (method === undefined) {
      method = obj[Symbol.asyncIterator];
      if (method === undefined) {
        const syncMethod = obj[Symbol.iterator];
        const syncIteratorRecord = getIteratorFromMethod(obj, syncMethod);

        return syncIteratorRecord;
      }
    } else {
      method = obj[Symbol.iterator];
    }
  }

  if (method === undefined) {
    throw new TypeError("Invalid method. method should not be undefined.");
  }

  return getIteratorFromMethod(obj, method);
}

function getPromiseResolve(promiseConstructor) {
  if (!isConstructor(promiseConstructor)) {
    throw new TypeError("Value must be a constructor.");
  }
  const promiseResolve = promiseConstructor.resolve;

  if (typeof promiseResolve !== "function") {
    throw new TypeError("resolve is not callable.");
  }

  return promiseResolve;
}
