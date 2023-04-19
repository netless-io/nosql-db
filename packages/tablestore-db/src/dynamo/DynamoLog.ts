import type { DeleteItemCommandInput, PutItemCommandInput, ScanCommandInput, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";

export class DynamoStoreLog {

    public constructor(
        private readonly printLog: (...args: string[]) => void,
    ) {}

    public log(methodName: string, params: DeleteItemCommandInput | ScanCommandInput | UpdateItemCommandInput | PutItemCommandInput): void {
        try {
            const fillStrings: string[] = [
                methodName, params.TableName || "no table name",
            ];
            fillStrings.push(JSON.stringify(params));

            this.printLog.apply(null, fillStrings);

        } catch (error) {
            // 只是日志报不上去而已，不要因此阻止正常业务
            this.printLog("print error failed:", error.stack || error.message);
        }
    }

}
