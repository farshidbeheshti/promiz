export default class Promiz {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("Executor is not a function");
    }
  }
  test() {
    return false;
  }
}
