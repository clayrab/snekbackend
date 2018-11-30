//     let args = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
//     var block = await web3.eth.getBlock("latest");
//     let gasEstimate = await web3.eth.estimateGas({data: rewardTokenABI.bytecode});
//     let rewardContract = new web3.eth.Contract(rewardTokenABI.abi);
//     let deployTx = rewardContract.deploy({data: rewardTokenABI.bytecode, arguments : args});
//
//     deployTx.send({
//       from: req.user.pubkey,
//       gas: 4000000, // 4m is ~ the limit
//       gasPrice: 10000000,
//     }, function(error, transactionHash){
//       console.log("transcationhash: " + transactionHash);
//     })
