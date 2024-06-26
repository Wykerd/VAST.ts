// @ts-nocheck
import {
  tsValueToJsonValueFns,
  jsonValueToTsValueFns,
} from "../../runtime/json/scalar.js";
import {
  WireMessage,
} from "../../runtime/wire/index.js";
import {
  default as serialize,
} from "../../runtime/wire/serialize.js";
import {
  tsValueToWireValueFns,
  wireValueToTsValueFns,
} from "../../runtime/wire/scalar.js";
import {
  default as deserialize,
} from "../../runtime/wire/deserialize.js";

export declare namespace $.vast {
  export type InvalidMessage = {
    sequence: string;
    reason: string;
  }
}

export type Type = $.vast.InvalidMessage;

export function getDefaultValue(): $.vast.InvalidMessage {
  return {
    sequence: "0",
    reason: "",
  };
}

export function createValue(partialValue: Partial<$.vast.InvalidMessage>): $.vast.InvalidMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.InvalidMessage): unknown {
  const result: any = {};
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  if (value.reason !== undefined) result.reason = tsValueToJsonValueFns.string(value.reason);
  return result;
}

export function decodeJson(value: any): $.vast.InvalidMessage {
  const result = getDefaultValue();
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  if (value.reason !== undefined) result.reason = jsonValueToTsValueFns.string(value.reason);
  return result;
}

export function encodeBinary(value: $.vast.InvalidMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  if (value.reason !== undefined) {
    const tsValue = value.reason;
    result.push(
      [2, tsValueToWireValueFns.string(tsValue)],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.InvalidMessage {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.uint64(wireValue);
    if (value === undefined) break field;
    result.sequence = value;
  }
  field: {
    const wireValue = wireFields.get(2);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.string(wireValue);
    if (value === undefined) break field;
    result.reason = value;
  }
  return result;
}
