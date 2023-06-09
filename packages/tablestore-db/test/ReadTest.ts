import chaiAsPromised from "chai-as-promised";

import type { Suite } from "mocha";
import { expect, assert, use } from "chai";
import { RecordState, databaseSet } from "./Models";
import { expectError } from "./ExceptError";

use(chaiAsPromised);

// eslint-disable-next-line func-names
describe("read test", function (this: Suite): void {
    this.timeout(10 * 60 * 1000);
    describe("different db", (): void => {
        for (const [name, db] of Object.entries(databaseSet)) {
            it(`test accessKeys enums in ${name}`, async (): Promise<void> => {
                await db.model("accessKeys").get.colume("ak").equals("accessKey").result();
            });
            it(`test ${name}`, async (): Promise<void> => {
                if (name == "tablestore") {
                    // tablestore 不需要做这个检测
                    return;
                }
                await expectError("Requested resource not found", async () => {
                    await db.model("apps").get.colume("teamUUID").equals("195")
                    .and.colume("state").equals(RecordState.Active)
                    .results();
                })
            });
            // dynamodb 不支持 sk 多条件查询；>= 和 <= 同时存在时，可以暂时使用 between 替代，其他需要对start end 进行加减
            it(`test multiple condition for sk ${name}`, async (): Promise<void> => {
                const appStateDaySum = db.model("appStateDaySum");
                const sums: any[] = [];
                if (name == "tablestore") {
                    // tablestore 不需要做这个检测
                    return;
                }
                // 没创建表时，这里涉及到的检查，只需要格式正确即可，不需要检查是否存在
                await expectError("Requested resource not found", async () => {
                    await appStateDaySum.get.colume("teamId").equals("xxxxxxxx")
                    .and.colume("appUUID").equals("xxxxx")
                    .and.colume("timestamp").greaterOrEqualsThan(1672531200000)
                    .and.colume("timestamp").lessOrEqualsThan(1675119999999)
                    .slices(10000).resultSlices(async (slices) => {
                        sums.push(...slices);
                    });
                });
                await expectError("Requested resource not found", async () => {
                    await appStateDaySum.get.colume("teamId").equals("xxxxxxxx")
                    .and.colume("appUUID").equals("xxxxx")
                    .and.colume("timestamp").greaterOrEqualsThan(1672531200000)
                    .and.colume("timestamp").lessThan(1675119999999)
                    .slices(10000).resultSlices(async (slices) => {
                        sums.push(...slices);
                    });
                });

                await expectError("Requested resource not found", async () => {
                    await appStateDaySum.get.colume("teamId").equals("xxxxxxxx")
                    .and.colume("appUUID").equals("xxxxx")
                    .and.colume("timestamp").greaterThan(1672531200000)
                    .and.colume("timestamp").lessOrEqualsThan(1675119999999)
                    .slices(10000).resultSlices(async (slices) => {
                        sums.push(...slices);
                    });
                });

                expectError("Requested resource not found", async () => {
                    await appStateDaySum.get.colume("teamId").equals("xxxxxxxx")
                    .and.colume("appUUID").equals("xxxxx")
                    .and.colume("timestamp").greaterThan(1672531200000)
                    .and.colume("timestamp").lessThan(1675119999999)
                    .slices(10000).resultSlices(async (slices) => {
                        sums.push(...slices);
                    });
                });
            });
            it(`test more than 3 pk in ${name}`, async (): Promise<void> => {
                // 测试环境没有建这个表
                // const appRoomSegments = db.model("appRoomSegments");
                // await appRoomSegments.get.colume("teamId").equals("xxxxxxxx")
                // .and.colume("appUUID").equals("xxxxx")
                // .and.colume("segment").greaterOrEqualsThan(1672531200000).and.colume("segment").lessThan(1675119999999).slices(10000).resultSlices(async (slices) => {
                //     console.log(slices);
                // });
            });
            it(`test one pk ${name}`, async (): Promise<void> => {
                if (name !== "dynamodb") {
                    return;
                }
                const sliceBegins = db.model("sliceBegins");
                try {
                    await sliceBegins.get.colume("roomUUID").equals("roomUUID").results();
                } catch (error) {
                    expect(error.name && error.name).equals("ResourceNotFoundException");
                }
            });
            it(`get results basic in ${name}`, async () => {
                const snapshotDB = db.model("snapshots");
                const snapshotModel = {
                    sliceUUID: "slice",
                    timestamp: 1000,
                    frameId: 0,
                    createdAt: 1024,
                };
                await snapshotDB.set.all().deleteAll();
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-1" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-2", timestamp: 2000 });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-3" });

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").equals(2000)
                        .and.colume("roomUUID").equals("room-2").result()
                ))
                    .deep.equals({ ...snapshotModel, roomUUID: "room-2", timestamp: 2000 });

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .and.colume("roomUUID").greaterOrEqualsThan("room-2").results()
                ))
                    .deep.equals([
                        { ...snapshotModel, roomUUID: "room-3", timestamp: 1000 },
                        { ...snapshotModel, roomUUID: "room-2", timestamp: 2000 },
                    ]);

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .ascending().results()
                ))
                    .deep.equals([
                        { ...snapshotModel, roomUUID: "room-1", timestamp: 1000 },
                        { ...snapshotModel, roomUUID: "room-3", timestamp: 1000 },
                        { ...snapshotModel, roomUUID: "room-2", timestamp: 2000 },
                    ]);

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .descending().results()
                ))
                    .deep.equals([
                        { ...snapshotModel, roomUUID: "room-2", timestamp: 2000 },
                        { ...snapshotModel, roomUUID: "room-3", timestamp: 1000 },
                        { ...snapshotModel, roomUUID: "room-1", timestamp: 1000 },
                    ]);

                expect(await snapshotDB.get.all().count()).equals(3);
                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .and.colume("roomUUID").greaterOrEqualsThan("room-2").count()
                )).equals(2);

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .ascending().limit(2)
                        .results()
                ))
                    .deep.equals([
                        { ...snapshotModel, roomUUID: "room-1", timestamp: 1000 },
                        { ...snapshotModel, roomUUID: "room-3", timestamp: 1000 },
                    ]);

                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .descending().limit(1)
                        .results()
                ))
                    .deep.equals([
                        { ...snapshotModel, roomUUID: "room-2", timestamp: 2000 },
                    ]);
            });

            it(`get results splices in ${name}`, async () => {
                const snapshotDB = db.model("snapshots");
                const snapshotModel = {
                    sliceUUID: "slice",
                    timestamp: 1000,
                    frameId: 0,
                    createdAt: 1024,
                };
                await snapshotDB.set.all().deleteAll();
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-1" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-2" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-3" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-4" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-5" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-6" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-7" });
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-8" });

                // 一个 slices 刚好处理完
                let slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(8).resultSlices(async (models) => {
                    slicesCallbackCount += 1;
                    expect(slicesCallbackCount, "slices can only callback once").equals(1);
                    expect(models).deep.equals([
                        { ...snapshotModel, roomUUID: "room-1" },
                        { ...snapshotModel, roomUUID: "room-2" },
                        { ...snapshotModel, roomUUID: "room-3" },
                        { ...snapshotModel, roomUUID: "room-4" },
                        { ...snapshotModel, roomUUID: "room-5" },
                        { ...snapshotModel, roomUUID: "room-6" },
                        { ...snapshotModel, roomUUID: "room-7" },
                        { ...snapshotModel, roomUUID: "room-8" },
                    ]);
                })).equals(8);
                expect(slicesCallbackCount, "slices can only callback once").equals(1);

                // 两个 slices 刚好处理完，且都等长
                slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(4).resultSlices(async (models) => {
                    slicesCallbackCount += 1;
                    assert(slicesCallbackCount <= 2, "slices can only callback twice");
                    if (slicesCallbackCount === 1) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-1" },
                            { ...snapshotModel, roomUUID: "room-2" },
                            { ...snapshotModel, roomUUID: "room-3" },
                            { ...snapshotModel, roomUUID: "room-4" },
                        ]);
                    } else {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-5" },
                            { ...snapshotModel, roomUUID: "room-6" },
                            { ...snapshotModel, roomUUID: "room-7" },
                            { ...snapshotModel, roomUUID: "room-8" },
                        ]);
                    }
                })).equals(8);
                expect(slicesCallbackCount, "slices can only callback twice").equals(2);

                // 两个 slices 刚好处理完，但第二个没有装满
                slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(6).resultSlices(async (models) => {
                    slicesCallbackCount += 1;
                    assert(slicesCallbackCount <= 2, "slices can only callback twice");
                    if (slicesCallbackCount === 1) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-1" },
                            { ...snapshotModel, roomUUID: "room-2" },
                            { ...snapshotModel, roomUUID: "room-3" },
                            { ...snapshotModel, roomUUID: "room-4" },
                            { ...snapshotModel, roomUUID: "room-5" },
                            { ...snapshotModel, roomUUID: "room-6" },
                        ]);
                    } else {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-7" },
                            { ...snapshotModel, roomUUID: "room-8" },
                        ]);
                    }
                })).equals(8);
                expect(slicesCallbackCount, "slices can only callback twice").equals(2);

                // 三个 slices 刚好处理完，最后一个没装满
                slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(3).resultSlices(async (models) => {
                    slicesCallbackCount += 1;
                    assert(slicesCallbackCount <= 3, "slices can only callback third");
                    if (slicesCallbackCount === 1) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-1" },
                            { ...snapshotModel, roomUUID: "room-2" },
                            { ...snapshotModel, roomUUID: "room-3" },
                        ]);
                    } else if (slicesCallbackCount === 2) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-4" },
                            { ...snapshotModel, roomUUID: "room-5" },
                            { ...snapshotModel, roomUUID: "room-6" },
                        ]);
                    } else {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-7" },
                            { ...snapshotModel, roomUUID: "room-8" },
                        ]);
                    }
                })).equals(8);
                expect(slicesCallbackCount, "slices can only callback third").equals(3);

                // 限制个数
                slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(4).limit(6).resultSlices(async (models) => {
                    slicesCallbackCount += 1;
                    assert(slicesCallbackCount <= 2, "slices can only callback twice");
                    if (slicesCallbackCount === 1) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-1" },
                            { ...snapshotModel, roomUUID: "room-2" },
                            { ...snapshotModel, roomUUID: "room-3" },
                            { ...snapshotModel, roomUUID: "room-4" },
                        ]);
                    } else {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-5" },
                            { ...snapshotModel, roomUUID: "room-6" },
                        ]);
                    }
                })).equals(6);
                expect(slicesCallbackCount, "slices can only callback twice").equals(2);

                // 通过 stop() 来停止
                slicesCallbackCount = 0;
                expect(await snapshotDB.get.all().slices(3).resultSlices(async (models, stop) => {
                    slicesCallbackCount += 1;
                    assert(slicesCallbackCount <= 2, "slices can only callback twice");
                    if (slicesCallbackCount === 1) {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-1" },
                            { ...snapshotModel, roomUUID: "room-2" },
                            { ...snapshotModel, roomUUID: "room-3" },
                        ]);
                    } else {
                        expect(models).deep.equals([
                            { ...snapshotModel, roomUUID: "room-4" },
                            { ...snapshotModel, roomUUID: "room-5" },
                            { ...snapshotModel, roomUUID: "room-6" },
                        ]);
                        stop();
                    }
                })).equals(6);
                expect(slicesCallbackCount, "slices can only callback twice").equals(2);
            });

            it(`invalid get in ${name}`, async () => {
                const snapshotDB = db.model("snapshots");
                const snapshotModel = {
                    sliceUUID: "slice",
                    timestamp: 1000,
                    frameId: 0,
                    createdAt: 1024,
                };
                await snapshotDB.set.all().deleteAll();
                await snapshotDB.post({ ...snapshotModel, roomUUID: "room-1" });

                await expectError("cannot includes all", async () => {
                    await snapshotDB.get.all().result();
                });
                await expectError("expect \"=\", invalid sign of \"timestamp\": >=", async () => {
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").greaterOrEqualsThan(1000)
                        .and.colume("roomUUID").equals("room-1").result();
                });
                await expectError("lost primary key \"roomUUID\"", async () => {
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").equals(1000).result();
                });
                expect((
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").equals(1000).results()
                )).deep.equals([{ ...snapshotModel, roomUUID: "room-1" }]);

                await expectError("lost primary key \"timestamp\"", async () => {
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("roomUUID").equals("room-1").result();
                });

                try {
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                    .and.colume("roomUUID").equals("room-1").results();
                } catch (error) {
                    // eslint-disable-next-line max-len
                    const check = error.message === "invalid condition columes list: sliceUUID = slice && roomUUID = room-1" || error.message === "lost primary key \"timestamp\"";
                    expect(check).equals(true);
                }

                await expectError("invalid value of \"timestamp\": foobar", async () => {
                    await snapshotDB.get.colume("sliceUUID").equals("slice")
                        .and.colume("timestamp").equals("foobar" as any)
                        .and.colume("roomUUID").equals("room-1").results();
                });
            });

        }
    });

});
