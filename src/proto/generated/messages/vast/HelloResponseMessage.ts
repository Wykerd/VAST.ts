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
  export type HelloResponseMessage = {
    sequence: string;
    identity?: Identity;
    missingNeighbors: Identity[];
  }
}

export type Type = $.vast.HelloResponseMessage;

export function getDefaultValue(): $.vast.HelloResponseMessage {
  return {
    sequence: "0",
    identity: undefined,
    missingNeighbors: [],
  };
}

export function createValue(partialValue: Partial<$.vast.HelloResponseMessage>): $.vast.HelloResponseMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.HelloResponseMessage): unknown {
  const result: any = {};
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  if (value.identity !== undefined) result.identity = encodeJson_1(value.identity);
  result.missingNeighbors = value.missingNeighbors.map(value => encodeJson_1(value));
  return result;
}

export function decodeJson(value: any): $.vast.HelloResponseMessage {
  const result = getDefaultValue();
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  if (value.identity !== undefined) result.identity = decodeJson_1(value.identity);
  result.missingNeighbors = value.missingNeighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  return result;
}

export function encodeBinary(value: $.vast.HelloResponseMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  if (value.identity !== undefined) {
    const tsValue = value.identity;
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  for (const tsValue of value.missingNeighbors) {
    result.push(
      [3, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.HelloResponseMessage {
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
    const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined;
    if (value === undefined) break field;
    result.identity = value;
  }
  collection: {
    const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 3).map(([, wireValue]) => wireValue);
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.missingNeighbors = value as any;
  }
  return result;
}
