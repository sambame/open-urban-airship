var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DeviceSchema = new Schema({
    token: String,
    alias: String,
    _application: { type: Schema.Types.ObjectId, ref: 'Application' },
	status: {type: String, 'default': 'active'} 
});

DeviceSchema.index({token: 1, alias: 1, _application: 1}, {unique: true});

var DeviceModel = mongoose.model('Device', DeviceSchema);

module.exports = {
	DeviceModel: DeviceModel
};