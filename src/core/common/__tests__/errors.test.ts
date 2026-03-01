import { describe, it, expect } from "vitest";
import {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  ConflictError,
  RateLimitError,
  ServiceError,
  DatabaseError,
  TokenRefreshError,
  InvalidRefreshTokenError,
  isApplicationError,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isResourceNotFoundError,
  isConflictError,
  isRateLimitError,
  isServiceError,
  isDatabaseError,
  isTokenRefreshError,
  isInvalidRefreshTokenError,
  DataExportError,
  isDataExportError,
  createErrorFromUnknown,
  serializeError,
  deserializeError,
  createError,
} from "..";
import { SERVER_ERROR, AUTH_ERROR, EXPORT_ERROR } from "../error-codes";

describe("ApplicationError hierarchy", () => {
  it("preserves inheritance and properties", () => {
    const err = new ApplicationError(SERVER_ERROR.SERVER_001, "fail", 500, {
      a: 1,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApplicationError");
    expect(err.code).toBe(SERVER_ERROR.SERVER_001);
    expect(err.details).toEqual({ a: 1 });
    expect(err.httpStatus).toBe(500);
    expect(err.timestamp).toBeDefined();
  });

  it("serializes and deserializes correctly", () => {
    const err = new ValidationError("bad input", { field: "x" });
    const json = serializeError(err);
    const copy = deserializeError(json);
    expect(copy).toBeInstanceOf(ApplicationError);
    expect(copy.name).toBe("ApplicationError");
    expect(copy.code).toBe(err.code);
    expect(copy.message).toBe(err.message);
    expect(copy.httpStatus).toBe(err.httpStatus);
    expect(copy.details).toEqual(err.details);
    expect(copy.timestamp).toBe(err.timestamp);
  });

  it("uses cached JSON string", () => {
    const err = new ValidationError("bad input");
    const first = serializeError(err);
    const second = serializeError(err);
    expect(first).toBe(second);
  });

  it("preserves stack traces when extending", () => {
    const cause = new Error("root cause");
    const err = createError(SERVER_ERROR.SERVER_001, "boom", undefined, cause);
    expect(err.stack).toContain("Caused by:");
    expect(err.stack).toContain("root cause");
  });
});

describe("specific error subclasses", () => {
  it("sets correct HTTP status and names", () => {
    const auth = new AuthenticationError(SERVER_ERROR.SERVER_001, "a");
    const conflict = new ConflictError("c");
    const notFound = new ResourceNotFoundError("n");
    const db = new DatabaseError("d");
    const refresh = new TokenRefreshError('r');
    expect(auth.httpStatus).toBe(401);
    expect(auth.name).toBe("AuthenticationError");
    expect(refresh.code).toBe(AUTH_ERROR.AUTH_005);
    expect(conflict.httpStatus).toBe(409);
    expect(notFound.httpStatus).toBe(404);
    expect(db.httpStatus).toBe(500);
  });

  it("type guards identify errors", () => {
    const rate = new RateLimitError("oops");
    const authz = new AuthorizationError("nope");
    const basic = new ApplicationError(SERVER_ERROR.SERVER_001, "b");
    const db = new DatabaseError("d");
    expect(isRateLimitError(rate)).toBe(true);
    expect(isAuthorizationError(authz)).toBe(true);
    expect(isApplicationError(rate)).toBe(true);
    expect(isValidationError(rate)).toBe(false);
    expect(isAuthenticationError(authz)).toBe(false);
    expect(isDatabaseError(db)).toBe(true);
    expect(isResourceNotFoundError(new ResourceNotFoundError("x"))).toBe(true);
    expect(isConflictError(new ConflictError("y"))).toBe(true);
    expect(isServiceError(new ServiceError("z"))).toBe(true);
    expect(isApplicationError(basic)).toBe(true);
    expect(isTokenRefreshError(new TokenRefreshError('t'))).toBe(true);
    expect(isInvalidRefreshTokenError(new InvalidRefreshTokenError('i'))).toBe(
      true,
    );
  });
});

describe("utility functions", () => {
  it("creates ApplicationError from unknown input", () => {
    const basic = createErrorFromUnknown(new Error("oops"));
    expect(isServiceError(basic)).toBe(true);
    expect(basic.message).toBe("oops");
    const other = createErrorFromUnknown("oops");
    expect(other.message).toBe("Unknown error");
  });
});

describe('DataExportError', () => {
  it('creates and identifies export errors', () => {
    const err = new DataExportError(EXPORT_ERROR.EXPORT_001, 'fail', { step: 2 });
    expect(err).toBeInstanceOf(ApplicationError);
    expect(isDataExportError(err)).toBe(true);
    expect(err.code).toBe(EXPORT_ERROR.EXPORT_001);
    expect(err.details).toEqual({ step: 2 });
  });
});
