import { Vec2d } from "./types.js";

export class Vector {
    constructor(public x: number, public y: number, public z: number) {}

    static fromVec2d(v: Vec2d) {
        return new Vector(v[0], v[1], 0);
    }

    toVec2d(): Vec2d {
        return [this.x, this.y];
    }

    copy() {
        return new Vector(this.x, this.y, this.z);
    }
    
    /**
     * Add a vector to this vector
     * @param v vector to add
     * @return the new vector
     */
    sum(v: Vector) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    /**
     * Subtract a vector from this vector
     * @param v vector to subtract
     * @return the new vector
     */
    sub(v: Vector) {
        return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    distance2(v: Vector) {
        return Math.pow(v.x - this.x, 2) + Math.pow(v.y - this.y, 2) + Math.pow(v.z - this.z, 2);
    }

    distance(v: Vector) {
        return Math.sqrt(this.distance2(v));
    }
}