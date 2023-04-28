import { config } from "dotenv";
import { Database } from "@netless/dictionary-db";
import type { TableStoreModelDefinition } from "../src/index";
import { DatabaseAdapterFactory, TableStoreType } from "../src/index";

export type TestModels = {
    readonly rooms: RoomModel;
    readonly snapshots: SnapshotModel;
    readonly members: MemberModel;
    readonly accessKeys: AccessKeyModel;
    readonly roomStates: RoomStatesModel;
    readonly sliceBegins: SliceBeginModel;
    readonly appStateDaySum: AppStateDaySum;
    readonly appRoomSegments: AppRecordSegment;
    readonly apps: AppModel;
};

export type AppStateDaySum = {
    readonly teamId: string;
    readonly appUUID: string;
    readonly timestamp: number;
    readonly peakSessionsCount: number;
    readonly peakWritersCount: number;
};
export type RoomModel = {
    readonly uuid: string;
    readonly akkoVersion: string;
    readonly state: "active" | "zombie" | "ban";
    readonly isBan: boolean;
    readonly usersMaxCount: number;
    readonly rate: number;
    readonly createdAt: Date;
};

export type AppRecordSegment = {
    readonly segment: number;
    readonly host: string;
    readonly duration: number;
    readonly roomsCount: number;
    readonly recordCount: number;
    readonly teamId: string;
    readonly appUUID: string;
};

export type SliceBeginModel = {
    roomUUID: string;
    beginAt: number;
    uuid: string;
};

export type RoomStatesModel = {
    readonly timestamp: number;
    readonly uuid: string;
    readonly teamId: string;
    readonly appUUID: string;
    readonly state: "active" | "release" | "recordOn" | "recordOff";
};

export type SnapshotModel = {
    readonly sliceUUID: string;
    readonly timestamp: number;
    readonly roomUUID: string;
    readonly frameId: number;
    readonly createdAt: number;
};

export type MemberModel = {
    readonly id: string;
    readonly name: string;
    readonly age?: number;
    readonly city: string;
};

export type AccessKeyModel = {
    readonly ak: string;
    readonly sk: string;
    readonly appUUID: string;
    readonly teamUUID: string;
    readonly isBan: boolean;
    readonly createdAt: Date;
    readonly state: RecordState;
};

export type AppModel = {
    readonly uuid: string;
    readonly teamUUID: string;
    readonly name: string;
    readonly state: RecordState;
    readonly createdAt: Date;
};

export enum RecordState {
    Active = "active",
    Deleted = "deleted",
}

const modeDefinition: TableStoreModelDefinition<TestModels> = {
    "rooms": {
        keys: {
            "uuid": TableStoreType.string,
        },
        columes: {
            "akkoVersion": TableStoreType.string,
            "state": TableStoreType.enums(["active", "zombie", "ban"]),
            "isBan": TableStoreType.boolean,
            "usersMaxCount": TableStoreType.integer,
            "rate": TableStoreType.float,
            "createdAt": TableStoreType.date,
        },
    },
    "snapshots": {
        keys: {
            "sliceUUID": TableStoreType.string,
            "timestamp": TableStoreType.integer,
            "roomUUID": TableStoreType.string,
        },
        columes: {
            "frameId": TableStoreType.integer,
            "createdAt": TableStoreType.integer,
        },
    },
    "appRoomSegments": {
        keys: {
            teamId: TableStoreType.string,
            appUUID: TableStoreType.string,
            segment: TableStoreType.integer,
            host: TableStoreType.string,
        },
        columes: {
            duration: TableStoreType.integer,
            roomsCount: TableStoreType.integer,
            recordCount: TableStoreType.integer,
        },
    },
    // 这个数据库不存在，主要是为了测试 condition 操作逻辑
    "roomStates": {
        keys: {
            timestamp: TableStoreType.integer,
            uuid: TableStoreType.string,
        },
        columes: {
            teamId: TableStoreType.string,
            appUUID: TableStoreType.stringDefaultValue("unknown"),
            state: TableStoreType.enums(["active", "release", "recordOn", "recordOff"]),
        },
    },
    "members": {
        keys: {
            "id": TableStoreType.string,
        },
        columes: {
            "name": TableStoreType.string,
            "age": TableStoreType.integerOptional,
            "city": TableStoreType.stringDefaultValue("Shanghai"),
        },
    },
    "accessKeys": {
        keys: {
            "ak": TableStoreType.string,
        },
        columes: {
            "sk": TableStoreType.string,
            "appUUID": TableStoreType.string,
            "teamUUID": TableStoreType.string,
            "isBan": TableStoreType.boolean,
            "state": TableStoreType.enums([RecordState.Active, RecordState.Deleted]),
            "createdAt": TableStoreType.date,
        },
        indexes: {
            "accessKeys_teamUUID_index": ["teamUUID"],
        },
    },
    "sliceBegins": {
        keys: {
            "roomUUID": TableStoreType.string,
            "beginAt": TableStoreType.integer,
            "uuid": TableStoreType.string,
        },
        columes: {},
    },
    "appStateDaySum": {
        keys: {
            "teamId": TableStoreType.string,
            "appUUID": TableStoreType.string,
            "timestamp": TableStoreType.integer,
        },
        columes: {
            "peakSessionsCount": TableStoreType.integer,
            "peakWritersCount": TableStoreType.integer,
        },
    },
    apps: {
        keys: {
            "teamUUID": TableStoreType.string,
            "uuid": TableStoreType.string,
        },
        columes: {
            "name": TableStoreType.string,
            "state": TableStoreType.enums([RecordState.Active, RecordState.Deleted]),
            "createdAt": TableStoreType.date,
        },
        indexes: {
            "apps_state_index": ["teamUUID", "state", "uuid"],
        },
    },
};

config();

// for (const requiredKey of [
//     "TABLESTORE_AK", "TABLESTORE_SK", "TABLESTORE_INSTANCENAME", "TABLESTORE_ENDPOINT",]) {
//     if (!(requiredKey in process.env)) {
//         throw new Error(`need define process.env.${requiredKey}`);
//     }
// }

const db: Database<TestModels> = new Database(new DatabaseAdapterFactory<TestModels>(modeDefinition).create({
    accessKeyId: process.env.TABLESTORE_AK!,
    secretAccessKey: process.env.TABLESTORE_SK!,
    instancename: process.env.TABLESTORE_INSTANCENAME!,
    endpoint: process.env.TABLESTORE_ENDPOINT!,
}));

const db2: Database<TestModels> = new Database(new DatabaseAdapterFactory<TestModels>(modeDefinition).create({
    // will load from ~/.aws/credentials and ~/.aws/config。just keep dynamodb field is ok
    dynamodb: {
        region: "ap-northeast-1",
    },
}));

export const databaseSet = { dynamodb: db2 };
