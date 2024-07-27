import { expect } from 'chai';
import { VONNode } from '../src/von/node.js';
import { identityToVONNeighbor } from '../src/von/neighbor.js';

describe('Voronoi Overlay Network (VON)', () => {
    let nodes: VONNode[] = [];

    const gwIdentity = {
        addr: {
            hostname: '0.0.0.0',
            port: 8181,
        },
        pos: {
            x: 0,
            y: 0,
        },
        aoiRadius: 10
    };

    it('create new network', async () => {
        const gateway = await VONNode.create(
            {
                hostname: '0.0.0.0',
                port: 8181,
            },
            8181,
        );

        gateway.initial([0, 0], 10);

        const identity = gateway.getIdentity();

        expect(identity).to.deep.equal(gwIdentity);
        expect(gateway.containsPoint([0, -1])).to.be.true;

        nodes.push(gateway);
    });

    it('connect to an existing network', async () => {
        const joining = await VONNode.create(
            {
                hostname: '0.0.0.0',
                port: 8182,
            },
            8182,
        );
    
        await joining.join('von://0.0.0.0:8181', [0, 1], 10);
        
        expect(joining.getNeighbors()).to.deep.equal([identityToVONNeighbor(gwIdentity)]);
        expect(joining.containsPoint([0, 1])).to.be.true;
        expect(joining.containsPoint([0, 0])).to.be.false;

        nodes.push(joining);
    });

    it('connect to an existing network with multiple nodes', async () => {
        const joining = await VONNode.create(
            {
                hostname: '0.0.0.0',
                port: 8183,
            },
            8183,
        );
    
        await joining.join('von://0.0.0.0:8181', [1, 1], 10);

        expect(joining.getNeighbors()).to.have.deep.members(nodes.map(node => identityToVONNeighbor(node.getIdentity())));
        expect(joining.containsPoint([1, 1])).to.be.true;
        expect(joining.containsPoint([0, 0])).to.be.false;
    });
});