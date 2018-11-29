exports.ok200 = function(value, res) {
  res.type('application/json');
  res.status(200);
  res.send(value);
}
exports.error500 = function(error, res) {
  res.type('application/json');
  res.status(500);
  res.send(error);
}
exports.save = function(model, done) {
  model.save(function(err){
    if(err) {
      throw err;
    } else {
      done();
    }
  });
}
exports.mustFind = function(model, keyMap, done) {
  model.findOne(keyMap, function (err, retObj) {
    if(err){
      throw err;
    }
    if(!retObj){
      throw "Object not found in model";
    }
    done(retObj);
  });
}

exports.mustNotFind = function(model, keyMap, done) {
  try{
    model.findOne(keyMap, function (err, retObj) {
      if(err){
        throw err;
      }
      if(retObj){
        throw "Object already exists!";
      }
      done();
    });
  } catch(err) {
    throw err;
  }

}
