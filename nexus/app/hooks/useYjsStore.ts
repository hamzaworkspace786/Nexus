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

    const [storeWithStatus, setStoreWithStatus] = useState<any>({
        status: "loading",
    });

    useEffect(() => {
        if (!room) return;

        let isUnmounted = false;
        let unsubs: (() => void)[] = [];
        let hasConnected = false;

        // Reset to loading state immediately when room changes
        setStoreWithStatus({ status: "loading" });

        // Create a FRESH store for this specific room
        const store = createTLStore({ shapeUtils: opts.shapeUtils || defaultShapeUtils });

        const yDoc = new Y.Doc();
        
        // Safety check: LiveblocksYjsProvider needs a valid room
        let yProvider: LiveblocksYjsProvider;
        try {
            yProvider = new LiveblocksYjsProvider(room as any, yDoc);
        } catch (e) {
            console.error("Failed to create LiveblocksYjsProvider:", e);
            return;
        }

        const yMap = yDoc.getMap<TLRecord>(`tl_${room.id}`);

        yProvider.on("sync", (isSynced: boolean) => {
            if (isUnmounted) return;
            if (!isSynced || hasConnected) return;
            hasConnected = true;

            // Strict INCLUSION list: Prevents UI state/camera from poisoning the global Yjs state
            const isSyncable = (record: TLRecord) => {
                return [
                    "document",
                    "page",
                    "shape",
                    "asset",
                    "binding"
                ].includes(record.typeName);
            };

            // --- 1. INITIAL SYNC (YJS -> TLDRAW) ---
            const records = Array.from(yMap.values());

            if (records.length === 0) {
                // Brand new room: Push default Tldraw records (filtered)
                yDoc.transact(() => {
                    for (const record of store.allRecords()) {
                        if (isSyncable(record)) {
                            yMap.set(record.id, record);
                        }
                    }
                });
            } else {
                // Existing room: ONLY put safe remote records.
                store.mergeRemoteChanges(() => {
                    const safeRecords = records.filter(isSyncable);
                    store.put(safeRecords);
                });
            }

            // --- 2. ONGOING SYNC (YJS -> TLDRAW) ---
            const handleYMapChange = (
                event: Y.YMapEvent<TLRecord>,
                transaction: Y.Transaction
            ) => {
                if (isUnmounted || transaction.local) return;

                store.mergeRemoteChanges(() => {
                    const toPut: TLRecord[] = [];
                    const toRemove: any[] = [];

                    event.changes.keys.forEach((change, key) => {
                        if (change.action === "add" || change.action === "update") {
                            const record = yMap.get(key);
                            if (record && isSyncable(record)) {
                                toPut.push(record);
                            }
                        } else if (change.action === "delete") {
                            toRemove.push(key);
                        }
                    });

                    if (toPut.length > 0) store.put(toPut);
                    if (toRemove.length > 0) store.remove(toRemove as any);
                });
            };

            yMap.observe(handleYMapChange);
            unsubs.push(() => yMap.unobserve(handleYMapChange));

            // --- 3. LOCAL SYNC (TLDRAW -> YJS) ---
            const unsubStore = store.listen(
                (entry) => {
                    if (entry.source !== "user") return;

                    yDoc.transact(() => {
                        Object.values(entry.changes.added).forEach((record) => {
                            if (isSyncable(record)) yMap.set(record.id, record);
                        });
                        Object.values(entry.changes.updated).forEach(([_, record]) => {
                            if (isSyncable(record)) yMap.set(record.id, record);
                        });
                        Object.values(entry.changes.removed).forEach((record) => {
                            if (isSyncable(record)) yMap.delete(record.id);
                        });
                    });
                },
                { scope: "document" }
            );
            unsubs.push(unsubStore);

            setStoreWithStatus({
                status: "synced-remote",
                connectionStatus: "online",
                store,
            });
        });

        // --- 4. MULTIPLAYER CURSORS (RECEIVE) ---
        const handleUpdate = () => {
            if (isUnmounted) return;
            const states = yProvider.awareness.getStates();
            const presences: TLInstancePresence[] = [];

            states.forEach((state: any, clientId: number) => {
                if (state.presence && clientId !== yDoc.clientID) {
                    presences.push(state.presence);
                }
            });

            if (presences.length > 0) {
                store.mergeRemoteChanges(() => {
                    store.put(presences);
                });
            }
        };

        yProvider.awareness.on("update", handleUpdate);
        unsubs.push(() => yProvider.awareness.off("update", handleUpdate));

        // --- 5. MULTIPLAYER CURSORS (BROADCAST) ---
        const unsubPresence = store.listen(
            (entry) => {
                if (entry.source !== "user") return;

                const presenceChanges = [
                    ...Object.values(entry.changes.added),
                    ...Object.values(entry.changes.updated).map(([_, record]) => record),
                ].filter((record) => record.typeName === "instance_presence") as TLInstancePresence[];

                if (presenceChanges.length > 0) {
                    yProvider.awareness.setLocalStateField("presence", presenceChanges[0] as any);
                }
            },
            { scope: "presence" }
        );
        unsubs.push(unsubPresence);

        return () => {
            isUnmounted = true;
            unsubs.forEach((fn) => fn());
            yProvider.destroy();
            yDoc.destroy();
        };
    }, [room]); // Only depend on room. Store is local to effect now.

    return storeWithStatus;
}