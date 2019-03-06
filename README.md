# Servtrics

Nodejs service metrics using InfluxDB

## Usage
`Servtrics = require('servtrics').default`

Servtrics try to connect to Influx DB on import using the following enviromental variables:
`NODE_METRICS_HOST`: Influx database instance URI
`NODE_METRICS_DATABASE`: Influx database name

If you need to manually trigger the connection, simply use the `connect` method, without defining the previous variables.

### Servtrics.connect(host, database = 'servtrics')
Create database given by name, if non existant, and attempt to connect to given **host** instance. Returns a promise which resolves after connecting or rejects after failing to connect.

_Example:_ 

    Servtrics = require('servtrics')
    Servtrics.connect("http://localhost:8086", "myServiceDB")


### Servtrics.expressMetricsMiddleware(request, response, next)
Middleware function for measuring Express endpoints response times. Metrics are saved under `express_response_times` measurement. Stored fields and tags are the following:

    {
        measurement: 'express_response_times',
        fields: {
            mean: FieldType.INTEGER,
            count: FieldType.INTEGER,
            upper: FieldType.INTEGER,
            sum: FieldType.INTEGER,
        },
        tags: [
            'path',
            'method',
            'status_code',
            'outcome'
        ]
    }
_Currently does not support measurements aggregations, despite the syntax._

**_Example:_** 

    Servtrics = require('servtrics')
    express = require('express')
    
    const app = express()
    
    app.use(Servtrics.expressMetricsMiddleware);

### Servtrics.metrifyAsynchronousFunction(asynchronousFunction)
Promise wrapper for metrifying asynchronous functions. Metrics are saved under `promise_response_times`. Stored fields and tags are the following:

    {
        measurement: 'promise_response_times',
        fields: {
            mean: FieldType.INTEGER,
            count: FieldType.INTEGER,
            upper: FieldType.INTEGER,
            sum: FieldType.INTEGER,
        },
        tags: [
            'asynchronousFunction',
            'exception',
            'outcome'
        ]
    }
_Currently does not support measurements aggregations, despite the syntax._

**_Example:_**
    
    Servtrics = require('servtrics')
    
    const myAsynchronousFunction = (x) => Promise.resolve(x)
    const myMetrifiedAsynchronousFunction = Servtrics.metrifyAsynchronousFunction(myAsynchronousFunction)
    
    myMetrifiedAsynchronousFunction() 
    
### Servtrics.metrifyFetch(fetch)
Fetch wrapper for metrifying asynchronous requests. Metrics are saved under `fetch_response_times`. Stored fields and tags are the following:

    {
        measurement: 'fetch_response_times',
        fields: {
            mean: FieldType.INTEGER,
            count: FieldType.INTEGER,
            upper: FieldType.INTEGER,
            sum: FieldType.INTEGER,
        },
        tags: [
            'url',
            'method',
            'status_code',
            'outcome'
        ]
    }
_Currently does not support measurements aggregations, despite the syntax._

**_Example:_**
    
    Servtrics = require('servtrics')
    IsomorphicFetch = require('isomorphic-fetch')
    
    const metrifiedFetch = Servtrics.metrifyFetch(IsomorphicFetch)
    
    metrifiedFetch('https://google.com.br')
    