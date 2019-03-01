"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _influx = require("influx");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var influx;

var NodeMetrics =
/*#__PURE__*/
function () {
  function NodeMetrics() {
    _classCallCheck(this, NodeMetrics);
  }

  _createClass(NodeMetrics, null, [{
    key: "connect",
    value: function connect() {
      var host = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'localhost';
      var database = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'node_metrics';
      if (!host) throw new Error('Host must be supplied');
      influx = new _influx.InfluxDB({
        host: host,
        database: database,
        schema: [{
          measurement: 'express_response_times',
          fields: {
            duration: _influx.FieldType.INTEGER
          },
          tags: ['path', 'method', 'body', 'statusCode']
        }]
      });
      return influx.getDatabaseNames().then(function (names) {
        if (names.includes(database)) {
          return;
        }

        return influx.createDatabase(database);
      }).then(function () {
        return true;
      });
    }
  }, {
    key: "expressMetricsMiddleware",
    value: function expressMetricsMiddleware(request, response, next) {
      var start = Date.now();
      response.on('finish', function () {
        var duration = Date.now() - start;
        var path = request.path,
            method = request.method,
            body = request.body;
        var statusCode = response.statusCode;
        var tags = {
          path: path,
          method: method,
          body: JSON.stringify(body),
          statusCode: statusCode
        };
        var fields = {
          duration: duration
        };
        influx.writePoints([{
          measurement: 'express_response_times',
          tags: tags,
          fields: fields
        }]).catch(function (err) {
          console.error("Error saving data to InfluxDB! ".concat(err.stack));
        });
      });
      return next();
    }
  }]);

  return NodeMetrics;
}();

exports.default = NodeMetrics;