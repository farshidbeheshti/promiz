import Promiz from "../src";
import InternalSlots from "../src/internal-slots";

describe("Promiz", () => {
  describe("Promiz constructor", () => {
    it("must throw an exception if the executor is missing", () => {
      expect(() => new Promiz()).toThrow(
        new TypeError("Executor is undefined.")
      );
    });
    it("must throw an exception if the executor is not a function", () => {
      expect(() => new Promiz(true)).toThrow(
        new TypeError("Executor is not a function.")
      );
    });
  });
});
