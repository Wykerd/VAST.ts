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
  export type AcknowledgeMessage = {
    sequence: string;
  }
}

export type Type = $.vast.AcknowledgeMessage;

export function getDefaultValue(): $.vast.AcknowledgeMessage {
  return {
    sequence: "0",
  };
}

export function createValue(partialValue: Partial<$.vast.AcknowledgeMessage>): $.vast.AcknowledgeMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.AcknowledgeMessage): unknown {
  const result: any = {};
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  return result;
}

export function decodeJson(value: any): $.vast.AcknowledgeMessage {
  const result = getDefaultValue();
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  return result;
}

export function encodeBinary(value: $.vast.AcknowledgeMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.AcknowledgeMessage {
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
  return result;
}
