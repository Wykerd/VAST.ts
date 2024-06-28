// @ts-nocheck
import {
  Type as Identity,
  encodeJson as encodeJson_1,
  decodeJson as decodeJson_1,
  encodeBinary as encodeBinary_1,
  decodeBinary as decodeBinary_1,
} from "./Identity.js";
import {
  tsValueToJsonValueFns,
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
  tsValueToWireValueFns,
  wireValueToTsValueFns,
} from "../../runtime/wire/scalar.js";
import {
  default as deserialize,
} from "../../runtime/wire/deserialize.js";

export declare namespace $.vast {
  export type MoveResponseMessage = {
    sequence: string;
    neighbors: Identity[];
  }
}

export type Type = $.vast.MoveResponseMessage;

export function getDefaultValue(): $.vast.MoveResponseMessage {
  return {
    sequence: "0",
    neighbors: [],
  };
}

export function createValue(partialValue: Partial<$.vast.MoveResponseMessage>): $.vast.MoveResponseMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.MoveResponseMessage): unknown {
  const result: any = {};
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  result.neighbors = value.neighbors.map(value => encodeJson_1(value));
  return result;
}

export function decodeJson(value: any): $.vast.MoveResponseMessage {
  const result = getDefaultValue();
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  result.neighbors = value.neighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  return result;
}

export function encodeBinary(value: $.vast.MoveResponseMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  for (const tsValue of value.neighbors) {
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.MoveResponseMessage {
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
  collection: {
    const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 2).map(([, wireValue]) => wireValue);
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.neighbors = value as any;
  }
  return result;
}
