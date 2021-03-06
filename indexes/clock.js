var ref    = require('ssb-ref')
var path = require('path')
var pull = require('pull-stream')
var ltgt = require('ltgt')
//53 bit integer
var MAX_INT  = 0x1fffffffffffff
var u = require('../util')
var Format = u.formatStream

var ViewLevel = require('flumeview-level')

module.exports = function (db, opts) {

  var createIndex = ViewLevel(1, function (data) {
    return [[data.value.author, data.value.sequence]]
  })

  return function (log, name) {

    var index = createIndex(log, name)

    index.methods.createHistoryStream = 'source'
    index.methods.createUserStream = 'source'

    index.createHistoryStream = function (opts) {
      var opts    = u.options(opts)
      var id      = opts.id
      var seq     = opts.sequence || opts.seq || 0
      var limit   = opts.limit
      var keys = opts.keys
      var values = opts.values
      return pull(
        index.read({
          gte:  [id, seq],
          lte:  [id, MAX_INT],
          live: opts && opts.live,
          old: opts && opts.old,
          keys: false,
          sync: false === (opts && opts.sync),
          limit: limit
        }),
        pull.map(function (e) {
          return keys && values ? e.value : keys ? e.value.key : e.value.value
        })
      )
    }

    index.createUserStream = function (opts) {
      opts = u.options(opts)
      //mutates opts
      ltgt.toLtgt(opts, opts, function (value) {
        return [opts.id, value]
      }, u.lo, u.hi)
      var keys = opts.keys !== false
      var values = opts.values !== false
      opts.keys = false
      opts.values = true

      return pull(index.read(opts), Format(keys, values))
    }

    return index

  }
}




