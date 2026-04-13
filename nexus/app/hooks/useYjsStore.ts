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

    const [store] = useState(() =>
        createTLStore({ shapeUtils: opts.shapeUtils || defaultShapeUtils })
    );

    const [storeWithStatus, setStoreWithStatus] = useState<any>({
        status: "loading",
    });

    useEffect(() => {
        let unsubs: (() => void)[] = [];
        let hasConnected = false;

        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(room as any, yDoc);
        const yMap = yDoc.getMap<TLRecord>(`tl_${room.id}`);

        yProvider.on("sync", (isSynced: boolean) => {
            if (!isSynced || hasConnected) return;
            hasConnected = true;

            // --- 1. INITIAL SYNC (YJS -> TLDRAW) ---
            const records = Array.from(yMap.values());

            if (records.length === 0) {
                yDoc.transact(() => {
                    for (const record of store.allRecords()) {
                        yMap.set(record.id, record);
                    }
                });
            } else {
                store.mergeRemoteChanges(() => {
                    store.put(records);
                });
            }

            // --- 2. ONGOING SYNC (YJS -> TLDRAW) ---
            const handleYMapChange = (
                event: Y.YMapEvent<TLRecord>,
                transaction: Y.Transaction
            ) => {
                // CRITICAL FIX: Do not echo local changes back into Tldraw!
                // Only process changes made by other users.
                if (transaction.local) return;

                store.mergeRemoteChanges(() => {
                    const toPut: TLRecord[] = [];
                    const toRemove: TLRecord["id"][] = [];

                    event.changes.keys.forEach((change, key) => {
                        if (change.action === "add" || change.action === "update") {
                            const record = yMap.get(key);
                            if (record) toPut.push(record);
                        } else if (change.action === "delete") {
                            toRemove.push(key as TLRecord["id"]);
                        }
                    });

                    if (toPut.length > 0) store.put(toPut);
                    if (toRemove.length > 0) store.remove(toRemove);
                });
            };

            yMap.observe(handleYMapChange);
            unsubs.push(() => yMap.unobserve(handleYMapChange));

            // --- 3. LOCAL SYNC (TLDRAW -> YJS) ---
            const unsubStore = store.listen(
                (entry) => {
                    if (entry.source !== "user") return;

                    yDoc.transact(() => {
                        Object.values(entry.changes.added).forEach((record) => yMap.set(record.id, record));
                        Object.values(entry.changes.updated).forEach(([_, record]) => yMap.set(record.id, record));
                        Object.values(entry.changes.removed).forEach((record) => yMap.delete(record.id));
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
            unsubs.forEach((fn) => fn());
            yProvider.destroy();
            yDoc.destroy();
        };
    }, [room, store]);

    return storeWithStatus;
}