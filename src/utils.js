export function isObject(val) {
  if (val === null) {
    return false;
  }
  return typeof val === "function" || typeof val === "object";
}

export class Completion {
  constructor(type, value, target) {
    this.type = type;
    this.value = value;
    this.target = target;
  }
}

export class NormalCompletion extends Completion {
  constructor(argument) {
    super("normal", argument);
  }
}

export class ThrowCompletion extends Completion {
  constructor(argument) {
    super("throw", argument);
  }
}

export class NotImplementedError extends Error {
  constructor(message = "") {
    super(message);
    this.name = "NotImplementedError";
    this.message = message;
  }
}

/* 7.2.4 IsConstructor(argument) */
export function isConstructor(argument) {
  return (
    typeof argument === "function" && typeof argument.prototype !== "undefined"
  );
}

/* 7.4.4 */
export function iteratorNext(iteratorRecord, value) {
  let result;

  if (value === undefined) {
    result = iteratorRecord.nextMethod.call(iteratorRecord.iterator);
  } else {
    result = iteratorRecord.nextMethod.call(iteratorRecord.iterator, value);
  }

  if (!isObject(result)) {
    throw new TypeError("Result must be an object.");
  }

  return result;
}

/* 7.4.5 */
export function iteratorComplete(iterResult) {
  if (!isObject(iterResult)) {
    throw new TypeError("Argument must be an object.");
  }

  return Boolean(iterResult.done);
}

/* 7.4.6 */
export function iteratorValue(iterResult) {
  if (!isObject(iterResult)) {
    throw new TypeError("Argument must be an object.");
  }

  return iterResult.value;
}

/* 7.4.7 */
export function iteratorStep(iteratorRecord) {
  const result = iteratorNext(iteratorRecord);
  const done = iteratorComplete(result);

  if (done) {
    return false;
  }

  return result;
}

/* 7.4.8 */
export function iteratorClose(iteratorRecord, completion) {
  if (!isObject(iteratorRecord.iterator)) {
    throw new TypeError("Iterator must be an object.");
  }

  const iterator = iteratorRecord.iterator;

  let innerResult = getMethod(iterator, "return");

  let returnFunction;
  if (innerResult.type === "normal") {
    returnFunction = innerResult.value;

    if (returnFunction === undefined) {
      return completion;
    }

    try {
      innerResult = new NormalCompletion(returnFunction.call(iterator));
    } catch (error) {
      innerResult = new ThrowCompletion(error);
    }
  }

  if (completion.type === "throw") {
    return completion;
  }

  if (innerResult.type === "throw") {
    return innerResult;
  }

  if (!isObject(innerResult.value)) {
    return new ThrowCompletion(new TypeError("Error isn't an object."));
  }

  return completion;
}

/* 7.3.11 */
function getMethod(V, P) {
  if (!(P in V)) {
    return new ThrowCompletion(new TypeError("Property not found."));
  }

  const func = V[P];
  if (func === undefined || func === null) {
    return new NormalCompletion(undefined);
  }

  if (typeof func !== "function") {
    return new ThrowCompletion(new TypeError("Property is not a method."));
  }

  return new NormalCompletion(func);
}

export function PromiseAggregateError(errors = [], message) {
  const O = new.target === undefined ? new PromiseAggregateError() : this;

  if (typeof message !== "undefined") {
    const msg = String(message);

    Object.defineProperty(O, "message", {
      value: msg,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  // errors can be an iterable
  const errorsList = [...errors];

  Object.defineProperty(O, "errors", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: errorsList,
  });

  return O;
}
