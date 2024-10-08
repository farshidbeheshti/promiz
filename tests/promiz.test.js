import Promiz from "../src";
import InternalSlots from "../src/internal-slots";

describe("Promiz", () => {
  describe("Promiz constructor", () => {
    it("should throw an exception if the executor is missing", () => {
      expect(() => new Promiz()).toThrow(
        new TypeError("Executor is undefined.")
      );
    });
    it("should throw an exception if the executor is not callable", () => {
      expect(() => new Promiz(" ")).toThrow(
        new TypeError("Executor is not callable.")
      );
    });

    it("should fulfill a promiz instance if the executor calls resolve function", () => {
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

  describe("Promiz.any()", () => {
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

    it("should return the third promiz value since it is resolved first", (done) => {
      const promizDelayed = new Promiz((resolve) => {
        setTimeout(() => {
          resolve(44);
        }, 1000);
      });

      const promiz = Promiz.any([
        promizDelayed,
        Promiz.reject(43),
        Promiz.resolve(42),
      ]);

      promiz.then((value) => {
        expect(value).toEqual(42);
        done();
      });
    });
  });

  describe("Promiz.all()", () => {
    it("should throw an error when there is not a constructor passed to the all() method.", () => {
      expect(() => {
        Promiz.all.call({}, []);
      }).toThrow();
    });

    it("should reject a promiz when a promiz already thrown an exception", (done) => {
      const iterable = {
        [Symbol.iterator]() {
          throw new Error("Thrown exception");
        },
      };

      const promiz = Promiz.all(iterable);
      promiz.catch((error) => {
        expect(error.message).toEqual("Thrown exception");
        done();
      });
    });

    it("should return `42` as the first value that was rejected", (done) => {
      const promiz = Promiz.all([
        Promiz.reject(42),
        Promiz.reject(43),
        Promiz.reject(44),
      ]);

      promiz.catch((reason) => {
        expect(reason).toEqual(42);
        done();
      });
    });

    it("should return `43` as the second value since rejected when it is resolved first", (done) => {
      const promiz = Promiz.all([
        Promiz.resolve(42),
        Promiz.reject(43),
        Promiz.resolve(44),
      ]);

      promiz.catch((reason) => {
        expect(reason).toEqual(43);
        done();
      });
    });
  });

  describe("Promiz.allSettled()", () => {
    it("should throw an error when there is not a constructor passed to the all() method.allSettled()", () => {
      expect(() => {
        Promiz.allSettled.call({}, []);
      }).toThrow();
    });

    it("should reject a promiz when a promiz already thrown an exception", (done) => {
      const iterable = {
        [Symbol.iterator]() {
          throw new Error("Thrown exception");
        },
      };

      const promiz = Promiz.allSettled(iterable);
      promiz.catch((error) => {
        expect(error.message).toEqual("Thrown exception");
        done();
      });
    });
    it("should return all rejected values", (done) => {
      const promiz = Promiz.allSettled([
        Promiz.reject(42),
        Promiz.reject(43),
        Promiz.reject(44),
      ]);

      promiz.then((reason) => {
        expect(reason).toEqual([
          {
            status: "rejected",
            value: 42,
          },
          {
            status: "rejected",
            value: 43,
          },
          {
            status: "rejected",
            value: 44,
          },
        ]);
        done();
      });
    });
  });
});
