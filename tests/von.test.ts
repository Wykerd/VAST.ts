import { expect } from 'chai';
import { VONNode } from '../src/von/node.js';
import { createFileLogger } from '../src/devtools/logging.js';
import { identityToVONNeighbor, vonNeighborToIdentity } from '../src/von/neighbor.js';

const logger = createFileLogger('von-test.log');

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
        const gateway = await VONNode.create({
            endpoint: {
                hostname: '0.0.0.0',
                port: 8181,
            },
            port: 8181,
            logger,
        });

        gateway.initial([0, 0], 10);

        const identity = gateway.getIdentity();

        expect(identity).to.deep.equal(gwIdentity);
        expect(gateway.containsPoint([0, -1])).to.be.true;

        nodes.push(gateway);
    });

    it('connect to an existing network', async () => {
        const joining = await VONNode.create({
            endpoint: {
                hostname: '0.0.0.0',
                port: 8182,
            },
            port: 8182,
            logger,
        });
    
        await joining.join('von://0.0.0.0:8181', [0, 1], 10);
        
        expect(joining.getNeighbors()).to.deep.equal([identityToVONNeighbor(gwIdentity)]);
        expect(joining.containsPoint([0, 1])).to.be.true;
        expect(joining.containsPoint([0, 0])).to.be.false;

        nodes.push(joining);
    });

    it('connect to an existing network with multiple nodes', async () => {
        const sites = [
            [-1, 0],
            [1, 0],
            [0, -1]
        ];

        for (let i = 0; i < sites.length; i++) {
            const site = sites[i]!;
            const joining = await VONNode.create({
                endpoint: {
                    hostname: '0.0.0.0',
                    port: 8183 + i,
                },
                port: 8183 + i,
                logger,
            });
        
            await joining.join('von://0.0.0.0:8181', site, 10);
    
            expect(joining.containsPoint(site)).to.be.true;
            expect(joining.containsPoint([0, 0])).to.be.false;

            nodes.push(joining);
        }
    });

    it('correct neighborhoods', () => {
        const identities = nodes.map(node => node.getIdentity());

        const correctNeighbors = [
            [1, 2, 3, 4],
            [0, 2, 3],
            [0, 1, 4],
            [0, 1, 4],
            [0, 2, 3]
        ];

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i]!;
            const neighbors = node.getNeighbors().map(n => vonNeighborToIdentity(n)!);

            const expected = correctNeighbors[i]!.map(index => identities[index]!);

            expect(neighbors).to.have.deep.members(expected);
        }
    })

    it('move a node', async () => {

    })
});