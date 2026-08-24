# Pague Telemetry SDK

> A production-ready observability SDK for Node.js applications built on OpenTelemetry, providing a simple, opinionated API for structured logging, distributed tracing, metrics, context propagation, and transport-specific instrumentation.

---

## Overview

The Pague Telemetry SDK simplifies application observability by providing a unified interface over OpenTelemetry. Instead of interacting directly with multiple OpenTelemetry APIs, applications use a small, consistent, and type-safe SDK that automatically integrates logging, metrics, tracing, and request context.

The SDK was designed for distributed, event-driven systems such as APIs, message brokers, SMS gateways, and background workers where requests flow across multiple services and protocols.

Out of the box, the SDK provides:

- Structured JSON logging
- Distributed tracing
- OpenTelemetry metrics
- Request-scoped context propagation
- Automatic trace and log correlation
- HTTP instrumentation
- RabbitMQ instrumentation
- Database instrumentation
- SMPP instrumentation
- Framework-independent architecture

The SDK is built around OpenTelemetry and exports telemetry to an OpenTelemetry Collector, allowing it to integrate with any modern observability platform.

---

## Why Pague Telemetry?

OpenTelemetry provides powerful observability capabilities, but building production-ready instrumentation directly on top of the OpenTelemetry APIs requires significant boilerplate.

Applications typically need to:

- Configure exporters
- Create meters
- Create tracers
- Manage span lifecycles
- Handle context propagation
- Correlate logs with traces
- Record metrics
- Instrument HTTP requests
- Instrument messaging systems
- Ensure telemetry is completed correctly when exceptions occur

The Pague Telemetry SDK encapsulates these concerns behind a small, opinionated API.

Instead of writing dozens of lines of OpenTelemetry code, applications simply initialize telemetry and use the SDK.

```ts
initTelemetry(configuration);

const logger = getLogger();

await withPromiseSpan(
    'Process SMS',
    async () => {
        logger.info('Processing SMS');
    },
);
```

The SDK automatically:

- Initializes OpenTelemetry
- Creates and manages spans
- Correlates logs with traces
- Records exceptions
- Propagates request context
- Exports telemetry to the configured collector

---

## Features

### Logging

- Structured JSON logging
- Built on Pino
- Automatic trace correlation
- Automatic request context enrichment
- Error serialization
- Child loggers
- Component loggers
- Configurable transports
- Sensitive data redaction

### Metrics

- Counter metrics
- Histogram metrics
- Observable gauges
- UpDownCounters
- Metric registry
- Automatic common attributes
- OpenTelemetry compatible

### Tracing

- Automatic span management
- Nested spans
- Span attributes
- Span events
- Exception recording
- Context propagation
- Active span helpers

### Context

- AsyncLocalStorage propagation
- Request-scoped context
- Correlation IDs
- Request IDs
- Tenant IDs
- Client IDs
- Automatic enrichment of logs and spans

### Built-in Integrations

- HTTP
- RabbitMQ
- Database
- SMPP

Each integration combines logging, metrics, tracing, and context into a single lifecycle abstraction.

---

# Architecture Overview

```
                         Application
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                 Pague Telemetry SDK                      │
│                                                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│   │ Logging  │  │ Metrics  │  │ Tracing  │               │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│        │             │             │                     │
│        └─────────────┼─────────────┘                     │
│                      │                                   │
│                Context Module                           │
│             (AsyncLocalStorage)                         │
│                      │                                   │
│              Integration Modules                         │
│                                                          │
│ HTTP │ RabbitMQ │ Database │ SMPP                       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
             OpenTelemetry SDK
                       │
                       ▼
          OpenTelemetry Collector
         ┌──────────┼───────────┐
         ▼          ▼           ▼
   Prometheus     Tempo       Loki
```

The SDK is intentionally layered.

Applications never communicate directly with OpenTelemetry. Instead, they interact with a simplified API that remains stable even as the underlying OpenTelemetry ecosystem evolves.

---

## Design Principles

The SDK follows a number of core design principles.

### Framework Agnostic

The SDK is independent of any web framework.

Applications can use it with:

- Express
- Fastify
- NestJS
- Native HTTP servers
- Background workers
- Message consumers
- Custom TCP servers

### Convention Over Configuration

The SDK automatically performs common observability tasks.

Examples include:

- Creating spans
- Recording exceptions
- Correlating logs
- Propagating context
- Recording metrics

Developers only configure behaviour when customization is required.

### Single Responsibility

Every module has a clearly defined responsibility.

| Module | Responsibility |
|---------|----------------|
| Telemetry | SDK initialization |
| Logger | Structured logging |
| Metrics | Metric creation and recording |
| Tracing | Span management |
| Context | Request context propagation |
| HTTP | HTTP request instrumentation |
| RabbitMQ | Messaging instrumentation |
| Database | Database lifecycle instrumentation |
| SMPP | SMPP protocol instrumentation |

### Consistent Architecture

Every transport integration follows the same internal structure.

```
constants.ts

↓

types.ts

↓

metrics.ts

↓

logger.ts

↓

lifecycle.ts
```

This makes the SDK predictable and easy to extend.

---

## Requirements

- Node.js 20 or later
- npm
- OpenTelemetry Collector
- Grafana (recommended)
- Prometheus (recommended)
- Tempo (recommended)
- Loki (recommended)

The SDK is designed to work with any OpenTelemetry-compatible backend.

---
# Installation

The Pague Telemetry SDK is distributed through GitHub Packages.

Before installing the SDK, ensure you have access to the Pague GitHub Packages registry and an OpenTelemetry Collector available for exporting telemetry.

---

## Prerequisites

The SDK requires:

- Node.js 20 or later
- npm
- Access to GitHub Packages
- OpenTelemetry Collector
- A telemetry backend

The recommended observability stack is:

- OpenTelemetry Collector
- Grafana
- Prometheus
- Tempo
- Loki

---

## Configure GitHub Packages

Configure npm to use the GitHub registry for the Pague packages.

```text
@pague-co-uk:registry=https://npm.pkg.github.com
```

Authenticate with GitHub.

```bash
npm login \
    --scope=@pague-co-uk \
    --auth-type=legacy \
    --registry=https://npm.pkg.github.com
```

---

## Install

```bash
npm install @pague-co-uk/sms-gateway-telemetry
```

Install a specific version.

```bash
npm install @pague-co-uk/sms-gateway-telemetry@1.0.0
```

Upgrade to the latest version.

```bash
npm install @pague-co-uk/sms-gateway-telemetry@latest
```

---

## Verify Installation

Import the SDK.

```ts
import {
    initTelemetry,
} from '@pague-co-uk/sms-gateway-telemetry';
```

If TypeScript resolves the package successfully, installation is complete.

---

# Quick Start

The SDK should be initialized before your application begins accepting requests.

Importing the package is side-effect free: it does not create telemetry
resources, register exporters, or install process handlers. `initTelemetry()`
is the single initialization entry point; integration metrics are created only
when first used after initialization.

The initialization process creates:

- OpenTelemetry SDK
- Exporters
- Logger
- Meter
- Tracer
- Resource metadata

Only one telemetry instance should exist within a process.

---

## Initialize Telemetry

```ts
import {
    initTelemetry,
} from '@pague-co-uk/sms-gateway-telemetry';

import packageJson from '../package.json';

initTelemetry({

    service: {

        name: 'control-plane-api',

        version: packageJson.version,

    },

    collector: {

        tracesEndpoint:
            'http://localhost:4318/v1/traces',

        metricsEndpoint:
            'http://localhost:4318/v1/metrics',

    },

    metrics: {

        exportIntervalMillis: 10000,

    },

    logger: {

        level: 'info',

    },

});
```

Telemetry should always be initialized before:

- Express
- Fastify
- NestJS
- RabbitMQ consumers
- SMPP servers
- Background workers

---

## Verify Logging

Retrieve the application logger.

```ts
import {
    getLogger,
} from '@pague-co-uk/sms-gateway-telemetry';

const logger = getLogger();
```

Write a log.

```ts
logger.info(
    'Application started',
);
```

Example output.

```json
{
    "service":"control-plane-api",
    "version":"1.0.0",
    "traceId":"f7f9...",
    "spanId":"3a1b...",
    "msg":"Application started"
}
```

Notice that:

- Service information is added automatically.
- Trace identifiers are added automatically.
- Context information is added automatically whenever available.

---

## Verify Metrics

Create a counter.

```ts
import {
    createCounterMetric,
} from '@pague-co-uk/sms-gateway-telemetry';

const requests =
    createCounterMetric({

        name:
            'app.requests.total',

        description:
            'Application requests',

    });
```

Increment the counter.

```ts
requests.increment();
```

Or increment with attributes.

```ts
requests.increment({

    endpoint: '/',

    method: 'GET',

});
```

Verify that the metric appears in Prometheus.

```promql
app_requests_total
```

---

## Verify Tracing

Create a span.

```ts
import {
    withPromiseSpan,
} from '@pague-co-uk/sms-gateway-telemetry';

await withPromiseSpan(

    'Example Operation',

    async () => {

        // Business logic

    },

);
```

The SDK automatically:

- Starts the span
- Makes it active
- Records exceptions
- Ends the span

The completed trace should appear in Grafana Tempo.

---

## Verify Context Propagation

Create request context.

```ts
import {

    updateContext,

} from '@pague-co-uk/sms-gateway-telemetry';

updateContext({

    requestId: 'request-123',

    correlationId: 'correlation-123',

    tenantId: 'tenant-a',

    clientId: 'client-a',

});
```

Subsequent logs automatically include the context.

```ts
const logger = getLogger();

logger.info(
    'Processing request',
);
```

Produces

```json
{
    "requestId":"request-123",
    "correlationId":"correlation-123",
    "tenantId":"tenant-a",
    "clientId":"client-a",
    "traceId":"...",
    "spanId":"...",
    "msg":"Processing request"
}
```

The active trace is enriched with the same information automatically.

---

## Complete Example

The following example demonstrates logging, metrics, tracing and context propagation working together.

```ts
import {

    initTelemetry,

    getLogger,

    createCounterMetric,

    updateContext,

    withPromiseSpan,

} from '@pague-co-uk/sms-gateway-telemetry';

initTelemetry({

    service: {

        name: 'control-plane-api',

        version: '1.0.0',

    },

    collector: {

        tracesEndpoint:
            'http://localhost:4318/v1/traces',

        metricsEndpoint:
            'http://localhost:4318/v1/metrics',

    },

    metrics: {

        exportIntervalMillis: 10000,

    },

});

const logger = getLogger();

const requests =
    createCounterMetric({

        name:
            'app.requests.total',

    });

updateContext({

    requestId: 'req-123',

    tenantId: 'tenant-a',

});

await withPromiseSpan(

    'Process Request',

    async () => {

        requests.increment();

        logger.info(
            'Request received',
        );

    },

);
```

This single example demonstrates the core SDK capabilities working together.

---

# Configuration

All SDK configuration is supplied through `initTelemetry()`.

```ts
initTelemetry({

    service: {},

    collector: {},

    metrics: {},

    logger: {},

    instrumentations: {},

});
```

Each section controls a specific part of the SDK.

## Service

Identifies the running application.

```ts
service: {

    name: 'control-plane-api',

    version: packageJson.version,

}
```

| Property | Required | Description |
|----------|----------|-------------|
| name | Yes | Logical service name |
| version | Yes | Service version |

Recommended service names:

- control-plane-api
- ingestion-api
- sms-worker
- smpp-server
- rabbitmq-consumer

---

## Collector

Defines where telemetry is exported.

```ts
collector: {

    tracesEndpoint:
        'http://otel-collector:4318/v1/traces',

    metricsEndpoint:
        'http://otel-collector:4318/v1/metrics',

}
```

| Property | Required |
|----------|----------|
| tracesEndpoint | Yes |
| metricsEndpoint | Yes |

---

## Metrics

```ts
metrics: {

    exportIntervalMillis: 10000,

}
```

Recommended values:

Development

```
10000
```

Production

```
5000
```

High-throughput services

```
2000
```

---

## Logger

```ts
logger: {

    level: 'info',

    transport: {

        stdout: true,

        file: {

            enabled: true,

            path: './logs/application.log',

        },

    },

}
```

Supported log levels:

- trace
- debug
- info
- warn
- error
- fatal

---

## Instrumentations

```ts
instrumentations: {

    disableFs: true,

}
```

Filesystem instrumentation is generally disabled in production because it produces a large number of low-value spans.

---
# Core APIs

The SDK is organized into five core modules that work together to provide complete observability.

```
Telemetry
      │
      ▼
Context
      │
      ▼
 ┌───────────────┬───────────────┬───────────────┐
 ▼               ▼               ▼
Logger        Metrics         Tracing
```

Most applications only need to initialize telemetry once and then use these modules throughout the application.

---

# Telemetry

The Telemetry module is responsible for initializing and shutting down the SDK.

Applications should initialize telemetry exactly once during startup.

## initTelemetry()

Initializes the SDK.

```ts
import {
    initTelemetry,
} from '@pague-co-uk/sms-gateway-telemetry';

initTelemetry({
    service: {
        name: 'control-plane-api',
        version: '1.0.0',
    },
    collector: {
        tracesEndpoint:
            'http://localhost:4318/v1/traces',

        metricsEndpoint:
            'http://localhost:4318/v1/metrics',
    },
    metrics: {
        exportIntervalMillis: 10000,
    },
});
```

This method initializes:

- OpenTelemetry SDK
- Resource metadata
- Logger
- Meter Provider
- Tracer Provider
- Metric Exporter
- Trace Exporter
- Automatic Instrumentations

Call this method before creating your application.

---

## shutdownTelemetry()

Gracefully shuts down the SDK.

This flushes pending metrics and traces before the application exits.

```ts
import {
    shutdownTelemetry,
} from '@pague-co-uk/sms-gateway-telemetry';

await shutdownTelemetry();
```

This is recommended when handling process shutdown.

```ts
process.on(
    'SIGTERM',
    async () => {

        await shutdownTelemetry();

        process.exit(0);

    },
);
```

---

# Logging

The SDK uses Pino for structured logging.

Every log entry is automatically enriched with:

- Service name
- Service version
- Trace ID
- Span ID
- Request ID
- Correlation ID
- Tenant ID
- Client ID

when available.

---

## getLogger()

Returns the application logger.

```ts
import {
    getLogger,
} from '@pague-co-uk/sms-gateway-telemetry';

const logger = getLogger();

logger.info(
    'Application started',
);
```

---

## createChildLogger()

Creates a logger with additional context.

```ts
const paymentLogger =
    createChildLogger({

        component:
            'payments',

    });

paymentLogger.info(
    'Payment received',
);
```

Every log produced by the child logger automatically includes the supplied fields.

---

## getComponentLogger()

Creates a logger dedicated to a specific component.

```ts
const logger =
    getComponentLogger(
        'rabbitmq',
    );

logger.info(
    'Consumer started',
);
```

Component loggers are used internally by the SDK and can also be used by applications.

---

## Logging Errors

Errors should be logged as structured objects.

```ts
try {

    await sendSms();

}
catch (error) {

    logger.error(

        {

            err: error,

            destination:
                '+265991234567',

        },

        'SMS delivery failed',

    );

}
```

Avoid string interpolation.

Good

```ts
logger.info({

    customerId,

    route,

});
```

Avoid

```ts
logger.info(
    `Customer ${customerId}`,
);
```

---

# Context

The Context module provides request-scoped information using AsyncLocalStorage.

Once context has been established it automatically becomes available to:

- Logger
- Metrics
- Tracing

Applications rarely need to manually pass request IDs or correlation IDs through function calls.

---

## updateContext()

Updates the current request context.

```ts
updateContext({

    requestId:
        'req-123',

    correlationId:
        'corr-123',

    tenantId:
        'tenant-a',

    clientId:
        'client-a',

});
```

Subsequent logs automatically include these values.

---

## currentContext()

Returns the current context.

```ts
const context =
    currentContext();

console.log(
    context.requestId,
);
```

Returns

```ts
{

    requestId,

    correlationId,

    tenantId,

    clientId,

}
```

---

## clearCurrentContext()

Removes the active request context.

Normally this is handled automatically by the HTTP middleware.

Applications rarely need to call this manually.

---

## withContext()

Runs synchronous code within a specific request context.

```ts
withContext(

    {

        requestId:
            'req-1',

    },

    () => {

        logger.info(
            'Inside context',
        );

    },

);
```

---

## withContextAsync()

Runs asynchronous code inside a request context.

```ts
await withContextAsync(

    {

        tenantId:
            'tenant-a',

    },

    async () => {

        await processJob();

    },

);
```

---

# Metrics

The Metrics module provides simplified wrappers around OpenTelemetry metrics.

Applications never interact directly with the OpenTelemetry Meter API.

---

## Counter Metrics

Used for values that only increase.

Examples

- HTTP requests
- RabbitMQ publishes
- SMPP messages
- Database queries

Create a counter.

```ts
const requests =
    createCounterMetric({

        name:
            'http.requests.total',

        description:
            'HTTP requests',

    });
```

Increment.

```ts
requests.increment();
```

Increment with attributes.

```ts
requests.increment({

    method: 'GET',

    endpoint: '/',

});
```

---

## Histogram Metrics

Used for durations and measurements.

Create a histogram.

```ts
const duration =
    createHistogramMetric({

        name:
            'http.request.duration',

        unit: 'ms',

    });
```

Record.

```ts
duration.record(
    25,
);
```

With attributes.

```ts
duration.record(

    25,

    {

        endpoint: '/',

    },

);
```

---

## Observable Gauges

Observable gauges measure values that are observed rather than incremented.

Examples

- Memory usage
- CPU usage
- Queue depth
- Active connections obtained from another source

```ts
const gauge =
    createGaugeMetric(

        {

            name:
                'system.memory',

        },

        () => process.memoryUsage().heapUsed,

    );
```

---

## UpDownCounter Metrics

Used for values that both increase and decrease.

Examples

- Active HTTP requests
- Active RabbitMQ consumers
- Active SMPP sessions
- Active database connections

```ts
const sessions =
    createUpDownCounterMetric({

        name:
            'smpp.sessions.active',

    });
```

Increment.

```ts
sessions.increment();
```

Decrement.

```ts
sessions.decrement();
```

Add an arbitrary value.

```ts
sessions.add(
    5,
);
```

---

# Metric Naming

Recommended naming convention.

```
http.requests.total

http.request.duration

rabbitmq.messages.published

database.query.duration

smpp.sessions.active
```

Avoid embedding identifiers such as:

- phone numbers
- message IDs
- customer IDs

These create high-cardinality metrics and reduce Prometheus performance.

---
# Tracing

The Tracing module provides a simplified API for distributed tracing built on top of OpenTelemetry.

Applications do not interact directly with the OpenTelemetry tracing API. Instead, they use helper functions that automatically manage span creation, activation, completion, exception recording, and context propagation.

Every span created by the SDK automatically participates in distributed tracing.

---

## What is a Trace?

A trace represents the complete lifecycle of a request as it travels through one or more services.

Example:

```
HTTP API

    │

    ▼

Database

    │

    ▼

RabbitMQ

    │

    ▼

Worker

    │

    ▼

SMPP Server
```

Each operation creates one or more spans.

Together those spans form a complete trace.

---

## What is a Span?

A span represents a single unit of work.

Typical spans include:

- Processing an HTTP request
- Validating a request
- Executing a database query
- Publishing a RabbitMQ message
- Consuming a queue message
- Sending a Submit_SM
- Calling an external REST API

Every span contains:

- Name
- Start time
- End time
- Duration
- Status
- Attributes
- Events
- Parent span
- Trace ID
- Span ID

---

## withActiveSpan()

Creates and activates a synchronous span.

```ts
withActiveSpan(

    'Validate Request',

    (span) => {

        span.setAttribute(
            'customer.id',
            customerId,
        );

        validate();

    },

);
```

The SDK automatically:

- Starts the span
- Makes it active
- Records exceptions
- Ends the span

---

## withPromiseSpan()

Creates an asynchronous span.

This is the most commonly used tracing helper.

```ts
await withPromiseSpan(

    'Process Payment',

    async () => {

        await savePayment();

        await publishEvent();

    },

);
```

Nested spans automatically become child spans.

```ts
await withPromiseSpan(

    'Process Order',

    async () => {

        await withPromiseSpan(

            'Validate',

            async () => {

            },

        );

        await withPromiseSpan(

            'Save Database',

            async () => {

            },

        );

    },

);
```

Produces

```
Process Order

├── Validate

└── Save Database
```

---

## withObservableSpan()

Creates a span around an RxJS Observable.

```ts
return withObservableSpan(

    'Process Messages',

    source$,

);
```

The span remains active until:

- Observable completes
- Observable errors
- Subscription is cancelled

---

## startSpan()

Creates a span manually.

```ts
const span =
    startSpan(
        'Generate Report',
    );
```

This is intended for advanced scenarios.

---

## finishSpan()

Ends a manually created span.

```ts
finishSpan(
    span,
);
```

---

## failSpan()

Marks a span as failed and records the supplied exception.

```ts
try {

}
catch (error) {

    failSpan(
        span,
        error,
    );

}
```

---

## Span Attributes

Attributes describe the work performed by a span.

```ts
await withPromiseSpan(

    'Send SMS',

    async (span) => {

        span.setAttributes({

            tenantId,

            clientId,

            route,

        });

    },

);
```

Attributes make traces searchable in Grafana Tempo.

Good attributes include:

- tenantId
- clientId
- route
- queue
- endpoint
- method
- statusCode

Avoid:

- passwords
- access tokens
- message payloads
- phone numbers
- large objects

---

## Span Events

Events record important milestones during execution.

```ts
span.addEvent(
    'Validation completed',
);
```

Examples:

- Authentication succeeded
- Retry started
- Message published
- Queue received
- SMPP Bind successful

Events appear in the span timeline.

---

## Exception Recording

Exceptions are recorded automatically when using:

- withActiveSpan()
- withPromiseSpan()
- withObservableSpan()

Manual recording is also supported.

```ts
recordException(
    error,
);
```

---

## Active Span

Retrieve the active span.

```ts
const span =
    getActiveSpan();
```

Useful when extending an existing trace.

---

## Trace Correlation

Every log generated inside an active span automatically contains:

- traceId
- spanId

Example

```json
{
    "traceId":"c66d...",
    "spanId":"9ab4...",
    "msg":"Publishing message"
}
```

This allows logs and traces to be correlated directly from Grafana.

---

# Automatic Context Enrichment

The Context module automatically enriches active spans.

```ts
updateContext({

    requestId:
        'req-123',

    tenantId:
        'tenant-a',

    clientId:
        'client-a',

});
```

Every subsequently created span automatically includes:

- requestId
- correlationId
- tenantId
- clientId

Applications do not need to manually attach these attributes.

---

# Best Practices

Use meaningful span names.

Good

```
Process Payment

Publish RabbitMQ Message

Save Database

Send Submit_SM
```

Avoid

```
handler

function

process

operation
```

Keep spans focused.

Each span should represent a single logical unit of work.

Prefer `withPromiseSpan()` for asynchronous operations.

Reserve manual span management for advanced scenarios.

---

# Context Flow

```
Incoming Request

        │

        ▼

Context Created

        │

        ▼

Root Span Started

        │

        ▼

Application Logic

        │

        ├────────► Database Span

        │

        ├────────► RabbitMQ Span

        │

        └────────► SMPP Span

        │

        ▼

Span Ends

        │

        ▼

OpenTelemetry Collector

        │

        ▼

Grafana Tempo
```

---

# Summary

The Tracing module provides:

- Automatic span lifecycle management
- Distributed tracing
- Nested spans
- Exception recording
- Context propagation
- Span attributes
- Span events
- Trace correlation
- OpenTelemetry compatibility

Applications interact with a simple, consistent API while the SDK manages the complexity of OpenTelemetry.
# Built-in Integrations

The SDK provides transport-specific integrations that combine logging, metrics, tracing and context propagation into a single lifecycle.

Instead of manually instrumenting every request or message, applications use the provided integration module and the SDK automatically performs the required observability operations.

Currently supported integrations are:

- HTTP
- RabbitMQ
- Database
- SMPP

Each integration follows the same architecture.

```
Incoming Operation

        │

        ▼

Create Context

        │

        ▼

Start Span

        │

        ▼

Record Metrics

        │

        ▼

Structured Logging

        │

        ▼

Business Logic

        │

        ▼

Complete Span

        │

        ▼

Export Telemetry
```

---

# HTTP Integration

The HTTP integration instruments incoming HTTP requests.

Supported frameworks include:

- Express
- Fastify
- NestJS (through middleware)

## Register Middleware

```ts
import express from 'express';

import {

    createHttpMiddleware,

} from '@pague-co-uk/sms-gateway-telemetry';

const app = express();

app.use(
    createHttpMiddleware(),
);
```

Register the middleware before defining routes.

```ts
app.use(
    createHttpMiddleware(),
);

app.use(routes);
```

---

## What Happens Automatically?

For every incoming request the SDK:

- Creates request context
- Creates a request ID
- Creates a correlation ID
- Starts an HTTP span
- Records request metrics
- Logs request start
- Logs request completion
- Records exceptions
- Ends the span

Applications only implement business logic.

---

## Example

```ts
app.get(

    '/messages',

    async (_, res) => {

        const logger =
            getLogger();

        logger.info(
            'Retrieving messages',
        );

        res.json([]);

    },

);
```

No additional instrumentation is required.

---

## HTTP Metrics

Automatically recorded metrics include:

```
http.requests.total

http.request.duration

http.requests.active
```

---

## HTTP Span Attributes

Automatically recorded attributes include:

```
http.method

http.route

http.url

http.scheme

http.host

http.client_ip

http.status_code
```

---

## Response Headers

Every response automatically includes:

```
X-Request-ID

X-Correlation-ID
```

These identifiers can be used when troubleshooting production issues.

---

# RabbitMQ Integration

The RabbitMQ integration provides observability for both publishers and consumers.

The SDK automatically propagates tracing and request context through RabbitMQ headers.

```
Producer

    │

    ▼

RabbitMQ

    │

    ▼

Consumer
```

The consumer continues the original distributed trace.

---

## Publishing Messages

```ts
await instrumentPublish(

    {

        exchange: 'sms',

        routingKey: 'submit',

    },

    async () => {

        channel.publish(...);

    },

);
```

The SDK automatically:

- Creates a publish span
- Records metrics
- Logs publishing
- Injects trace context
- Injects request context
- Records failures

---

## Consuming Messages

```ts
await instrumentConsume(

    {

        exchange: 'sms',

        routingKey: 'submit',

    },

    async () => {

        await processMessage();

    },

);
```

The SDK automatically:

- Extracts trace context
- Extracts request context
- Continues the distributed trace
- Records metrics
- Logs processing
- Records failures

---

## RabbitMQ Metrics

Automatically recorded metrics include:

```
rabbitmq.messages.published

rabbitmq.messages.consumed

rabbitmq.publish.duration

rabbitmq.consume.duration

rabbitmq.active.consumers
```

---

## RabbitMQ Context Propagation

The SDK automatically propagates:

```
traceparent

tracestate

requestId

correlationId

tenantId

clientId
```

Applications do not need to manually add message headers.

---

# Database Integration

The Database integration instruments database operations regardless of the underlying database library.

Supported databases include:

- MySQL
- PostgreSQL
- MariaDB
- SQL Server

Supported ORMs include:

- Prisma
- TypeORM
- Knex
- mysql2

---

## Instrument a Query

```ts
await instrumentDatabase(

    {

        operation:
            'SELECT',

        table:
            'messages',

    },

    async () => {

        return prisma.message.findMany();

    },

);
```

---

## Automatic Features

The SDK automatically:

- Creates spans
- Records execution time
- Records failures
- Logs execution
- Records query duration metrics

---

## Database Metrics

```
database.queries.total

database.query.duration

database.active.connections
```

---

## Span Attributes

```
database.system

database.operation

database.table

database.statement
```

Sensitive values should never be recorded.

Applications should avoid storing:

- passwords
- access tokens
- personal information

inside span attributes.

---

# SMPP Integration

The SMPP integration instruments SMS gateway operations.

Supported protocol operations include:

- Bind Receiver
- Bind Transmitter
- Bind Transceiver
- Submit_SM
- Deliver_SM
- Enquire_Link
- Unbind

---

## Session Lifecycle

```
Connecting

      │

      ▼

Connected

      │

      ▼

Bound

      │

      ▼

Unbound

      │

      ▼

Closed
```

The SDK automatically records:

- Active sessions
- Session logs
- Session spans

---

## Instrument a PDU

```ts
await instrumentPdu(

    {

        session,

        pdu,

    },

    async () => {

        await processSubmitSm();

    },

);
```

The SDK automatically:

- Creates spans
- Records metrics
- Logs processing
- Records duration
- Records failures

---

## SMPP Metrics

```
smpp.bind.total

smpp.bind.failed

smpp.submit.total

smpp.submit.failed

smpp.deliver.total

smpp.deliver.failed

smpp.enquire_link.total

smpp.unbind.total

smpp.sessions.active

smpp.pdu.duration
```

---

## SMPP Span Attributes

```
smpp.command

smpp.session.id

smpp.system.id

smpp.sequence.number

smpp.message.id
```

---

# End-to-End Flow

The following example illustrates a complete request flowing through multiple integrations.

```
HTTP Request

      │

      ▼

HTTP Middleware

      │

      ▼

Business Logic

      │

      ├────────► Database

      │

      ├────────► RabbitMQ Publish

      │

      ▼

RabbitMQ Consumer

      │

      ▼

SMPP Submit_SM

      │

      ▼

OpenTelemetry Collector

      │

      ├────────► Prometheus

      ├────────► Tempo

      └────────► Loki
```

Although the request traverses multiple protocols, the SDK maintains:

- A single distributed trace
- Correlated structured logs
- Shared request context
- Consistent metrics

This provides complete end-to-end observability across the entire application without requiring developers to manually instrument each component.
# Best Practices

Following these recommendations will help you produce useful telemetry while minimizing overhead and ensuring consistent observability across services.

---

## Initialize Telemetry Once

Initialize the SDK exactly once during application startup.

Good

```ts
initTelemetry(configuration);

const app = express();

app.listen(3000);
```

Avoid

```ts
app.use((req, res, next) => {

    initTelemetry(configuration);

    next();

});
```

Telemetry should never be initialized per request.

---

## Use Structured Logging

Always log structured objects instead of formatted strings.

Good

```ts
logger.info({

    customerId,

    route,

    operation: 'Send SMS',

});
```

Avoid

```ts
logger.info(
    `Customer ${customerId} sent SMS`,
);
```

Structured logs are searchable, filterable and easier to correlate with traces.

---

## Use Meaningful Span Names

Good

```
Process Payment

Submit SMPP Message

Publish RabbitMQ Message

Validate Request

Store Database Record
```

Avoid

```
handler

task

process

operation

function
```

Span names should clearly describe the work being performed.

---

## Keep Spans Small

Each span should represent one logical operation.

Good

```
Process Request

├── Validate Input

├── Save Database

└── Publish RabbitMQ
```

Avoid creating one large span for an entire application workflow.

---

## Record Useful Attributes

Attributes should help identify the operation.

Good

```
tenantId

clientId

queue

exchange

route

http.method

database.table

database.operation

smpp.command
```

Avoid

```
password

accessToken

refreshToken

phoneNumber

messageBody

personal information
```

Never record secrets or sensitive customer data.

---

## Avoid High-Cardinality Metrics

Metrics should use a small number of possible label values.

Good

```
endpoint

method

status

queue

exchange

operation
```

Avoid

```
requestId

messageId

phoneNumber

customerId

timestamp
```

High-cardinality metrics reduce Prometheus performance and increase storage requirements.

---

## Reuse Metric Instances

Create metrics once and reuse them throughout the application.

Good

```ts
const requests =
    createCounterMetric({

        name:
            'http.requests.total',

    });

requests.increment();
```

Avoid

```ts
createCounterMetric({

    name:
        'http.requests.total',

}).increment();
```

inside request handlers.

---

## Prefer Lifecycle Helpers

Use the SDK lifecycle helpers whenever possible.

Instead of manually:

- Starting spans
- Recording metrics
- Logging
- Recording failures

use the supplied integration helpers.

Good

```ts
await instrumentDatabase(

    context,

    async () => {

        return prisma.user.findMany();

    },

);
```

Avoid manually reproducing the same instrumentation.

---

## Let the SDK Propagate Context

Do not manually pass request identifiers through every function.

Good

```ts
updateContext({

    requestId,

    tenantId,

});
```

Every subsequent log, metric and span automatically receives the context.

---

## Shut Down Gracefully

Flush telemetry before the application exits.

```ts
process.on(

    'SIGTERM',

    async () => {

        await shutdownTelemetry();

        process.exit(0);

    },

);
```

This prevents loss of metrics and traces.

---

# Troubleshooting

## No Logs

Verify that:

- `initTelemetry()` is called before creating the application.
- The configured log level allows the log message.
- The logger transport is correctly configured.

---

## No Metrics

Verify:

```
Application

    │

    ▼

OTLP Metric Exporter

    │

    ▼

OpenTelemetry Collector

    │

    ▼

Prometheus
```

Confirm that Prometheus can scrape the Collector.

---

## No Traces

Verify:

```
Application

    │

    ▼

OTLP Trace Exporter

    │

    ▼

OpenTelemetry Collector

    │

    ▼

Tempo
```

Ensure the trace exporter endpoint matches the Collector configuration.

---

## Missing Request IDs

Ensure the HTTP middleware is registered before any routes.

Correct

```ts
app.use(
    createHttpMiddleware(),
);

app.use(routes);
```

Incorrect

```ts
app.use(routes);

app.use(
    createHttpMiddleware(),
);
```

---

## RabbitMQ Messages Do Not Continue the Trace

Ensure both the publisher and consumer use the SDK instrumentation.

The SDK automatically injects and extracts:

```
traceparent

tracestate

requestId

correlationId

tenantId

clientId
```

If instrumentation is bypassed, distributed traces cannot continue across services.

---

## Database Queries Missing From Traces

Ensure database operations are executed through the SDK lifecycle helper.

Correct

```ts
await instrumentDatabase(

    context,

    async () => {

        return prisma.user.findMany();

    },

);
```

---

## SMPP Sessions Not Appearing

Ensure sessions are connected and disconnected using the SDK session lifecycle.

This automatically updates:

- Active session metrics
- Session logs
- Session tracing

---

# Roadmap

The SDK currently provides first-class support for:

- Logging
- Metrics
- Tracing
- Context propagation
- HTTP
- RabbitMQ
- Database
- SMPP

Future releases are expected to include:

- NestJS decorators
- Redis instrumentation
- Kafka instrumentation
- Cron job instrumentation
- Worker lifecycle instrumentation
- SMTP instrumentation
- WebSocket instrumentation
- OTLP log export
- Health check instrumentation
- Automatic retry instrumentation
- Additional framework integrations

---

# Contributing

Contributions are welcome.

When contributing:

- Follow the existing project structure.
- Maintain TypeScript strict mode compatibility.
- Add unit tests where appropriate.
- Update documentation for public API changes.
- Follow the established lifecycle architecture for new integrations.

Every new integration should follow the standard SDK module structure:

```
constants.ts

↓

types.ts

↓

metrics.ts

↓

logger.ts

↓

lifecycle.ts
```

This ensures consistency across all integrations.

---

# License

Copyright © Pague.

Licensed under the terms specified by the project license.

---

# Summary

The Pague Telemetry SDK provides a unified, production-ready observability solution for Node.js applications.

By abstracting OpenTelemetry behind a consistent and opinionated API, the SDK enables developers to instrument applications with minimal code while maintaining comprehensive observability across logs, metrics and traces.

With built-in support for HTTP, RabbitMQ, Database and SMPP workloads, the SDK provides end-to-end visibility into distributed systems while remaining framework independent and fully OpenTelemetry compatible.
