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
