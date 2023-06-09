# dictionary-db

![main](https://github.com/moskize91/dictionary-db/actions/workflows/build-and-test.yml/badge.svg?branch=main)

## 开发

```shell
pnpm install
# 开发 tablestore-db 需要依赖 dictionary-db，需要先在根目录执行 build
pnpm build
```

## 已知问题

- colume 为错误书写，由于项目兼容问题，暂时不修改。
- dynamodb 查询时，sk 作为 condition 查询时，不能使用多个条件，只能使用一个条件。Between 包含前两后端，如果不包含前后两端，则无法支持。需要在调用的代码里面做支持。

## TODO
- [ ] 数据库的 schema 无法自动创建，需要手动创建。需要补充

## 定义数据结构

你需要通过定义 Model 的数据结构来初始化适配器。例如，使用如下代码。

```typescript
import { TablestoreAdapterFactory, TableStoreType } from "netless-tablestore-db";

export type MyModels = {
    readonly rooms: RoomModel;
};

export type RoomModel = {
    readonly uuid: string;
    readonly teamId: number;
    readonly createdAt: Date;
    readonly belongs: string;
};

export const adapterFactory = new TablestoreAdapterFactory<MyModels>({
    rooms: {
        keys: {
            uuid: TableStoreType.string,
            teamId: TableStoreType.integer,
        },
        columes: {
            createdAt: TableStoreType.date,
            belongs: TableStoreType.string,
        },
    },
});
```

该例子中，``rooms`` 对应 tablestore 中的表名。而 ``keys`` 对应 tablestore 中的主键。其定义顺序应该和 tablestore 中定义顺序一致。``columes`` 为值，虽然 tablestore 中没有固定结构，但是本库会对其结构进行限制。

有了适配器，就可以构造 ``Database`` 实例了。

```typescript
import { Database } from "@netless/dictionary-db";

const db = new Database(adapterFactory.create({
    accessKeyId: "***",
    secretAccessKey: "***",
    endpoint: "https://white.cn-hangzhou.ots.aliyuncs.com",
    instancename: "***",
}));
```

## 查询

通过如下代码查询单行数据。

```typescript
// 返回一个 room 对象
const roomObject = await db.model("rooms")
                           .get.colume("uuid").equals("uuid-001")
                           .and.colume("teamId").equals(100)
                           .result();
```

通过如下代码进行范围查询。

```typescript
// 返回一个数组
const roomObjects = await db.model("rooms")
                            .get.colume("uuid").greaterOrEqualsThan("uuid-001")
                            .and.colume("teamId").lessThan(1000)
                            .results();
```

```typescript
// 分多次回调给出查询结果
// 用于查询结果特别巨大的情况
await db.model("rooms")
        .get.colume("uuid").greaterOrEqualsThan("uuid-001")
        .and.colume("teamId").lessThan(1000)
        .resultSlices((roomSlices: Room[], stop: () => void) => {
            // 将结果分多次回调
            // 调用 stop() 可以终止回调循环
        });
```

```typescript
// 分多次回调给出查询结果，并指定一次回调最多给多少个对象
// 用于查询结果特别巨大的情况
await db.model("rooms")
        .get.colume("uuid").greaterOrEqualsThan("uuid-001")
        .and.colume("teamId").lessThan(1000)
        .slices(10000)
        .resultSlices((roomSlices: Room[], stop: () => void) => {
            // 将结果分多次回调，每次限制 10000 个
            // 调用 stop() 可以终止回调循环
        });
```

### 带限制条件的查询

```typescript
// 查看是否存在
const isExits = await db.model("rooms")
                        .get.colume("uuid").equals("uuid-001")
                        .and.colume("teamId").equals(100)
                        .exits();
```

```typescript
// 查询，但限制仅返回前 100 个结果
const roomObjects = await db.model("rooms")
                            .get.colume("uuid").greaterOrEqualsThan("uuid-001")
                            .and.colume("teamId").lessThan(1000)
                            .limit(100)
                            .results();
```

```typescript
// 查询，逆序排列
const roomObjects = await db.model("rooms")
                            .get.colume("uuid").greaterOrEqualsThan("uuid-001")
                            .and.colume("teamId").lessThan(1000)
                            .descending()
                            .results();
```

```typescript
// 查询满足条件的对象个数
const roomObjectsCount = await db.model("rooms")
                                 .get.colume("uuid").greaterOrEqualsThan("uuid-001")
                                 .and.colume("teamId").lessThan(1000)
                                 .count();
```

```typescript
// 返回所有对象
const roomObjects = await db.model("rooms").all().results();
```

## 修改

```typescript
// 直接创建一个对象
await db.model("rooms").post({
    uuid: "uuid-001",
    teamId: 110,
    createdAt: new Date(),
    belongs: "Shanghai",
});
```

```typescript
// 修改一个对象的某个成员
await db.model("rooms").set
        .colume("uuid").equals("uuid-001")
        .colume("teamId").equals(110)
        .patch({
            belongs: "Hangzhou",
        });
```

```typescript
// 删除一个对象
await db.model("rooms").set
        .colume("uuid").equals("uuid-001")
        .colume("teamId").equals(110)
        .delete();
```

```typescript
// 批量删除
await db.model("rooms")
        .set.colume("uuid").greaterOrEqualsThan("uuid-001")
        .and.colume("teamId").lessThan(1000)
        .deleteAll();
```
