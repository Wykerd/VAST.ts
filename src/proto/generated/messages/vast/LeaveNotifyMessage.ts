// @ts-nocheck
import {
  Type as Identity,
  encodeJson as encodeJson_1,
  decodeJson as decodeJson_1,
  encodeBinary as encodeBinary_1,
  decodeBinary as decodeBinary_1,
} from "./Identity.js";
import {
  jsonValueToTsValueFns,
} from "../../runtime/json/scalar.js";
import {
  WireMessage,
  WireType,
} from "../../runtime/wire/index.js";
import {
  default as serialize,
} from "../../runtime/wire/serialize.js";
import {
  default as deserialize,
} from "../../runtime/wire/deserialize.js";

export declare namespace $.vast {
  export type LeaveNotifyMessage = {
    identity?: Identity;
    leavingNode?: Identity;
  }
}

export type Type = $.vast.LeaveNotifyMessage;

export function getDefaultValue(): $.vast.LeaveNotifyMessage {
  return {
    identity: undefined,
    leavingNode: undefined,
  };
}

export function createValue(partialValue: Partial<$.vast.LeaveNotifyMessage>): $.vast.LeaveNotifyMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.LeaveNotifyMessage): unknown {
  const result: any = {};
  if (value.identity !== undefined) result.identity = encodeJson_1(value.identity);
  if (value.leavingNode !== undefined) result.leavingNode = encodeJson_1(value.leavingNode);
  return result;
}

export function decodeJson(value: any): $.vast.LeaveNotifyMessage {
  const result = getDefaultValue();
  if (value.identity !== undefined) result.identity = decodeJson_1(value.identity);
  if (value.leavingNode !== undefined) result.leavingNode = decodeJson_1(value.leavingNode);
  return result;
}

export function encodeBinary(value: $.vast.LeaveNotifyMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.identity !== undefined) {
    const tsValue = value.identity;
    result.push(
      [1, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  if (value.leavingNode !== undefined) {
    const tsValue = value.leavingNode;
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.LeaveNotifyMessage {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined;
    if (value === undefined) break field;
    result.identity = value;
  }
  field: {
    const wireValue = wireFields.get(2);
    if (wireValue === undefined) break field;
    const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined;
    if (value === undefined) break field;
    result.leavingNode = value;
  }
  return result;
}
