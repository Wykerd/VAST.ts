// @ts-nocheck
import {
  Type as Identity,
  encodeJson as encodeJson_1,
  decodeJson as decodeJson_1,
  encodeBinary as encodeBinary_1,
  decodeBinary as decodeBinary_1,
} from "./Identity.js";
import {
  Type as AcknowledgeMessage,
  encodeJson as encodeJson_2,
  decodeJson as decodeJson_2,
  encodeBinary as encodeBinary_2,
  decodeBinary as decodeBinary_2,
} from "./AcknowledgeMessage.js";
import {
  Type as InvalidMessage,
  encodeJson as encodeJson_3,
  decodeJson as decodeJson_3,
  encodeBinary as encodeBinary_3,
  decodeBinary as decodeBinary_3,
} from "./InvalidMessage.js";
import {
  Type as WelcomeMessage,
  encodeJson as encodeJson_4,
  decodeJson as decodeJson_4,
  encodeBinary as encodeBinary_4,
  decodeBinary as decodeBinary_4,
} from "./WelcomeMessage.js";
import {
  Type as HelloMessage,
  encodeJson as encodeJson_5,
  decodeJson as decodeJson_5,
  encodeBinary as encodeBinary_5,
  decodeBinary as decodeBinary_5,
} from "./HelloMessage.js";
import {
  Type as HelloResponseMessage,
  encodeJson as encodeJson_6,
  decodeJson as decodeJson_6,
  encodeBinary as encodeBinary_6,
  decodeBinary as decodeBinary_6,
} from "./HelloResponseMessage.js";
import {
  Type as MoveResponseMessage,
  encodeJson as encodeJson_7,
  decodeJson as decodeJson_7,
  encodeBinary as encodeBinary_7,
  decodeBinary as decodeBinary_7,
} from "./MoveResponseMessage.js";
import {
  Type as LeaveMessage,
  encodeJson as encodeJson_8,
  decodeJson as decodeJson_8,
  encodeBinary as encodeBinary_8,
  decodeBinary as decodeBinary_8,
} from "./LeaveMessage.js";
import {
  Type as LeaveNotifyMessage,
  encodeJson as encodeJson_9,
  decodeJson as decodeJson_9,
  encodeBinary as encodeBinary_9,
  decodeBinary as decodeBinary_9,
} from "./LeaveNotifyMessage.js";
import {
  Type as LeaveRecoverMessage,
  encodeJson as encodeJson_10,
  decodeJson as decodeJson_10,
  encodeBinary as encodeBinary_10,
  decodeBinary as decodeBinary_10,
} from "./LeaveRecoverMessage.js";
import {
  tsValueToJsonValueFns,
  jsonValueToTsValueFns,
} from "../../runtime/json/scalar.js";
import {
  WireMessage,
  WireType,
  Field,
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
  export type VONPacket = {
    timestamp: string;
    sequence: string;
    message?: (
      | { field: "join", value: Identity }
      | { field: "acknowledge", value: AcknowledgeMessage }
      | { field: "invalid", value: InvalidMessage }
      | { field: "joinQuery", value: Identity }
      | { field: "welcome", value: WelcomeMessage }
      | { field: "hello", value: HelloMessage }
      | { field: "helloResponse", value: HelloResponseMessage }
      | { field: "helloReject", value: AcknowledgeMessage }
      | { field: "move", value: Identity }
      | { field: "moveResponse", value: MoveResponseMessage }
      | { field: "leave", value: LeaveMessage }
      | { field: "leaveNotify", value: LeaveNotifyMessage }
      | { field: "leaveRecover", value: LeaveRecoverMessage }
  );
  }
}

export type Type = $.vast.VONPacket;

export function getDefaultValue(): $.vast.VONPacket {
  return {
    timestamp: "0",
    sequence: "0",
    message: undefined,
  };
}

export function createValue(partialValue: Partial<$.vast.VONPacket>): $.vast.VONPacket {
  return {
    ...getDefaultValue(),
    ...partialValue,
  };
}

export function encodeJson(value: $.vast.VONPacket): unknown {
  const result: any = {};
  if (value.timestamp !== undefined) result.timestamp = tsValueToJsonValueFns.uint64(value.timestamp);
  if (value.sequence !== undefined) result.sequence = tsValueToJsonValueFns.uint64(value.sequence);
  switch (value.message?.field) {
    case "join": {
      result.join = encodeJson_1(value.message.value);
      break;
    }
    case "acknowledge": {
      result.acknowledge = encodeJson_2(value.message.value);
      break;
    }
    case "invalid": {
      result.invalid = encodeJson_3(value.message.value);
      break;
    }
    case "joinQuery": {
      result.joinQuery = encodeJson_1(value.message.value);
      break;
    }
    case "welcome": {
      result.welcome = encodeJson_4(value.message.value);
      break;
    }
    case "hello": {
      result.hello = encodeJson_5(value.message.value);
      break;
    }
    case "helloResponse": {
      result.helloResponse = encodeJson_6(value.message.value);
      break;
    }
    case "helloReject": {
      result.helloReject = encodeJson_2(value.message.value);
      break;
    }
    case "move": {
      result.move = encodeJson_1(value.message.value);
      break;
    }
    case "moveResponse": {
      result.moveResponse = encodeJson_7(value.message.value);
      break;
    }
    case "leave": {
      result.leave = encodeJson_8(value.message.value);
      break;
    }
    case "leaveNotify": {
      result.leaveNotify = encodeJson_9(value.message.value);
      break;
    }
    case "leaveRecover": {
      result.leaveRecover = encodeJson_10(value.message.value);
      break;
    }
  }
  return result;
}

export function decodeJson(value: any): $.vast.VONPacket {
  const result = getDefaultValue();
  if (value.timestamp !== undefined) result.timestamp = jsonValueToTsValueFns.uint64(value.timestamp);
  if (value.sequence !== undefined) result.sequence = jsonValueToTsValueFns.uint64(value.sequence);
  if (value.join !== undefined) result.message = {field: "join", value: decodeJson_1(value.join)};
  if (value.acknowledge !== undefined) result.message = {field: "acknowledge", value: decodeJson_2(value.acknowledge)};
  if (value.invalid !== undefined) result.message = {field: "invalid", value: decodeJson_3(value.invalid)};
  if (value.joinQuery !== undefined) result.message = {field: "joinQuery", value: decodeJson_1(value.joinQuery)};
  if (value.welcome !== undefined) result.message = {field: "welcome", value: decodeJson_4(value.welcome)};
  if (value.hello !== undefined) result.message = {field: "hello", value: decodeJson_5(value.hello)};
  if (value.helloResponse !== undefined) result.message = {field: "helloResponse", value: decodeJson_6(value.helloResponse)};
  if (value.helloReject !== undefined) result.message = {field: "helloReject", value: decodeJson_2(value.helloReject)};
  if (value.move !== undefined) result.message = {field: "move", value: decodeJson_1(value.move)};
  if (value.moveResponse !== undefined) result.message = {field: "moveResponse", value: decodeJson_7(value.moveResponse)};
  if (value.leave !== undefined) result.message = {field: "leave", value: decodeJson_8(value.leave)};
  if (value.leaveNotify !== undefined) result.message = {field: "leaveNotify", value: decodeJson_9(value.leaveNotify)};
  if (value.leaveRecover !== undefined) result.message = {field: "leaveRecover", value: decodeJson_10(value.leaveRecover)};
  return result;
}

export function encodeBinary(value: $.vast.VONPacket): Uint8Array {
  const result: WireMessage = [];
  if (value.timestamp !== undefined) {
    const tsValue = value.timestamp;
    result.push(
      [1, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  if (value.sequence !== undefined) {
    const tsValue = value.sequence;
    result.push(
      [2, tsValueToWireValueFns.uint64(tsValue)],
    );
  }
  switch (value.message?.field) {
    case "join": {
      const tsValue = value.message.value;
      result.push(
        [3, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
      );
      break;
    }
    case "acknowledge": {
      const tsValue = value.message.value;
      result.push(
        [4, { type: WireType.LengthDelimited as const, value: encodeBinary_2(tsValue) }],
      );
      break;
    }
    case "invalid": {
      const tsValue = value.message.value;
      result.push(
        [5, { type: WireType.LengthDelimited as const, value: encodeBinary_3(tsValue) }],
      );
      break;
    }
    case "joinQuery": {
      const tsValue = value.message.value;
      result.push(
        [6, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
      );
      break;
    }
    case "welcome": {
      const tsValue = value.message.value;
      result.push(
        [7, { type: WireType.LengthDelimited as const, value: encodeBinary_4(tsValue) }],
      );
      break;
    }
    case "hello": {
      const tsValue = value.message.value;
      result.push(
        [8, { type: WireType.LengthDelimited as const, value: encodeBinary_5(tsValue) }],
      );
      break;
    }
    case "helloResponse": {
      const tsValue = value.message.value;
      result.push(
        [9, { type: WireType.LengthDelimited as const, value: encodeBinary_6(tsValue) }],
      );
      break;
    }
    case "helloReject": {
      const tsValue = value.message.value;
      result.push(
        [10, { type: WireType.LengthDelimited as const, value: encodeBinary_2(tsValue) }],
      );
      break;
    }
    case "move": {
      const tsValue = value.message.value;
      result.push(
        [11, { type: WireType.LengthDelimited as const, value: encodeBinary_1(tsValue) }],
      );
      break;
    }
    case "moveResponse": {
      const tsValue = value.message.value;
      result.push(
        [12, { type: WireType.LengthDelimited as const, value: encodeBinary_7(tsValue) }],
      );
      break;
    }
    case "leave": {
      const tsValue = value.message.value;
      result.push(
        [13, { type: WireType.LengthDelimited as const, value: encodeBinary_8(tsValue) }],
      );
      break;
    }
    case "leaveNotify": {
      const tsValue = value.message.value;
      result.push(
        [14, { type: WireType.LengthDelimited as const, value: encodeBinary_9(tsValue) }],
      );
      break;
    }
    case "leaveRecover": {
      const tsValue = value.message.value;
      result.push(
        [15, { type: WireType.LengthDelimited as const, value: encodeBinary_10(tsValue) }],
      );
      break;
    }
  }
  return serialize(result);
}

const oneofFieldNumbersMap: { [oneof: string]: Set<number> } = {
  message: new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
};

const oneofFieldNamesMap = {
  message: new Map([
    [3, "join" as const],
    [4, "acknowledge" as const],
    [5, "invalid" as const],
    [6, "joinQuery" as const],
    [7, "welcome" as const],
    [8, "hello" as const],
    [9, "helloResponse" as const],
    [10, "helloReject" as const],
    [11, "move" as const],
    [12, "moveResponse" as const],
    [13, "leave" as const],
    [14, "leaveNotify" as const],
    [15, "leaveRecover" as const],
  ]),
};

export function decodeBinary(binary: Uint8Array): $.vast.VONPacket {
  const result = getDefaultValue();
  const wireMessage = deserialize(binary);
  const wireFields = new Map(wireMessage);
  const wireFieldNumbers = Array.from(wireFields.keys()).reverse();
  field: {
    const wireValue = wireFields.get(1);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.uint64(wireValue);
    if (value === undefined) break field;
    result.timestamp = value;
  }
  field: {
    const wireValue = wireFields.get(2);
    if (wireValue === undefined) break field;
    const value = wireValueToTsValueFns.uint64(wireValue);
    if (value === undefined) break field;
    result.sequence = value;
  }
  oneof: {
    const oneofFieldNumbers = oneofFieldNumbersMap.message;
    const oneofFieldNames = oneofFieldNamesMap.message;
    const fieldNumber = wireFieldNumbers.find(v => oneofFieldNumbers.has(v));
    if (fieldNumber == null) break oneof;
    const wireValue = wireFields.get(fieldNumber);
    const wireValueToTsValueMap = {
      [3](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined; },
      [4](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_2(wireValue.value) : undefined; },
      [5](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_3(wireValue.value) : undefined; },
      [6](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined; },
      [7](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_4(wireValue.value) : undefined; },
      [8](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_5(wireValue.value) : undefined; },
      [9](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_6(wireValue.value) : undefined; },
      [10](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_2(wireValue.value) : undefined; },
      [11](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_1(wireValue.value) : undefined; },
      [12](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_7(wireValue.value) : undefined; },
      [13](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_8(wireValue.value) : undefined; },
      [14](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_9(wireValue.value) : undefined; },
      [15](wireValue: Field) { return wireValue.type === WireType.LengthDelimited ? decodeBinary_10(wireValue.value) : undefined; },
    };
    const value = (wireValueToTsValueMap[fieldNumber as keyof typeof wireValueToTsValueMap] as any)?.(wireValue!);
    if (value === undefined) break oneof;
    result.message = { field: oneofFieldNames.get(fieldNumber)!, value: value as any };
  }
  return result;
}
