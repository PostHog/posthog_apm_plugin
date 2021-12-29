import { PluginEvent } from '@posthog/plugin-scaffold'

/**
 * The performance data _that is available_ at the point we send the pageview is added
 *
 * The performance propery holds three items.
 * The result of asking window.performance for entries by type of navigation, resource, and paint
 * We cannot guarantee what is available in resource and paint when it runs
 *
 * Navigation will be a list with exactly one `PerformanceEntry` object
 *
 * Each of resource and paint will be a list with zero or more `PerformanceEntry` objects
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType
 */
interface PerformanceSignals {
    navigation: PerformanceNavigationTiming[] // timing about the page
    paint: PerformancePaintTiming[] // timings of paint events
    resource: PerformanceResourceTiming[] // timings of resources loaded
}

export async function processEvent(event: PluginEvent): Promise<PluginEvent> {
    if (event.event !== '$pageview') {
        return event
    }
    if (!event.properties || !event.properties.performance) {
        return event
    }

    const raw_performance = event.properties.performance as PerformanceSignals

    const navTiming = raw_performance.navigation[0]
    event.properties = {
        ...event.properties,
        $performance_domContentLoaded:
            navTiming.domContentLoadedEventEnd - navTiming.startTime,
        $performance_dnsLookupTime:
            navTiming.domainLookupEnd - navTiming.domainLookupStart,
        $performance_connectionTime:
            navTiming.connectEnd - navTiming.connectStart,
        $performance_tlsTime:
            navTiming.secureConnectionStart > 0
                ? navTiming.connectEnd - navTiming.secureConnectionStart
                : 0,
        $performance_fetchTime: navTiming.responseEnd - navTiming.fetchStart,
        $performance_timeToFirstByte:
            navTiming.responseStart - navTiming.requestStart,
        $performance_domReadyState_interactive:
            navTiming.domInteractive - navTiming.startTime,
        $performance_domReadyState_complete:
            navTiming.domComplete - navTiming.startTime,
        $performance_pageLoaded: navTiming.duration,
        $performance_pageSize: navTiming.decodedBodySize,
        $performance_compressedPageSize: navTiming.encodedBodySize,
        $performance_compressionSaving:
            1 - navTiming.encodedBodySize / navTiming.decodedBodySize,
        $performance_raw: raw_performance,
    }

    delete event.properties.performance

    return event
}
