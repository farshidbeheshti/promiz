import { isObject } from "./utils";

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
      // TODO: Return RejectPromise(promise, selfResolutionError)!
    }

    if (!isObject(resolution)) {
      // TODO: Return FulfillPromise(promise, resolution)!
    }

    let thenAction = null;
    try {
      thenAction = resolution.then;
    } catch (thenError) {
      // TODO: Return RejectPromise(promise, then.[[Value]])!
    }

    if (typeof thenAction !== "function") {
      // TODO: Return FulfillPromise(promise, resolution)!
    }
    // So `thenAction` is callable and must wait until thenable resolves!
    const job = new PromiseResolveThenableJob(promise, resolution, thenAction);
    // See https://developer.mozilla.org/docs/Web/API/queueMicrotask!
    queueMicrotask(job);
  };

  resolve = { ...resolve, promise, alreadyResolved };

  let reject = (reason) => {
    // just return if the promise is already resolved!
    if (alreadyResolved.value) {
      return;
    }
    alreadyResolved.value = true;

    //TODO:  Return RejectPromise(promise, reason)!
  };

  reject = { ...reject, promise, alreadyResolved };

  return {
    resolve,
    reject,
  };
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
