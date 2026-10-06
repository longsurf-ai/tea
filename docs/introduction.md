---
title: Introduction
slug: /
---

Tea is a programming language to run computation over data streams.
It can be used to express arbitrary computation where output is a function of the current input and previous inputs.

What this means is that Tea can be used to build:

* **Technical Indicators**: market data are combined and transformed into signals
* **Trading Strategies (coming soon)**: backtesting and live trading workflows are not yet available
* **Market Scanner (coming soon)**: live scanning is not yet available
* **Alerts**: a Tea script can be used to set up alerts that trigger external event (e.g., AI agents)
* **Time Series Prediction**: a Tea script can be used to model time series and automatically estimate the best parameters

what sets Tea apart from other solutions are:

1. **Tea is easy**: It's reallt easy to write and understand a Tea script, making it token-efficient for agent to write complex time series analysis without worrying about wiring data or sets up bespoke control flows. See [program structure](language-guide/program-structure.md)
2. **Tea is fast**: Tea is purposedly built for handling time series, where memory copy are avoided as much as possible (hint: we love [Arrow](https://arrow.apache.org/)).
3. **Tea is secure**: There's no network or file system access capability built into Tea, making it easy to share and trust other people/agent's code.
4. **Tea is extensible**: Despite not being a GPPL, Tea supports structs, collection types, interfaces, just as any high level programming language. The only limitation is that it doesn't support recursion.
5. **Tea is open source**: Tea is released under the [MIT License](https://github.com/longsurf-ai/tea/blob/main/LICENSE), allowing anyone to build on top of it. Third-party notices are retained in [LICENSES/](https://github.com/longsurf-ai/tea/tree/main/LICENSES).
6. **Tea runs on GPU**: This is still experimental, but Tea programs can be compiled into webGPU kernels that leverages any GPU from any platform to accelerate your strategy searching, parameter fitting, etc.


## Getting started

If you're new to Tea, let's start with [a small program](language-guide/program-structure.md).
We'll walk through it together, from the inputs it reads to the results it produces.

Then take a look at the [execution model](language-guide/execution-model.md).
We'll follow a few rows of price data through a program and see how Tea keeps
track of earlier values as new data arrives.



## Language Guide

Use the guide below when you have a specific question, whether that's how to
remember a value between bars or bring another symbol into a calculation.
Feel free to jump straight to the part you need.

| Task                                                               | Read                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Variables, types, reassignment, functions, loops                   | [Values and control flow](language-guide/values-and-control-flow.md)              |
| Moving averages, crossings, warmup, missing values, retained state | [Time-series calculations](language-guide/time-series.md)                         |
| Plots, named outputs, event conditions and payloads                | [Outputs and events](language-guide/outputs-and-events.md)                        |
| Another symbol or timeframe                                        | [Requests](requests.md)                                                           |
| Reusable source modules                                            | [Imports](imports.md)                                                             |
| Aliasing, collections, history, realtime and rollback              | [Memory model](memory-model.md)                                                   |
| Exact syntax, built-ins, libraries, the `tea` command and the API  | [Reference](reference/overview.md)                                                |
| A complete first program                                           | [Write your first indicator](getting-started/Write%20your%20first%20indicator.md) |


## Contributing

Tea is still taking shape, and we'd love to hear what you're trying to build with
it. If something feels awkward or an example leaves you with questions, please
tell us.

A useful script, a bug report, or a clearer explanation can all help. Code
contributions are welcome too, as are questions and ideas that aren't fully
worked out yet.
