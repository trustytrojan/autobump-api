#!/bin/sh
# Remove all Stripe connectivity and paid-service commands, allowing for a free-use autobump application!
mkdir -p unused-src
mv src/commands/BuyBumps.ts unused-src
mv src/commands/CheckBalance.ts unused-src
mv src/stripe.ts unused-src
echo -e '\nDISABLE_STRIPE=1' >>.env