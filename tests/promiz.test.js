import Promiz from "../src";
import InternalSlots from "../src/internal-slots";

describe("Promiz", () => {
  describe("Promiz constructor", () => {
    it("should throw an exception if the executor is missing", () => {
      expect(() => new Promiz()).toThrow(
        new TypeError("Executor is undefined.")
      );
    });
    it("should throw an exception if the executor is not a function", () => {
      expect(() => new Promiz(true)).toThrow(
        new TypeError("Executor is not a function.")
      );
    });

    it("should fulfill a promiz instance if the executor call resolve function", () => {
      const aValue = 1234;
      const promiz = new Promiz((resolve) => {
        resolve(aValue);
      });

      expect(promiz[InternalSlots.state]).toEqual("fulfilled");
      expect(promiz[InternalSlots.result]).toEqual(aValue);
    });
  });

  describe("Promiz.prototype.then()", () => {
    it("should run handler if it's called with an argument in fulfilled state", (done) => {
      const promiz = new Promiz((resolve) => {
        resolve(42);
      });
      done();
      const result = promiz.then((value) => {
        expect(value).toEqual(42);
        done();
      });

      expect(result).toBeInstanceOf(Promiz);
      expect(result[InternalSlots.state]).toEqual("pending");
    });

    it("should run handler if it's called with an argument in pending state", (done) => {
      const promiz = new Promiz((resolve) => {
        setTimeout(() => {
          resolve(42);
        }, 100);
      });

      const result = promiz.then((value) => {
        expect(value).toEqual(42);
        done();
      });

      expect(result).toBeInstanceOf(Promiz);
      expect(result[InternalSlots.state]).toEqual("pending");
    });

    it("should run handler if it's called with an argument in rejected state", (done) => {
      const promiz = new Promiz((_, reject) => {
        reject(42);
      });

      const result = promiz.then(undefined, (value) => {
        expect(value).toEqual(42);
        done();
      });

      expect(result).toBeInstanceOf(Promiz);
      expect(result[InternalSlots.state]).toEqual("pending");
    });
  });

  describe("Promiz.prototype.any()", () => {
    it("should return `42` as the first value", (done) => {
      const promiz = Promiz.any([
        Promiz.resolve(42),
        Promiz.resolve(43),
        Promiz.resolve(44),
      ]);

      promiz.then((value) => {
        expect(value).toEqual(42);
        done();
      });
    });
  });
});
