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
  export type JoinResponseMessage = {
    nodeId: string;
  }
}

export type Type = $.vast.JoinResponseMessage;

export function getDefaultValue(): $.vast.JoinResponseMessage {
  return {
    nodeId: "",
  };
}

export function createValue(partialValue: Partial<$.vast.JoinResponseMessage>): $.vast.JoinResponseMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.JoinResponseMessage): unknown {
  const result: any = {};
  if (value.nodeId !== undefined) result.nodeId = tsValueToJsonValueFns.string(value.nodeId);
  return result;
}

export function decodeJson(value: any): $.vast.JoinResponseMessage {
  const result = getDefaultValue();
  if (value.nodeId !== undefined) result.nodeId = jsonValueToTsValueFns.string(value.nodeId);
  return result;
}

export function encodeBinary(value: $.vast.JoinResponseMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.nodeId !== undefined) {
    const tsValue = value.nodeId;
    result.push(
      [1, tsValueToWireValueFns.string(tsValue)],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.JoinResponseMessage {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.string(wireValue);
    if (value === undefined) break field;
    result.nodeId = value;
  }
  return result;
}
