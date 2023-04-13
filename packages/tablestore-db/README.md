# tablestore-db

## 开发

```shell
# tablestore-db 依赖 dictionary-db，需要先在根目录执行 build
pnpm build
```

## 测试

根据情况，注释 `packages/tablestore-db/test/Models.ts` 的数据库。
同时在该文件中，写好测试数据数据库 schema。

测试阿里云 tablestore 数据库需要配置以下环境变量
```shell
export TABLESTORE_AK=***
export TABLESTORE_SK=***
export TABLESTORE_INSTANCE_NAME=***
export TABLESTORE_ENDPOINT=***
```

测试 dynamodb 需要在本地配置好 `~/.aws/credentials` 和 `~/.aws/config`，前者是鉴权信息，后者是 region 信息。

~/.aws/credentials

```ini
[default]
aws_access_key_id = 
aws_secret_access_key = 
```


~/.aws/config

```ini
[default]
region = ap-northeast-1
output = json
```

```shell
cd packages/tablestore-db
pnpm test
```