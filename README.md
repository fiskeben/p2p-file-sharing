# P2P file sharing with node.js

This is my result of following the
[P2P file sharing tutorial/workshop](https://mafintosh.github.io/p2p-file-sharing-workshop)
by [@mafintosh](https://github.com/mafintosh)
and [@watson](https://github.com/watson).

I haven't attended the workshop myself and neither need you :)

## Usage

The code is mainly for reference, but if you really must run it here's how:

* Install dependencies with `npm install`
* Run the server with `node server.js <path-to-file>`
  (where `<path-to-file> ` is the file you want to share)
* Once ready the server will output a hash. Copy it and start the client with
  `node client.js <copied hash>` in another terminal.

You should now see the client and server talk to each other and transfer the file.
