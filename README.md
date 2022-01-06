# PostHog APM Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg?style=flat-square)](https://opensource.org/licenses/MIT)

When the PostHog JS SDK has the capture performance config active it sends the browser's performance timings in the `$performance` field for `$pageview` events

This plugin processes that raw data into useful performance information

# Why a plugin?

The processing is done here rather than in the SDK so that new transformations and extractions can be added without needing to release a new version of the SDK

```mermaid
sequenceDiagram
    actor SDK
    actor Plugin
    actor Django
    actor Queries
    actor APM Waterfall
    SDK->>Plugin: PageView with<br/> $performance
    Plugin->>Django: PageView with <br/>$performance_pageLoad<br/> and $performance_raw
    note right of Plugin: processing at plugin server <br/>means we only have to change the SDK <br/>if we discover we aren't <br/>gathering enough information
    Django->>Queries: can use <br/>$performance_pageLoad
    Django->>APM Waterfall: can use $performance_raw
```

# References 

Many thanks to https://nicj.net/navigationtiming-in-practice/ and https://nicj.net/resourcetiming-in-practice/ for excellent context in how to use browser performance information
