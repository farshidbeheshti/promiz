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

    it("must fulfill a promiz instance if the executor call resolve function", () => {
      const aValue = 1234;
      const promiz = new Promiz((resolve) => {
        resolve(aValue);
      });

      expect(promiz[InternalSlots.state]).toEqual("fulfilled");
      expect(promiz[InternalSlots.result]).toEqual(aValue);
    });
  });
});
