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

export function useYjsStore(roomId: string, opts: { shapeUtils?: TLAnyShapeUtilConstructor[] } = {}) {
    const room = useRoom(); // ← reactive, always has the room from RoomProvider context

    const [store] = useState(() =>
        createTLStore({ shapeUtils: opts.shapeUtils || defaultShapeUtils })
    );

    const [storeWithStatus, setStoreWithStatus] = useState<any>({
        status: "loading",
    });

    useEffect(() => {
        if (!room) return;
        let isUnmounted = false;
        let unsubs: (() => void)[] = [];
        let hasConnected = false;

        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(room as any, yDoc);
        const yMap = yDoc.getMap<TLRecord>(`tl_${room.id}`);

        const handleSync = (isSynced: boolean) => {
            if (isUnmounted) return;
            if (!isSynced || hasConnected) return;
            hasConnected = true;

            const isSyncable = (record: TLRecord) => {
                return [
                    "document",
                    "page",
                    "shape",
                    "asset",
                    "binding"
                ].includes(record.typeName);
            };

            const records = Array.from(yMap.values());

            if (records.length === 0) {
                yDoc.transact(() => {
                    for (const record of store.allRecords()) {
                        if (isSyncable(record)) {
                            yMap.set(record.id, record);
                        }
                    }
                });
            } else {
                store.mergeRemoteChanges(() => {
                    const safeRecords = records.filter(isSyncable);
                    store.put(safeRecords);
                });
            }

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
        };

        yProvider.on("sync", handleSync);
        unsubs.push(() => yProvider.off("sync", handleSync));

        if (yProvider.synced) {
            handleSync(true);
        }

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
    }, [room.id, store]);

    return storeWithStatus;
}