
exports.transfer = async(from, to, howMuch) => {
  return await new Promise((resolve, reject) => {
    // var retData = {};
    // var contract = new web3.eth.Contract(rewardTokenABI.abi);
    // var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
    // retData.txHash = receipt.transactionHash;
    // res.type('application/json');
    // res.status(200);
    // res.send(retData);
  }).catch(err => {throw err});
}
