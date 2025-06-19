const mongoose = require('mongoose');

const logDb = mongoose.createConnection(
  'mongodb+srv://vaibhavsharmavee:NSMnDTsBNDxOhIeD@testsw.zgjnn8l.mongodb.net/logs?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

module.exports = logDb; 