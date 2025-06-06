import {
  assertNumber,
  assertObject,
  assertString,
} from '../../shared/src/asserts.ts';

export function assertHTTPRequestInfo(
  v: unknown,
): asserts v is HTTPRequestInfo {
  assertObject(v);
  assertNumber(v.httpStatusCode);
  assertString(v.errorMessage);
}

export type HTTPRequestInfo = {
  httpStatusCode: number;
  errorMessage: string;
};
