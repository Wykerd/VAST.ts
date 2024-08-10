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
  export type LeaveRecoverMessage = {
    sequence: string;
    potentialNeighbors: Identity[];
    oneHopNeighbors: Identity[];
  }
}

export type Type = $.vast.LeaveRecoverMessage;

export function getDefaultValue(): $.vast.LeaveRecoverMessage {
  return {
    sequence: "0",
    potentialNeighbors: [],
    oneHopNeighbors: [],
  };
}

export function createValue(partialValue: Partial<$.vast.LeaveRecoverMessage>): $.vast.LeaveRecoverMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.LeaveRecoverMessage): unknown {
  const result: any = {};
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  result.potentialNeighbors = value.potentialNeighbors.map(value => encodeJson_1(value));
  result.oneHopNeighbors = value.oneHopNeighbors.map(value => encodeJson_1(value));
  return result;
}

export function decodeJson(value: any): $.vast.LeaveRecoverMessage {
  const result = getDefaultValue();
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  result.potentialNeighbors = value.potentialNeighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  result.oneHopNeighbors = value.oneHopNeighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  return result;
}

export function encodeBinary(value: $.vast.LeaveRecoverMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  for (const tsValue of value.potentialNeighbors) {
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  for (const tsValue of value.oneHopNeighbors) {
    result.push(
      [3, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.LeaveRecoverMessage {
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
    result.potentialNeighbors = value as any;
  }
  collection: {
    const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 3).map(([, wireValue]) => wireValue);
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.oneHopNeighbors = value as any;
  }
  return result;
}
