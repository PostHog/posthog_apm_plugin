import { describe, it } from 'mocha'
import { expect } from 'chai'
import { processEvent } from './index'
import { PluginEvent } from '@posthog/plugin-scaffold'

const anEvent = (
    eventName: string,
    properties: Record<string, any> = {}
): PluginEvent => ({
    event: eventName,
    properties: { something: 'in here', ...properties },
    distinct_id: 'a',
    ip: 'ip',
    site_url: 'url',
    team_id: 1,
    now: 'now',
})

const navigationTimings: PerformanceNavigationTiming[] = [
    {
        name: 'https://the.page.url',
        entryType: 'navigation',
        startTime: 0,
        duration: 1624,
        initiatorType: 'navigation',
        nextHopProtocol: 'h2',
        workerStart: 0,
        redirectStart: 0,
        redirectEnd: 0,
        fetchStart: 6,
        domainLookupStart: 20.299999997019768,
        domainLookupEnd: 65.29999999701977,
        connectStart: 65.29999999701977,
        connectEnd: 158.29999999701977,
        secureConnectionStart: 114.39999999850988,
        requestStart: 158.79999999701977,
        responseStart: 332.19999999925494,
        responseEnd: 340.19999999925494,
        transferSize: 19385,
        encodedBodySize: 19085,
        decodedBodySize: 71868,
        serverTiming: [],
        unloadEventStart: 0,
        unloadEventEnd: 0,
        domInteractive: 1178.5999999977648,
        domContentLoadedEventStart: 1178.7999999970198,
        domContentLoadedEventEnd: 1183.199999999255,
        domComplete: 1623.699999999255,
        loadEventStart: 1623.8999999985099,
        loadEventEnd: 1624,
        type: 'navigate',
        redirectCount: 0,
        toJSON(): any {
            return 'fake stringify'
        },
    },
]

describe('converting window.performance to APM information', () => {
    describe('with a navigation timing present', () => {
        let event
        beforeEach(() => {
            event = anEvent('$pageview', {
                $performance: {
                    navigation: navigationTimings,
                },
            })
        })

        it('can processes performance when present', async () => {
            const actual = await processEvent(event)

            expect(actual.properties).to.have.property(
                '$performance_raw',
                JSON.stringify({
                    navigation: navigationTimings,
                })
            )
            expect(actual.properties).not.to.have.property('$performance')
        })

        it(`can report on page being loaded`, async () => {
            const actual = await processEvent(event)
            expect(actual.properties).to.have.property(
                '$performance_pageLoaded',
                navigationTimings[0].duration
            )
        })
    })

    it("ignores anything that isn't a pageview", async () => {
        const event = anEvent('not a pageview')
        const actual = await processEvent(event)
        expect(actual).to.eql(event)
    })

    it("ignores pageviews that don't have performance", async () => {
        const event = anEvent('$pageview')
        const actual = await processEvent(event)
        expect(actual).to.eql(event)
    })
})
