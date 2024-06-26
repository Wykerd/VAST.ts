// @ts-nocheck
import {
  Type as Identity,
  encodeJson as encodeJson_1,
  decodeJson as decodeJson_1,
  encodeBinary as encodeBinary_1,
  decodeBinary as decodeBinary_1,
} from "./Identity.js";
import {
  Type as Addr,
  encodeJson as encodeJson_2,
  decodeJson as decodeJson_2,
  encodeBinary as encodeBinary_2,
  decodeBinary as decodeBinary_2,
} from "./Addr.js";
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
  export type HelloMessage = {
    identity?: Identity;
    neighbors: Addr[];
  }
}

export type Type = $.vast.HelloMessage;

export function getDefaultValue(): $.vast.HelloMessage {
  return {
    identity: undefined,
    neighbors: [],
  };
}

export function createValue(partialValue: Partial<$.vast.HelloMessage>): $.vast.HelloMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.HelloMessage): unknown {
  const result: any = {};
  if (value.identity !== undefined) result.identity = encodeJson_1(value.identity);
  result.neighbors = value.neighbors.map(value => encodeJson_2(value));
  return result;
}

export function decodeJson(value: any): $.vast.HelloMessage {
  const result = getDefaultValue();
  if (value.identity !== undefined) result.identity = decodeJson_1(value.identity);
  result.neighbors = value.neighbors?.map((value: any) => decodeJson_2(value)) ?? [];
  return result;
}

export function encodeBinary(value: $.vast.HelloMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.identity !== undefined) {
    const tsValue = value.identity;
    result.push(
      [1, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  for (const tsValue of value.neighbors) {
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_2(tsValue) }],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.HelloMessage {
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
    const value = wireValues.map((wireValue) => wireValue.type === WireType.LengthDelimited ? decodeBinary_2(wireValue.value) : undefined).filter(x => x !== undefined);
    if (!value.length) break collection;
    result.neighbors = value as any;
  }
  return result;
}
