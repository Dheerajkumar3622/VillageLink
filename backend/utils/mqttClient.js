/**
 * MQTT IoT Broker & Client Simulator
 * Handles lightweight telemetry message distribution.
 * Implements W3C topic matching logic supporting single-level wildcards ("+").
 */

export class MqttBroker {
    constructor() {
        this.subscriptions = [];
    }

    /**
     * Translates an MQTT topic filter string containing wildcards into a regular expression
     */
    compileTopicFilterRegex(filter) {
        const escaped = filter.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Replace escaped '+' wildcard with single-level segment match regex
        const regexStr = '^' + escaped.replace(/\\\+/g, '[^\\/]+') + '$';
        return new RegExp(regexStr);
    }

    /**
     * Subscribes a callback to a topic pattern
     */
    subscribe(topicFilter, callback) {
        const regex = this.compileTopicFilterRegex(topicFilter);
        this.subscriptions.push({
            topicFilter,
            regex,
            callback
        });
        console.log(`   [MqttBroker] Subscribed filter: "${topicFilter}"`);
    }

    /**
     * Publishes a telemetry payload to a topic, matching wildcard subscribers
     */
    publish(topic, payload) {
        let matchCount = 0;

        this.subscriptions.forEach(sub => {
            if (sub.regex.test(topic)) {
                matchCount++;
                // Deliver event asynchronously
                setImmediate(() => {
                    sub.callback(topic, payload);
                });
            }
        });

        return {
            topic,
            matches: matchCount
        };
    }

    /**
     * Clears all subscriptions
     */
    clear() {
        this.subscriptions = [];
    }
}
