Since VON is an overlay network, it does not concern itself with the underlying physical network. It is typical to use TCP for the physical network layer in the context of a massively multi-user virtual environment (MMVE), however, no specific protocol is mandated by the VON specification. For IoT applications one might use some other protocol as the base network layer such as MQTT.

# VON Procedures

All VON nodes have the following three core actions available to them:
1. *JOIN*: A node can join the network.
2. *MOVE*: A node can change its position in the virtual environment.
3. *LEAVE*: A node can leave the network.

These actions are performed through messages sent between the nodes. Let's look at how these actions are performed in more detail.

## JOIN

**TODO: ensure this works concurrently as multiple nodes may be joining at the same time**

The following is the procedure for a node to join the network:

1. The *joining node* opens a connection the the *gateway node*. The *gateway node* is any node that is known to be in the network.
2. The *joining node* sends a *JOIN message* to the *gateway node*.
3. The *gateway node* assigns a unique ID to the *joining node*.
4. The *gateway node* acknowledges the *joining node*'s request by sending a *JOIN RESPONSE message* to the *joining node*.
5. The *gateway node* uses the *point forwarding algorithm* to send a *JOIN QUERY message* to the node whose region contains the *joining node*'s requested position. This node is the *acceptor node*.
6. The *acceptor node* runs the *add node algorithm*.
7. The *acceptor node* determines the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
8. The *acceptor node* sends a *WELCOME message* to the *joining node* containing the estimated list of the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
9. The *joining node* creates an set of *EN nodes* from the list of neighboring nodes in the *WELCOME message*.
10. Using the *EN node set*, the *joining node* creates a *local Voronoi diagram*.
10. The *joining node* enters a loop:
    1. Identify the true *EN neighbors* from the constructed *local Voronoi diagram*.
    2. Send a *HELLO message* to each of the *EN neighbors* that has not yet been contacted. This causes the neighboring node to run the *HELLO procedure*.
    3. Wait for a *HELLO RESPONSE message* from each of the *EN neighbors*. If it receives a *HELLO REJECT message* from any of the *EN neighbors*, that neighbor is removed from the *EN node set* and discarded in the rest of the below calculations.
    4. The *HELLO RESPONSE message* contains the *missing EN neighbors* of the *joining node*. Add them to the *EN node set*.
    5. If the *EN node set* has not changed, exit the loop.
11. The *joining node* determines its final *EN neighbors* from the constructed *local Voronoi diagram*. It closes any connections to the *EN nodes* in the set that are not its *EN neighbors*.

## HELLO

The *HELLO procedure* is used by a node to establish a connection with its *EN neighbors*. The procedure is as follows:

1. The *node* receives a *HELLO message* from a *joining node*.
2. The *node* runs the *add node algorithm*.
5. If the *joining node* is not one of the *EN neighbors*, the join request is invalid and the *node* sends a *HELLO REJECT message* to the *joining node*. The procedure ends here in this case.
6. The *node* determines its estimate of the *joining node*'s *EN neighbors* from the constructed *local Voronoi diagram*.
7. The *node* sends a *HELLO RESPONSE message* to the *joining node* containing the *missing EN neighbors* of the *joining node*.
8. The *node* closes any connections to the *EN nodes* in the set that are not its *EN neighbors*.

# VON Algorithms

## Add Node Algorithm

The *add node algorithm* is used by a *node* to add a *joining node* to its neighborhood. The algorithm is as follows:
1. The *node* creates a *EN node set* containing its current *EN neighbors* and the *joining node*.
2. The *node* creates a *local Voronoi diagram* using the *EN node set*.
3. The *node* determines its new *EN neighbors* from the constructed *local Voronoi diagram*.
4. The *node* updates its *EN neighbors* to the new set determined from the *local Voronoi diagram*.

## Point Forwarding Algorithm

The point forwarding algorithm is used to forward a message to the node whose region contains a given *target point*. The algorithm is as follows:
1. Start with the *sender* as the *current node*.
2. While the *current node* is not the *target node* do the following:
    1. If the *current node* contains the *target point* in its region, then the *current node* is the *target node* and we have reached our destination.
    1. Find the neighbor of the *current node* that is closest to the *target point*. This is the *candidate node*.
    2. If the *candidate node* is in the message trace, we've already visited it, so we stop and return an error. This step is important to prevent circular loops in the network that may arise due to errors in the network consitency (it is unlikely to occur but must be accounted for).
    3. Add the *current node* to the message trace.
    4. Forward the message to the *candidate node*.
    5. The *candidate node* becomes the *current node* and we repeat the process.

# VON Messages

The VON specification does not mandate a specific message format. It does however specify which fields to be included in the message. It is up to the implementor on how to serialize it. It is advisable to use a binary format for efficiency and reduced bandwidth usage. The implementation in this repository uses Protocol Buffers for message serialization.

All messages have the following fields regardless of the message type:
- `type`: This is used to identify the type of the message. This is an enum field that can take any of the message types defined in the VON specification.
- `timestamp`: The time at which the message was created. This is a 64-bit integer that represents the number of milliseconds since the Unix epoch.

## JOIN Message

The JOIN message is sent by a node to the gateway server when it wants to join the network. The message contains the following fields:

- `connection_info`: This field is required and contains the connection information of the node required to reach it on the physical network. This can be an IP address and port number, for example.
- `position`: This field represents the position of the node in the virtual environment. It is a 2D vector that represents the x and y coordinates of the node.
- `aoi_radius`: This field represents the Area of Interest (AOI) radius of the node. It is a 64-bit floating point number that represents the radius of the circle around the node that defines its AOI.

## JOIN QUERY Message

The JOIN QUERY message is used to find the node whose region contains the requested position of the *joining node*. The message contains the following fields:

- `connection_info`: This field is required and contains the connection information of the node required to reach it on the physical network. This can be an IP address and port number, for example.
- `position`: This field represents the requested position of the joining node in the virtual environment. It is a 2D vector that represents the x and y coordinates of the node.
- `aoi_radius`: This field represents the Area of Interest (AOI) radius of the joining node. It is a 64-bit floating point number that represents the radius of the circle around the node that defines its AOI.

## JOIN RESPONSE Message

The JOIN RESPONSE message is sent by the *gateway server* to the *joining node* to acknowledge its request to join the network. The message contains the following fields:

- `node_id`: This field is required and contains the unique ID assigned to the joining node by the gateway server.

## WELCOME Message

The WELCOME message is sent by the *acceptor node* to the *joining node* to welcome it to the network. The message contains the following fields:


