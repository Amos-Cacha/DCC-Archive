const knex = require("knex");
const sqlite3 = require("better-sqlite3");
const path = require("path");
const fse = require("fs-extra");
const { dbInfo } = require("./models/dbInfo");
const data = require("./models/dummyData");
const prompt = require("prompt");

let knexClient = {};

async function initDatabase(dbPath, deleteExisting=false, dummyData=false) {
    const dbFile = path.join(dbPath, 'church.db')

    if (deleteExisting)
        fse.removeSync(dbFile)

    if (!fse.existsSync(dbFile)) {
        await createTables(dbFile);
        await insertAccounts();
        await insertSettings();
    }
    
    if (dummyData)
        await insertData();
};

async function createTables(file) {
    const db = sqlite3(file);

    // Initialize Knex connection
    knexClient = knex({
        client: "sqlite3",
        connection: {
        filename: file,
        },
        useNullAsDefault: true,
    });

    for (const stmt of Object.values(dbInfo.create))
        db.prepare(stmt).run();

    await Promise.all(dbInfo.startIds.map(async (record) => {
        await knexClient('sqlite_sequence')
            .insert({
                name: record.table,
                seq: record.start
            }).catch((err) => {console.log(err);});
    }));

    console.log("Created tables");
};

async function insertAccounts() {
    let res = await knexClient("accounts").select();
    if (res.length === 0) {
        await Promise.all([
            knexClient("accounts")
                .insert({
                    level: 1,
                    hashed_password: "$2b$10$aio/axwnrQULwLBs2pOyW.kKYaLA0DrIK/yKH2a5Of6xKgtqF2nvG",
                })
                .catch(function (err) {
                    console.log(err);
                }),
            knexClient("accounts")
                .insert({
                    level: 2,
                    hashed_password: "$2b$10$kXSLhoWlB3nxLP7oq/riSel4nKCsFW1gteQtfngwq7HuG0B7mc9DC",
                })
                .catch(function (err) {
                    console.log(err);
                }),
            knexClient("accounts")
                .insert({
                    level: 3,
                    hashed_password: "$2b$10$gVrBYMVGzdO5rZ5A/0Kt1uvbrdi.k4YftFYPebfUrtx8izyzyGuXK",
                })
                .catch(function (err) {
                    console.log(err);
                })
        ]);
        console.log("Inserted accounts");
    }
    console.log("Accounts already existing");
};

async function insertSettings() {
    const res = await knexClient("settings").select();   
    if (res.length === 0) {
        knexClient("settings")
            .insert({
                name: "allow_level_0",
                value: "false",
            })
            .catch(function (err) {
                console.log(err);
            });
    }
};

async function insertData() {
    // insert accounts
    process.stdout.write("Inserting dummy data: ");
    await Promise.all(data.map(async (record) => {
        let res = await knexClient("people").insert(record.person);
        if (!res) {
            console.log(res);
            return;
        }
        record.member.person_id = res[0];
        res = await knexClient("address").insert(record.address);
        if (!res) {
            console.log(res);
            return;
        }
        record.member.address_id = res[0];
        res = await knexClient("members").insert(record.member);
        if (!res) {
            console.log(res);
            return;
        }
        res = await knexClient("people")
            .where("person_id", "=", record.member.person_id)
            .update({
                member_id: res[0],
            });
        if (res)
            process.stdout.write("|");
        else
            console.log(res);
    }));
    console.log("\nInserted dummy data");
};

async function runScript() {
    prompt.start();
    const {dbPath} = await prompt.get([{
        description: "Database path",
        name: "dbPath",
        default: path.join(__dirname, "/database")
    }]).catch(err => {throw new Error (err)});
    
    if (!fse.existsSync(dbPath))
        fse.mkdirSync(dbPath);

    let deleteExisting = false;
    if (fse.existsSync(path.join(dbPath, 'church.db'))) {
        result = await prompt.get([{
            description: "Found existing database, delete? (t/f)",
            name: "deleteExisting",
            type: "boolean",
            default: "f"
        }]).catch(err => {throw new Error (err)});
        deleteExisting = result.deleteExisting;
    }

    const {dummyData} = await prompt.get([{
        description: "Use dummy data? (t/f)",
        name: "dummyData",
        type: "boolean",
        default: "t"
    }]).catch(err => {throw new Error (err)});

    await initDatabase(dbPath, deleteExisting, dummyData);
    process.exit(0);
};

module.exports = [initDatabase, runScript];
