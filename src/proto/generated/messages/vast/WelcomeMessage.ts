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
  export type WelcomeMessage = {
    identity?: Identity;
    neighbors: Identity[];
    oneHopNeighbors: Identity[];
  }
}

export type Type = $.vast.WelcomeMessage;

export function getDefaultValue(): $.vast.WelcomeMessage {
  return {
    identity: undefined,
    neighbors: [],
    oneHopNeighbors: [],
  };
}

export function createValue(partialValue: Partial<$.vast.WelcomeMessage>): $.vast.WelcomeMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.WelcomeMessage): unknown {
  const result: any = {};
  if (value.identity !== undefined) result.identity = encodeJson_1(value.identity);
  result.neighbors = value.neighbors.map(value => encodeJson_1(value));
  result.oneHopNeighbors = value.oneHopNeighbors.map(value => encodeJson_1(value));
  return result;
}

export function decodeJson(value: any): $.vast.WelcomeMessage {
  const result = getDefaultValue();
  if (value.identity !== undefined) result.identity = decodeJson_1(value.identity);
  result.neighbors = value.neighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  result.oneHopNeighbors = value.oneHopNeighbors?.map((value: any) => decodeJson_1(value)) ?? [];
  return result;
}

export function encodeBinary(value: $.vast.WelcomeMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.identity !== undefined) {
    const tsValue = value.identity;
    result.push(
      [1, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  for (const tsValue of value.neighbors) {
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

export function decodeBinary(binary: Uint8Array): $.vast.WelcomeMessage {
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
  collection: {
    const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 2).map(([, wireValue]) => wireValue);
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.neighbors = value as any;
  }
  collection: {
    const wireValues = wireMessage.filter(([fieldNumber]) => fieldNumber === 3).map(([, wireValue]) => wireValue);
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.oneHopNeighbors = value as any;
  }
  return result;
}
