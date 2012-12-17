var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ApplicationShcema = new Schema({
    name: {
        type: String,
        unique: true
    },
    secret_key_push: String,
    secret_key: String,
    access_key: String,
    development: Boolean,
    apple_push_certificate: String,
    apple_push_certificate_filename: String,
    apple_push_key: String,
    apple_push_key_filename: String
});

var ApplicationModel = mongoose.model('Application', ApplicationShcema);

module.exports = {
	ApplicationModel: ApplicationModel
};