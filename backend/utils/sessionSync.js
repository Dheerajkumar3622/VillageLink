export class SessionSyncCoordinator {
    constructor() {
        this.tabs = new Map();
    }

    registerTab(tabId) {
        this.tabs.set(tabId, { tabId, storage: new Map() });
        console.log(`   [Session Sync] Registered virtual tab: "${tabId}".`);
    }

    updateSession(sourceTabId, key, value) {
        const tab = this.tabs.get(sourceTabId);
        if (!tab) throw new Error(`Tab "${sourceTabId}" not registered.`);

        tab.storage.set(key, value);
        this.tabs.forEach((otherTab, otherTabId) => {
            if (otherTabId !== sourceTabId) {
                otherTab.storage.set(key, value);
            }
        });
        console.log(`   [Session Sync] Broadcast update: Tab "${sourceTabId}" set "${key}" -> replicated globally.`);
    }

    removeSession(sourceTabId, key) {
        const tab = this.tabs.get(sourceTabId);
        if (!tab) throw new Error(`Tab "${sourceTabId}" not registered.`);

        tab.storage.delete(key);
        this.tabs.forEach((otherTab, otherTabId) => {
            if (otherTabId !== sourceTabId) {
                otherTab.storage.delete(key);
            }
        });
        console.log(`   [Session Sync] Broadcast delete: Tab "${sourceTabId}" cleared "${key}" -> purged globally.`);
    }

    getSessionVal(tabId, key) {
        const tab = this.tabs.get(tabId);
        return tab ? tab.storage.get(key) : undefined;
    }
}
