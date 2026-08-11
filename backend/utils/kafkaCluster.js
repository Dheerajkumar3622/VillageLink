import crypto from 'crypto';

/**
 * Clustered Event Broker (Apache Kafka) Simulator
 * Partitions streams dynamically and distributes events among consumer groups.
 */

export class KafkaCluster {
    constructor() {
        this.topics = new Map();
        this.consumers = new Map(); // topicName -> array of consumers
    }

    /**
     * Registers a topic with partition limits
     */
    createTopic(topicName, partitionCount = 3) {
        const partitions = Array.from({ length: partitionCount }, () => []);
        this.topics.set(topicName, {
            partitionCount,
            partitions
        });
        console.log(`   [KafkaCluster] Registered Topic: "${topicName}" with ${partitionCount} partitions.`);
    }

    /**
     * Registers a consumer instance inside a specific topic's consumer group listener
     */
    registerConsumer(topicName, groupName, consumerId, onMessageFn) {
        let groupList = this.consumers.get(topicName);
        if (!groupList) {
            groupList = [];
            this.consumers.set(topicName, groupList);
        }

        groupList.push({
            groupName,
            consumerId,
            onMessage: onMessageFn
        });

        console.log(`   [KafkaCluster] Consumer "${consumerId}" registered to group "${groupName}" on topic "${topicName}".`);
    }

    /**
     * Publishes an event to a topic, hash-routing by partition key to ensure order persistence per entity
     */
    publishEvent(topicName, key, message) {
        const topic = this.topics.get(topicName);
        if (!topic) {
            throw new Error(`Topic "${topicName}" does not exist.`);
        }

        // 1. Hash partition key deterministically
        const hash = crypto.createHash('md5').update(key).digest('hex');
        const partitionIndex = parseInt(hash.substring(0, 8), 16) % topic.partitionCount;

        // 2. Commit log record
        const logRecord = {
            offset: topic.partitions[partitionIndex].length,
            key,
            message,
            timestamp: Date.now()
        };
        topic.partitions[partitionIndex].push(logRecord);

        // 3. Dispatch to consumers matching this partition assignment
        const groupList = this.consumers.get(topicName) || [];
        if (groupList.length > 0) {
            // Consistent hashing mapping partition indexes to active consumer slots
            const consumerIndex = partitionIndex % groupList.length;
            const consumer = groupList[consumerIndex];
            
            // Deliver event asynchronously
            setImmediate(() => {
                consumer.onMessage({
                    topic: topicName,
                    partition: partitionIndex,
                    offset: logRecord.offset,
                    key,
                    message
                }, consumer.consumerId);
            });
        }

        return {
            partition: partitionIndex,
            offset: logRecord.offset
        };
    }
}
