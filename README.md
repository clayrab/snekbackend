# Welcome

This code was part of the Blockchain Bridge project, a turnkey solution for enterprise Ethereum integration.

In addition to this backend our ERC20 coin can be found in the snekCoin repo and the frontend in the snakechainfrontend repo.

This backend is driven by synchronizing a node to a cassandra database, specifically syncing any events and state in our contract. The contract was also upgradable, details can be found in the snekCoin code.

We also leverage OAuth to authenticate the user with Google or other 3rd party OAuth providers.
