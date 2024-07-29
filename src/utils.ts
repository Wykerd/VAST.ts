export function stringify(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return value;
        case 'bigint':
            return value.toString();
        case 'number':
            return value.toString();
        case 'function':
            return `<fn ${value.name}>`;
        case 'undefined':
            return '<undefined>';
        case 'symbol':
            return `<symbol ${value.toString()}>`;
        default:
            return JSON.stringify(value);
    }
}