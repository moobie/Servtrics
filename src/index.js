import {InfluxDB, FieldType} from 'influx'

let influx

export default class Servtrics {
    static connect(host, database = 'servtrics') {
        const createDatabaseIfNotExistant = names => {
            if(names.includes(database)) {
                return Promise.resolve()
            }
            return influx.createDatabase(database)
        }
        const nullifyInfluxAndThrowError = error => {
            influx = null
            throw error
        }

        influx = new InfluxDB({
            host,
            database,
            schema: [
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
                },
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
                },
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
            ]
        })

        return influx.getDatabaseNames()
            .then(createDatabaseIfNotExistant)
            .catch(nullifyInfluxAndThrowError) 
    }

    static sendMetrics(measurement, tags, fields) {
        return influx.writePoints([{ measurement, tags, fields }])
            .catch(err => console.error(`Error saving data to InfluxDB! ${err.stack}`))
    }

    static expressMetricsMiddleware(request, response, next) {
        const start = Date.now()
        const sendExpressMetrics = () => {
            const duration = Date.now() - start
            const count = 1
            const mean = duration
            const sum = duration
            const upper = duration
            const fields = {
                count,
                mean,
                sum,
                upper
            }
            const { path, method } = request
            const { statusCode } = response
            const outcome = statusCode < 400 ? ( 
                "SUCCESS"
                ) : ( 
                statusCode < 500 ? ( 
                    "CLIENT_ERROR"
                    ) : (
                    "SERVER_ERROR"
                )
            )
            const tags = {
                path, 
                method, 
                status_code: statusCode,
                outcome
            }

            Servtrics.sendMetrics('express_response_times', tags, fields)
        }

        if (influx) {
            response.on('finish', sendExpressMetrics)
        }

        return next()
    }

    static metrifyAsynchronousFunction(
        asynchronousFunction, 
        { 
            measurement
        } = {
            measurement: 'promise_response_times'
        }
    ) {
        const metrifiedAsynchronousFunction = (...args) => {
            const start = Date.now()
            const sendMetrics = (tags) => {
                const duration = Date.now() - start 
                const count = 1
                const mean = duration
                const sum = duration
                const upper = duration
                const fields = {
                    count,
                    mean,
                    sum,
                    upper
                }
                Servtrics.sendMetrics(measurement, tags, fields)
            }
            const sendSuccessMetrics = response => {
                const outcome = 'SUCCESS'
                const tags = {
                    asynchronousFunction: asynchronousFunction.name,
                    outcome
                }
                sendMetrics(tags)
                return response
            }
            const sendExceptionMetrics = exception => {
                const outcome = exception instanceof Error ? (
                    'ERROR'
                    ) : (
                    'EXCEPTION'
                )
                const exceptionName = exception instanceof Error ? (
                    exception.name
                    ) : (
                    exception
                )
                const tags = {
                    asynchronousFunction: asynchronousFunction.name,
                    outcome,
                    exception: exceptionName
                }
                sendMetrics(tags)
                throw exception
            }

            return asynchronousFunction(...args)
                .then(sendSuccessMetrics)
                .catch(sendExceptionMetrics)
        }

        if(!influx) {
            return asynchronousFunction
        }
        return metrifiedAsynchronousFunction
    }

    static metrifyFetch(
        fetch, 
        {
            measurement
        } = {
            measurement: 'fetch_response_times'
        }
    ) {
        const metrifiedFetch = (url, options = {}, ...args) => {
            const start = Date.now()
            const sendFetchMetrics = response => {
                const duration = Date.now() - start 
                const count = 1
                const mean = duration
                const sum = duration
                const upper = duration
                const fields = {
                    count,
                    mean,
                    sum,
                    upper
                }
                const method = options.method || 'GET'
                const statusCode = response.status
                const outcome = statusCode < 400 ? ( 
                    "SUCCESS"
                    ) : ( 
                    statusCode < 500 ? ( 
                        "CLIENT_ERROR"
                        ) : (
                        "SERVER_ERROR"
                    )
                )
                const tags = {
                    url, 
                    method,
                    status_code: statusCode,
                    outcome
                }
                Servtrics.sendMetrics(measurement, tags, fields)

                return response
            }

            return fetch(url, options, ...args)
            .then(sendFetchMetrics)
        }

        if(!influx) {
            return fetch
        }
        return metrifiedFetch
    }
}

if(process.env.NODE_METRICS_HOST) {
    Servtrics.connect(process.env.NODE_METRICS_HOST, process.env.NODE_METRICS_DATABASE)
    .catch(({stack}) => console.error(`[${(new Date()).toISOString()}] Unable to connect to InfluxDB: ${stack}`)) 
}
