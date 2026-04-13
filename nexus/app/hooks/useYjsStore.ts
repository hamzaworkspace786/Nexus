import { useEffect, useState } from "react";
import { useRoom } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import * as Y from "yjs";
import {
    createTLStore,
    defaultShapeUtils,
    TLRecord,
    TLInstancePresence,
    TLAnyShapeUtilConstructor
} from "@tldraw/tldraw";

export function useYjsStore(opts: { shapeUtils?: TLAnyShapeUtilConstructor[] } = {}) {
    const room = useRoom();
    const [storeWithStatus, setStoreWithStatus] = useState<any>({ status: "loading" });

    useEffect(() => {
        if (!room) return;

        let isUnmounted = false;
        let hasConnected = false;
        const unsubs: (() => void)[] = [];

        // 1. Setup Store and Yjs
        const store = createTLStore({ shapeUtils: opts.shapeUtils || defaultShapeUtils });
        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(room as any, yDoc);
        const yMap = yDoc.getMap<TLRecord>(`tl_${room.id}`);

        // Helper to check if a record should be synced
        const isSyncable = (record: TLRecord) => {
            return ["document", "page", "shape", "asset", "binding"].includes(record.typeName);
        };

        // 2. Define the Sync Logic
        const handleSync = () => {
            if (isUnmounted || hasConnected) return;
            hasConnected = true;

            // --- Initial Sync: Yjs -> Tldraw ---
            const records = Array.from(yMap.values());
            if (records.length === 0) {
                yDoc.transact(() => {
                    for (const record of store.allRecords()) {
                        if (isSyncable(record)) yMap.set(record.id, record);
                    }
                });
            } else {
                store.mergeRemoteChanges(() => {
                    store.put(records.filter(isSyncable));
                });
            }

            // --- Ongoing Sync: Yjs -> Tldraw ---
            const handleYMapChange = (event: Y.YMapEvent<TLRecord>, transaction: Y.Transaction) => {
                if (transaction.local) return;
                store.mergeRemoteChanges(() => {
                    event.changes.keys.forEach((change, key) => {
                        if (change.action === "add" || change.action === "update") {
                            const record = yMap.get(key);
                            if (record && isSyncable(record)) store.put([record]);
                        } else if (change.action === "delete") {
                            store.remove([key as any]);
                        }
                    });
                });
            };
            yMap.observe(handleYMapChange);
            unsubs.push(() => yMap.unobserve(handleYMapChange));

            // --- Local Sync: Tldraw -> Yjs ---
            const unsubStore = store.listen((entry: any) => {
                if (entry.source !== "user") return;
                yDoc.transact(() => {
                    Object.values(entry.changes.added).forEach((record: any) => {
                        if (isSyncable(record)) yMap.set(record.id, record);
                    });
                    Object.values(entry.changes.updated).forEach(([_, record]: any) => {
                        if (isSyncable(record)) yMap.set(record.id, record);
                    });
                    Object.values(entry.changes.removed).forEach((record: any) => {
                        if (isSyncable(record)) yMap.delete(record.id);
                    });
                });
            }, { scope: "document" });
            unsubs.push(unsubStore);

            // Update UI
            setStoreWithStatus({ status: "synced-remote", store });
        };

        // 3. Define Presence Logic (Cursors)
        const handleUpdate = () => {
            if (isUnmounted) return;
            const states = yProvider.awareness.getStates();
            const presences: TLInstancePresence[] = [];
            states.forEach((state: any, clientId: number) => {
                if (state.presence && clientId !== yDoc.clientID) presences.push(state.presence);
            });
            if (presences.length > 0) {
                store.mergeRemoteChanges(() => store.put(presences));
            }
        };

        const unsubPresence = store.listen((entry: any) => {
            if (entry.source !== "user") return;
            const presenceChanges = [...Object.values(entry.changes.added), ...Object.values(entry.changes.updated).map(([_, record]: any) => record)]
                .filter((r: any) => r.typeName === "instance_presence") as TLInstancePresence[];
            if (presenceChanges.length > 0) {
                yProvider.awareness.setLocalStateField("presence", presenceChanges[0] as any);
            }
        }, { scope: "presence" });

        // 4. Attach Listeners
        yProvider.on("sync", handleSync);
        yProvider.awareness.on("update", handleUpdate);
        unsubs.push(unsubPresence);
        unsubs.push(() => {
            yProvider.off("sync", handleSync);
            yProvider.awareness.off("update", handleUpdate);
        });

        if (yProvider.synced) handleSync();

        return () => {
            isUnmounted = true;
            unsubs.forEach(fn => fn());
            yProvider.destroy();
            yDoc.destroy();
            setStoreWithStatus({ status: "loading" });
        };
    }, [room]);

    return storeWithStatus;
}