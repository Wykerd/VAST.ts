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
  export type Addr = {
    hostname: string;
    port: number;
  }
}

export type Type = $.vast.Addr;

export function getDefaultValue(): $.vast.Addr {
  return {
    hostname: "",
    port: 0,
  };
}

export function createValue(partialValue: Partial<$.vast.Addr>): $.vast.Addr {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.Addr): unknown {
  const result: any = {};
  if (value.hostname !== undefined) result.hostname = tsValueToJsonValueFns.string(value.hostname);
  if (value.port !== undefined) result.port = tsValueToJsonValueFns.int32(value.port);
  return result;
}

export function decodeJson(value: any): $.vast.Addr {
  const result = getDefaultValue();
  if (value.hostname !== undefined) result.hostname = jsonValueToTsValueFns.string(value.hostname);
  if (value.port !== undefined) result.port = jsonValueToTsValueFns.int32(value.port);
  return result;
}

export function encodeBinary(value: $.vast.Addr): Uint8Array {
  const result: WireMessage = [];
  if (value.hostname !== undefined) {
    const tsValue = value.hostname;
    result.push(
      [1, tsValueToWireValueFns.string(tsValue)],
    );
  }
  if (value.port !== undefined) {
    const tsValue = value.port;
    result.push(
      [2, tsValueToWireValueFns.int32(tsValue)],
    );
  }
  return serialize(result);
}

export function decodeBinary(binary: Uint8Array): $.vast.Addr {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.string(wireValue);
    if (value === undefined) break field;
    result.hostname = value;
  }
  field: {
    const wireValue = wireFields.get(2);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.int32(wireValue);
    if (value === undefined) break field;
    result.port = value;
  }
  return result;
}
