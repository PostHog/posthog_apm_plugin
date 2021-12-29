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
            return JSON.stringify(this)
        },
    },
]

describe('converting window.performance to APM information', () => {
    describe('with a navigation timing present', () => {
        let event
        beforeEach(() => {
            event = anEvent('$pageview', {
                performance: {
                    navigation: navigationTimings,
                },
            })
        })
        it('can processes performance when present', async () => {
            const actual = await processEvent(event)

            expect(actual.properties).to.have.property('$performance_raw')
            expect(actual.properties).not.to.have.property('performance')
        })

        it('can report on DNS lookup time', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].domainLookupEnd -
                navigationTimings[0].domainLookupStart
            expect(actual.properties).to.have.property(
                '$performance_dnsLookupTime',
                expected
            )
        })

        it('can report on connection time', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].connectEnd -
                navigationTimings[0].connectStart
            expect(actual.properties).to.have.property(
                '$performance_connectionTime',
                expected
            )
        })

        it('can report on TLS connection time', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].connectEnd -
                navigationTimings[0].secureConnectionStart
            expect(actual.properties).to.have.property(
                '$performance_tlsTime',
                expected
            )
        })

        it('can report TLS connection time when not secure', async () => {
            // when http or connection is persistent secureConnectionStart is 0
            event.properties.performance.navigation[0].secureConnectionStart = 0
            const actual = await processEvent(event)

            expect(actual.properties).to.have.property(
                '$performance_tlsTime',
                0
            )
        })

        it('can report on DNS lookup', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].domContentLoadedEventEnd -
                navigationTimings[0].startTime
            expect(actual.properties).to.have.property(
                '$performance_domContentLoaded',
                expected
            )
        })

        it('can report on time spent fetching resources', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].responseEnd -
                navigationTimings[0].fetchStart
            expect(actual.properties).to.have.property(
                '$performance_fetchTime',
                expected
            )
        })

        it('can report on time to first byte', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].responseStart -
                navigationTimings[0].requestStart
            expect(actual.properties).to.have.property(
                '$performance_timeToFirstByte',
                expected
            )
        })

        it('can report on dom ready state interactive', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].domInteractive -
                navigationTimings[0].startTime
            expect(actual.properties).to.have.property(
                '$performance_domReadyState_interactive',
                expected
            )
        })

        it('can report on dom ready state complete', async () => {
            const actual = await processEvent(event)

            const expected =
                navigationTimings[0].domComplete -
                navigationTimings[0].startTime
            expect(actual.properties).to.have.property(
                '$performance_domReadyState_complete',
                expected
            )
        })

        it('can report on page_being_loaded', async () => {
            const actual = await processEvent(event)

            const expected = navigationTimings[0].duration
            expect(actual.properties).to.have.property(
                '$performance_pageLoaded',
                expected
            )
        })

        it('can report on page size', async () => {
            const actual = await processEvent(event)

            expect(actual.properties).to.have.property(
                '$performance_pageSize',
                navigationTimings[0].decodedBodySize
            )

            expect(actual.properties).to.have.property(
                '$performance_compressedPageSize',
                navigationTimings[0].encodedBodySize
            )

            expect(actual.properties)
                .to.have.property('$performance_compressionSaving')
                .that.is.approximately(0.73, 0.01)
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
