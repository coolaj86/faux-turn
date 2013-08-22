faux-turn
=========

A poor-man's TURN server built with NodeJS

Although not a true TURN server, it does allow you to port-forward and NAT-traverse.

Say you have a beta web app you're developing on your laptop (on port 4040) and you
want to share it with a friend over google hangout.

It may turn out to be faster to use faux-turn than to deploy your web app to a VPS.

Basically we're doing the same thing as we would with ssh port forwarding,
but without encryption and it even works on Windows.

    ssh -R '0.0.0.0:8080:localhost:5050' user@example.com

Installation (on VPS)
===

    git clone https://github.com/coolaj86/faux-turn.git
    pushd faux-turn/server
    # edit password in config.js
    node forward

Installation (on Laptop at home)
===

    git clone https://github.com/coolaj86/faux-turn.git
    pushd faux-turn/client
    # edit password in config.js
    node get-forwarded

Note the `http://example.com:port` address that is output, that's the link you'll want to share.

Goals
===

Add authentication, turn into a service. Make downloadable executable for all OSes.
