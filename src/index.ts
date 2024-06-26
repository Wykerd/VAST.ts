import { VONNode } from "./von/node.js";

async function main() {
    const gateway = await VONNode.create({
        hostname: '0.0.0.0',
        port: 8181
    }, 8181);

    gateway.initial([0, 0], 10);

    const joining = await VONNode.create({
        hostname: '0.0.0.0',
        port: 8182
    }, 8182);

    await joining.join('von://0.0.0.0:8181', [1, 1], 10);
}

main();