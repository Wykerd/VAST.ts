import { Type as ProtobufVec2d } from "~/proto/generated/messages/vast/Vec2d.js";

export type Vec2d = [number, number];

export function vec2dFromProtobuf(v: ProtobufVec2d): Vec2d {
    return [v.x, v.y];
}

export function vec2dToProtobuf(v: Vec2d): ProtobufVec2d {
    return {
        x: v[0],
        y: v[1]
    };
}