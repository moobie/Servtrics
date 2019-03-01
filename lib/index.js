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
    value: function connect(host) {
      var database = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'node_metrics';

      var createDatabaseIfNotExistant = function createDatabaseIfNotExistant(names) {
        if (names.includes(database)) {
          return Promise.resolve();
        }

        return influx.createDatabase(database);
      };

      var nullifyInfluxAndLogError = function nullifyInfluxAndLogError(_ref) {
        var stack = _ref.stack;
        influx = null;
        console.error("[".concat(new Date().toISOString(), "] Unable to connect to InfluxDB: ").concat(stack));
      };

      influx = new _influx.InfluxDB({
        host: host,
        database: database,
        schema: [{
          measurement: 'express_response_times',
          fields: {
            mean: _influx.FieldType.INTEGER,
            count: _influx.FieldType.INTEGER,
            upper: _influx.FieldType.INTEGER,
            sum: _influx.FieldType.INTEGER
          },
          tags: ['path', 'method', 'status_code', 'outcome' //SUCCESS, CLIENT_ERROR, SERVER_ERROR
          ]
        }, {
          measurement: 'promise_response_times',
          fields: {
            mean: _influx.FieldType.INTEGER,
            count: _influx.FieldType.INTEGER,
            upper: _influx.FieldType.INTEGER,
            sum: _influx.FieldType.INTEGER
          },
          tags: ['asynchronousFunction', 'exception', 'outcome']
        }, {
          measurement: 'fetch_response_times',
          fields: {
            mean: _influx.FieldType.INTEGER,
            count: _influx.FieldType.INTEGER,
            upper: _influx.FieldType.INTEGER,
            sum: _influx.FieldType.INTEGER
          },
          tags: ['url', 'method', 'status_code', 'outcome']
        }]
      });
      return influx.getDatabaseNames().then(createDatabaseIfNotExistant).catch(nullifyInfluxAndLogError);
    }
  }, {
    key: "sendMetrics",
    value: function sendMetrics(measurement, tags, fields) {
      return influx.writePoints([{
        measurement: measurement,
        tags: tags,
        fields: fields
      }]).catch(function (err) {
        return console.error("Error saving data to InfluxDB! ".concat(err.stack));
      });
    }
  }, {
    key: "expressMetricsMiddleware",
    value: function expressMetricsMiddleware(request, response, next) {
      var start = Date.now();

      var sendExpressMetrics = function sendExpressMetrics() {
        var duration = Date.now() - start;
        var count = 1;
        var mean = duration;
        var sum = duration;
        var upper = duration;
        var fields = {
          count: count,
          mean: mean,
          sum: sum,
          upper: upper
        };
        var path = request.path,
            method = request.method;
        var statusCode = response.statusCode;
        var outcome = statusCode < 400 ? "SUCCESS" : statusCode < 500 ? "CLIENT_ERROR" : "SERVER_ERROR";
        var tags = {
          path: path,
          method: method,
          status_code: statusCode,
          outcome: outcome
        };
        NodeMetrics.sendMetrics('express_response_times', tags, fields);
      };

      if (influx) {
        response.on('finish', sendExpressMetrics);
      }

      return next();
    }
  }, {
    key: "metrifyAsynchronousFunction",
    value: function metrifyAsynchronousFunction(asynchronousFunction) {
      var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        measurement: 'promise_response_times'
      },
          measurement = _ref2.measurement;

      var metrifiedAsynchronousFunction = function metrifiedAsynchronousFunction() {
        var start = Date.now();

        var sendMetrics = function sendMetrics(tags) {
          var duration = Date.now() - start;
          var count = 1;
          var mean = duration;
          var sum = duration;
          var upper = duration;
          var fields = {
            count: count,
            mean: mean,
            sum: sum,
            upper: upper
          };
          NodeMetrics.sendMetrics(measurement, tags, fields);
        };

        var sendSuccessMetrics = function sendSuccessMetrics(response) {
          var outcome = 'SUCCESS';
          var tags = {
            asynchronousFunction: asynchronousFunction.name,
            outcome: outcome
          };
          sendMetrics(tags);
          return response;
        };

        var sendExceptionMetrics = function sendExceptionMetrics(exception) {
          var outcome = exception instanceof Error ? 'ERROR' : 'EXCEPTION';
          var exceptionName = exception instanceof Error ? exception.name : exception;
          var tags = {
            asynchronousFunction: asynchronousFunction.name,
            outcome: outcome,
            exception: exceptionName
          };
          sendMetrics(tags);
          throw exception;
        };

        return asynchronousFunction.apply(void 0, arguments).then(sendSuccessMetrics).catch(sendExceptionMetrics);
      };

      if (!influx) {
        return asynchronousFunction;
      }

      return metrifiedAsynchronousFunction;
    }
  }, {
    key: "metrifyFetch",
    value: function metrifyFetch(fetch) {
      var _ref3 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        measurement: 'fetch_response_times'
      },
          measurement = _ref3.measurement;

      var metrifiedFetch = function metrifiedFetch(url) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var start = Date.now();

        var sendFetchMetrics = function sendFetchMetrics(response) {
          var duration = Date.now() - start;
          var count = 1;
          var mean = duration;
          var sum = duration;
          var upper = duration;
          var fields = {
            count: count,
            mean: mean,
            sum: sum,
            upper: upper
          };
          var method = options.method || 'GET';
          var statusCode = response.status;
          var outcome = statusCode < 400 ? "SUCCESS" : statusCode < 500 ? "CLIENT_ERROR" : "SERVER_ERROR";
          var tags = {
            url: url,
            method: method,
            status_code: statusCode,
            outcome: outcome
          };
          NodeMetrics.sendMetrics(measurement, tags, fields);
          return response;
        };

        for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          args[_key - 2] = arguments[_key];
        }

        return fetch.apply(void 0, [url, options].concat(args)).then(sendFetchMetrics);
      };

      if (!influx) {
        return fetch;
      }

      return metrifiedFetch;
    }
  }]);

  return NodeMetrics;
}();

exports.default = NodeMetrics;

if (process.env.NODE_METRICS_HOST) {
  NodeMetrics.connect(process.env.NODE_METRICS_HOST, process.env.NODE_METRICS_DATABASE);
}