# Welcome

This code was part of the Blockchain Bridge project, a turnkey solution for enterprise Ethereum integration.

In addition to this backend our ERC20 coin can be found in the snekCoin repo and the frontend in the snakechainfrontend repo.

This backend is driven by synchronizing a node to a cassandra database, specifically syncing any events and state in our contract. The contract was also upgradable, details can be found in the snekCoin code.

We also leverage OAuth to authenticate the user with Google or other 3rd party OAuth providers.

Below are just some of my rough notes on how to operate the dev environment.

# Dev notes

truncate user; truncate usermap;
truncate chainevent; truncate block; truncate contract; truncate game; truncate usergames;
truncate userchainevents;

drop table contract;
drop table user;
drop table chainevent; drop table block; drop table game; drop table usergames;
drop table usermap;
drop table userchainevents;

drop table contract;
drop table user;
drop table price;
drop table purchase;
drop table userpowerups;
drop table game;
drop table transaction;
drop table usermap;
drop table chainevent;
drop table block;

--- Cassandra ---
prod:
bin/cassandra
dev:
bin/cassandra -f(foreground)

--- ethereum ---
prod:
???
dev:
truffle develop
migrate --reset

--- Move contract ABI to backend ---
cp /Users/clay/projects/rewardCoin/truffle/build/contracts/RewardToken.json eth/abi

https://ethereum.github.io/yellowpaper/paper.pdf
"""
"We can call this paradigm a transactional
singleton machine with shared-state."
...
With ubiquitous internet connections in most places
of the world, global information transmission has become
incredibly cheap. Technology-rooted movements like Bitcoin
have demonstrated through the power of the default,
consensus mechanisms, and voluntary respect of the social
contract, that it is possible to use the internet to make
a decentralised value-transfer system that can be shared
across the world and virtually free to use.
...
It aims to provide to the end-developer a tightly integrated
end-to-end system for building software on a hitherto unexplored
compute paradigm in the mainstream: a trustful
object messaging compute framework.
...
The first example of utilising the proof-of-work as a
strong economic signal to secure a currency was by Vishnumurthy
et al. [2003]. In this instance, the token was
used to keep peer-to-peer file trading in check, providing
“consumers” with the ability to make micro-payments to
“suppliers” for their services.
...
2.1. Value. In order to incentivise computation within the
network, there needs to be an agreed method for transmitting
value. To address this issue, Ethereum has an intrinsic
currency, Ether, known also as ETH and sometimes referred
to by the Old English ¯D. The smallest subdenomination
of Ether, and thus the one in which all integer values of
the currency are counted, is the Wei. One Ether is defined
as being 1018 Wei.

Multiplier Name
10^0 Wei
10^12 Szabo
10^15 Finney
10^18 Ether
...
Since the system is decentralised
and all parties have an opportunity to create a new block
on some older pre-existing block, the resultant structure is
necessarily a tree of blocks.
...
 σ (or a
variant thereupon) and those of machine-state, µ.
Functions operating on highly structured values are
denoted with an upper-case Greek letter, e.g. Υ, the
Ethereum state transition function.
...
most functions, an uppercase letter is used, e.g. C, the general cost function
...
Gzero 0 Nothing paid for operations of the set Wzero.
Gbase 2 Amount of gas to pay for operations of the set Wbase.
Gverylow 3 Amount of gas to pay for operations of the set Wverylow.
Glow 5 Amount of gas to pay for operations of the set Wlow.
Gmid 8 Amount of gas to pay for operations of the set Wmid.
Ghigh 10 Amount of gas to pay for operations of the set Whigh.
Gextcode 700 Amount of gas to pay for operations of the set Wextcode.
Gbalance 400 Amount of gas to pay for a BALANCE operation.
Gsload 200 Paid for a SLOAD operation.
Gjumpdest 1 Paid for a JUMPDEST operation.
Gsset 20000 Paid for an SSTORE operation when the storage value is set to non-zero from zero.
Gsreset 5000 Paid for an SSTORE operation when the storage value’s zeroness remains unchanged or
is set to zero.
Rsclear 15000 Refund given (added into refund counter) when the storage value is set to zero from
non-zero.
Rselfdestruct 24000 Refund given (added into refund counter) for self-destructing an account.
Gselfdestruct 5000 Amount of gas to pay for a SELFDESTRUCT operation.
Gcreate 32000 Paid for a CREATE operation.
Gcodedeposit 200 Paid per byte for a CREATE operation to succeed in placing code into state.
Gcall 700 Paid for a CALL operation.
Gcallvalue 9000 Paid for a non-zero value transfer as part of the CALL operation.
Gcallstipend 2300 A stipend for the called contract subtracted from Gcallvalue for a non-zero value transfer.
Gnewaccount 25000 Paid for a CALL or SELFDESTRUCT operation which creates an account.
Gexp 10 Partial payment for an EXP operation.
Gexpbyte 50 Partial payment when multiplied by dlog256(exponent)e for the EXP operation.
Gmemory 3 Paid for every additional word when expanding memory.
Gtxcreate 32000 Paid by all contract-creating transactions after the Homestead transition.
Gtxdatazero 4 Paid for every zero byte of data or code for a transaction.
Gtxdatanonzero 68 Paid for every non-zero byte of data or code for a transaction.
Gtransaction 21000 Paid for every transaction.
Glog 375 Partial payment for a LOG operation.
Glogdata 8 Paid for each byte in a LOG operation’s data.
Glogtopic 375 Paid for each topic of a LOG operation.
Gsha3 30 Paid for each SHA3 operation.
Gsha3word 6 Paid for each word (rounded up) for input data to a SHA3 operation.
Gcopy 3 Partial payment for *COPY operations, multiplied by words copied, rounded up.
Gblockhash 20 Payment for BLOCKHASH operation.
Gquaddivisor 100 The quadratic coefficient of the input sizes of the exponentiation-over-modulo precompiled contract.
"""




gasLimit = Gtransaction + Gtxdatanonzero × dataByteLength
where:
Gtransaction = 21000 gas
Gtxdatanonzero = 68 gas
dataByteLength — your data size in bytes
