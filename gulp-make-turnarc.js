var PLUGIN_NAME = 'gulp-make-turnarc';

var util = require('util');
var Transform = require('readable-stream').Transform;
var VinylFile = require('vinyl');

function encodingName(encoding) {
  switch(encoding) {
    case 'ascii': return 'ascii';
    case 'utf8': return 'utf-8';
    case 'utf16le': case 'ucs2': return 'utf-16le';
    default: throw new Error('Encoding "' + encoding + '" is not supported!');
  }
}


function TurnarcStream(headerEncoding) {
  if(!(this instanceof TurnarcStream))
    return new TurnarcStream(headerEncoding);
  headerEncoding = headerEncoding || 'utf8';
  
  Transform.call(this, { objectMode: true });
  
  this.headerEncoding = headerEncoding;
  this.buffers = [];
  this.names = [];
}
util.inherits(TurnarcStream, Transform);

TurnarcStream.prototype._transform = function(file, enc, cb) {
  if(file.isStream()) {
    this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
    return cb();
  }
  if(file.isBuffer()) {
    this.buffers.push(new Buffer(file.contents));
    this.names.push(file.relative);
  }
  cb();
}

TurnarcStream.prototype._flush = function(cb) {
  var header = '[turnarc]';
  if(this.headerEncoding !== 'utf8')
    try {
      header = '[turnarc:'+encodingName(this.headerEncoding)+']';
    } catch(e) {
      this.emit('error', new PluginError(PLUGIN_NAME, e));
      return cb();
    }
  
  if(this.buffers.length) {
    header += '\n';
    
    var records = ':';
    for(var i = 0, len = this.buffers.length-1; i < len; ++i) {
      records += this.names[i]+'\n'+this.buffers[i].length+':';
    }
    records += this.names[this.buffers.length-1];
    
    var sublength = header.length + records.length, length = sublength;
    while(length !== (length = sublength + length.toString().length));
    header += length + records;
  }
  
  this.buffers.unshift(new Buffer(header, this.headerEncoding));
  this.push(new VinylFile({ contents: Buffer.concat(this.buffers) }));
  cb();
}

module.exports = TurnarcStream;
