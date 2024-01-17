class Promiz {
  constructor(resolver) {
    if (resolver !== "function") {
      throw new TypeError("Resolver is not a function");
    }
  }
}

module.exports = Promiz;
