import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { logger } from "./logger";

describe("logger", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("logger interface", () => {
    test("has debug method", () => {
      expect(typeof logger.debug).toBe("function");
    });

    test("has info method", () => {
      expect(typeof logger.info).toBe("function");
    });

    test("has warn method", () => {
      expect(typeof logger.warn).toBe("function");
    });

    test("has error method", () => {
      expect(typeof logger.error).toBe("function");
    });
  });

  describe("logging methods", () => {
    // Note: The actual log level is determined at module load time from LOG_LEVEL env var.
    // Default level is "info", so debug messages are filtered out by default.

    test("info logs to console.log", () => {
      logger.info("test message");
      expect(consoleLogSpy).toHaveBeenCalledWith("test message");
    });

    test("info accepts multiple arguments", () => {
      logger.info("message", { data: 123 }, "extra");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "message",
        { data: 123 },
        "extra"
      );
    });

    test("warn logs to console.warn", () => {
      logger.warn("warning message");
      expect(consoleWarnSpy).toHaveBeenCalledWith("warning message");
    });

    test("error logs to console.error", () => {
      logger.error("error message");
      expect(consoleErrorSpy).toHaveBeenCalledWith("error message");
    });

    test("debug method exists and can be called", () => {
      // Debug is filtered at default "info" level, but should not throw
      expect(() => logger.debug("debug message")).not.toThrow();
    });
  });
});
