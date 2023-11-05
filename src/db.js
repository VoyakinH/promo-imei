const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const filepath = path.join(__dirname, "..", "db", "promo_codes.db");

function createDbConnection() {
    if (fs.existsSync(filepath)) {
        console.log("Connection with SQLite has been established");
        return new sqlite3.Database(filepath);
    } else {
        const db = new sqlite3.Database(filepath, (error) => {
            if (error) {
                return console.error(error.message);
            }
            createTable(db);
            console.log("DB created and connection with SQLite has been established");
        });
        return db;
    }
}

function createTable(db) {
    db.exec(`
        CREATE TABLE code_table
        (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(32) NOT NULL,
            is_used INTEGER NOT NULL DEFAULT FALSE
        );
    `);
    db.exec(`
        CREATE TABLE imei_table
        (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            imei INTEGER NOT NULL,
            created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            code_id INTEGER DEFAULT NULL,
            code_use_time TIMESTAMP DEFAULT NULL,
            send_to VARCHAR(64) DEFAULT NULL,
            FOREIGN KEY(code_id) REFERENCES code_table(ID)
        );
    `);
}

// Добавление одного imei
async function insertImei(db, imei) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO imei_table (imei) VALUES (?)`,
            [imei],
            function (error) {
                if (error) {
                    console.error(error.message);
                    reject(error);
                }
                console.log(`Inserted imei ${imei} with ID: ${this.lastID}`);
                resolve(this.lastID);
            }
        );
    });
}

// Добавление одного промокода
async function insertCode(db, code) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO code_table (code) VALUES (?)`,
            [code],
            function (error) {
                if (error) {
                    console.error(error.message);
                    reject(error);
                }
                console.log(`Inserted promo code ${code} with ID: ${this.lastID}`);
                resolve();
            }
        );
    });
}

// Найти id imei, для которого не был выдан промокод
async function selectImeiWithoutCode(db, imei) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ID FROM imei_table WHERE imei = ? and code_id IS NULL LIMIT 1`,
            [imei],
            (error, rows) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            if (rows.length !== 0) {
                console.log(`Founded imei: ${imei} without promo code in DB`);
            } else {
                console.log(`Not founded imei: ${imei} without promo code in DB`);
            }
            resolve(rows);
        });
    });
}

// Найти информацию о imei
async function selectImeiInfo(db, imei) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT it.ID, it.imei, it.created, ct.code, it.code_use_time, it.send_to
                FROM imei_table it 
                LEFT JOIN code_table ct ON it.code_id = ct.ID
                WHERE it.imei = ?
                LIMIT 1`,
            [imei],
            (error, rows) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                if (rows.length !== 0) {
                    console.log(`Inspected imei: ${imei}`);
                } else {
                    console.log(`Not founded imei: ${imei} to inspect`);
                }
                resolve(rows);
            });
    });
}

// Выборка одного неиспользованного промокода
async function selectUnusedCode(db) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ID, code FROM code_table WHERE is_used = 0 LIMIT 1`,
            [],
            (error, rows) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            if (rows.length !== 0) {
                console.log(`Founded promo code: ${rows[0].code} in DB`);
            } else {
                console.log(`Not founded promo code in DB`);
            }
            resolve(rows);
        });
    });
}

// Найти кол-во неиспользованных промокодов
async function selectCodesCount(db) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT count(*) as count
                FROM code_table 
                WHERE is_used = 0`,
            [],
            (error, rows) => {
                if (error) {
                    console.error(error);
                    reject(error);
                }
                console.log(`Founded ${rows[0].count} unused promo codes in DB`);

                resolve(rows[0].count);
            });
    });
}

// Привязка промокода по id к imei по id с указанием даты
async function setCodeForImei(db, idImei, idCode, usedTime, email) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE imei_table SET code_id = ?, code_use_time = ?, send_to = ? WHERE ID = ?`,
            [idCode, usedTime, email, idImei], (error) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            console.log(`Imei with id: ${idImei} received promo code with id: ${idCode}`);
            resolve();
        });
    });
}

// Установка флага использования для промокода по его id
async function setCodeUsed(db, idCode) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE code_table SET is_used = 1 WHERE ID = ?`,
            [idCode],
            (error) => {
            if (error) {
                console.error(error);
                reject(error);
            }
            console.log(`Promo code with id: ${idCode} set used in DB`);
            resolve();
        });
    });
}


// async function deleteImei(db, id) {
//     return new Promise((resolve, reject) => {
//         db.run(`DELETE FROM imei_table WHERE ID = ?`, [id], function (error) {
//             if (error) {
//                 console.error(error);
//                 reject(error);
//             }
//             console.log(`Deleted imei with id: ${id} from DB`);
//             resolve();
//         });
//     });
// }


// async function deleteRowWithId(db, id) {
//     return new Promise((resolve, reject) => {
//         db.run(`DELETE FROM promo_codes WHERE id = ?`, [id], function (error) {
//             if (error) {
//                 console.error(error);
//                 reject(error);
//             }
//             console.log(`Row with the ID ${id} has been deleted`);
//             resolve();
//         });
//     });
// }

module.exports = {
    createDbConnection,
    insertImei,
    insertCode,
    selectImeiWithoutCode,
    selectImeiInfo,
    selectUnusedCode,
    selectCodesCount,
    setCodeForImei,
    setCodeUsed
}