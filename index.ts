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

function safePerformancePropertyAddition(
    properties: Record<string, any>,
    navTiming: PerformanceNavigationTiming
): (key: string, performanceCalculation: (nt) => number) => void {
    return (key: string, performanceCalculation: (nt) => number) => {
        try {
            properties[key] = performanceCalculation(navTiming)
        } catch (e) {
            console.log(`could not add performance key ${key}. ${e}`)
        }
    }
}

export async function processEvent(event: PluginEvent): Promise<PluginEvent> {
    if (event.event !== '$pageview') {
        console.debug(`event is ${event.event}. not processing`)
        return event
    }
    if (!event.properties || !event.properties.$performance) {
        console.debug(`event has no performance info. not processing`)
        return event
    }

    const raw_performance = event.properties.$performance as PerformanceSignals

    const navTiming = raw_performance.navigation[0]
    const properties = {
        ...event.properties,
        $performance_raw: JSON.stringify(raw_performance), // stringified so that the UI doesn't try to draw a giant table on the events and actions page
    }

    const addPerformanceProperty = safePerformancePropertyAddition(
        properties,
        navTiming
    )

    addPerformanceProperty('$performance_pageLoaded', (nt) => nt.duration)

    event.properties = properties
    delete event.properties.$performance
    console.debug(`processed pageview event ${event.uuid}`)
    return event
}
