// @ts-nocheck
import {
  Type as Addr,
  encodeJson as encodeJson_1,
  decodeJson as decodeJson_1,
  encodeBinary as encodeBinary_1,
  decodeBinary as decodeBinary_1,
} from "./Addr.js";
import {
  Type as Vec2d,
  encodeJson as encodeJson_2,
  decodeJson as decodeJson_2,
  encodeBinary as encodeBinary_2,
  decodeBinary as decodeBinary_2,
} from "./Vec2d.js";
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
  export type JoinMessage = {
    addr?: Addr;
    pos?: Vec2d;
    aoiRadius: number;
  }
}

export type Type = $.vast.JoinMessage;

export function getDefaultValue(): $.vast.JoinMessage {
  return {
    addr: undefined,
    pos: undefined,
    aoiRadius: 0,
  };
}

export function createValue(partialValue: Partial<$.vast.JoinMessage>): $.vast.JoinMessage {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.JoinMessage): unknown {
  const result: any = {};
  if (value.addr !== undefined) result.addr = encodeJson_1(value.addr);
  if (value.pos !== undefined) result.pos = encodeJson_2(value.pos);
  if (value.aoiRadius !== undefined) result.aoiRadius = tsValueToJsonValueFns.uint32(value.aoiRadius);
  return result;
}

export function decodeJson(value: any): $.vast.JoinMessage {
  const result = getDefaultValue();
  if (value.addr !== undefined) result.addr = decodeJson_1(value.addr);
  if (value.pos !== undefined) result.pos = decodeJson_2(value.pos);
  if (value.aoiRadius !== undefined) result.aoiRadius = jsonValueToTsValueFns.uint32(value.aoiRadius);
  return result;
}

export function encodeBinary(value: $.vast.JoinMessage): Uint8Array {
  const result: WireMessage = [];
  if (value.addr !== undefined) {
    const tsValue = value.addr;
    result.push(
      [1, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
    );
  }
  if (value.pos !== undefined) {
    const tsValue = value.pos;
    result.push(
      [2, { type: WireType.LengthDelimited as const, value: encodeBinary_2(tsValue) }],
    );
  }
  if (value.aoiRadius !== undefined) {
    const tsValue = value.aoiRadius;
    result.push(
      [3, tsValueToWireValueFns.uint32(tsValue)],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.JoinMessage {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined;
    if (value === undefined) break field;
    result.addr = value;
  }
  field: {
    const wireValue = wireFields.get(2);
    if (wireValue === undefined) break field;
    const value = wireValue.type === WireType.LengthDelimited ? decodeBinary_2(wireValue.value) : undefined;
    if (value === undefined) break field;
    result.pos = value;
  }
  field: {
    const wireValue = wireFields.get(3);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.uint32(wireValue);
    if (value === undefined) break field;
    result.aoiRadius = value;
  }
  return result;
}
