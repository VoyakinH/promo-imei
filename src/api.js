const express = require('express');
const bodyParser = require('body-parser');
const dataBase = require('./db');
const nodeMailer = require('./mailer');
require('dotenv').config();

const router = express.Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: true}));

router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods',
        'GET, POST');
    next();
});

const tokenSecret = process.env.TOKEN_SECRET;
const db = dataBase.createDbConnection();
const mailer = nodeMailer.createMailer()


// Добавление imei, code в БД с проверкой токена
router.post('/v1/insert', async (req, res) => {
    try {
        const imei = req.body.imei;
        const code  = req.body.code;
        const secret = req.body.secret;

        if (imei === undefined || code === undefined || secret === undefined) {
            res.status(400).send({
                status: false,
                message: 'Fields must not be empty'
            });
        } else if ((!Array.isArray(imei)) || (!Array.isArray(code))) {
            res.status(400).send({
                status: false,
                message: 'Data type in field must be array'
            });
        } else if (secret !== tokenSecret) {
            res.status(401).send({
                status: false,
                message: 'Unauthorized'
            });
        } else {
            let isBadValue = false;
            imei?.every((value) => {
                if (Number.isInteger(value) && value >= 0) {
                    return true;
                } else {
                    isBadValue = true;
                    return false;
                }
            })
            code?.every((value) => {
                if (typeof value === 'string' && value.length <= 32) {
                    return true;
                } else {
                    isBadValue = true;
                    return false;
                }
            })

            if (isBadValue) {
                res.status(400).send({
                    status: false,
                    message: 'Incorrect data types or values in arrays'
                });
                return;
            }

            for (const value of imei) {
                await dataBase.insertImei(db, value);
            }
            console.log(`Inserted ${imei.length} imeis in DB`);

            for (const value of code) {
                await dataBase.insertCode(db, value);
            }
            console.log(`Inserted ${code.length} codes in DB`);

            res.status(200).send({
                status: true,
                message: `Inserted ${imei.length} imei, ${code.length} code`
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

// Получение промокода по imei
router.post('/v1/code/receive', async (req, res) => {
    try {
        const imei = req.body.imei;
        const email = req.body.email;

        if (imei === undefined || email === undefined) {
            res.status(400).send({
                status: false,
                message: 'Fields must not be empty'
            });
        } else if (!Number.isInteger(imei) || imei < 0) {
            res.status(400).send({
                status: false,
                message: 'Incorrect imei'
            });
        } else if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email) || email.length > 64) {
            res.status(400).send({
                status: false,
                message: 'Incorrect email'
            });
        } else {
            const foundedImei = (await dataBase.selectImeiWithoutCode(db, imei));
            if (foundedImei.length === 0) {
                res.status(404).send({
                    status: false,
                    message: 'Imei not founded'
                });
                return;
            }
            const foundedImeiID = foundedImei[0].ID;

            const foundedCode = await dataBase.selectUnusedCode(db);
            if (foundedCode.length === 0) {
                res.status(503).send({
                    status: false,
                    message: 'No more promo codes in DB'
                });
                return;
            }

            const foundedCodeId = foundedCode[0].ID;
            const foundedCodeValue = foundedCode[0].code;

            await dataBase.setCodeUsed(db, foundedCodeId);
            await dataBase.setCodeForImei(db,
                foundedImeiID,
                foundedCodeId,
                new Date(Date.now()).toISOString().replace(/T/, ' ').replace(/\..+/, ''),
                email);

            await nodeMailer.sendPromoCode(mailer,
                email,
                foundedCodeValue)

            res.status(200).send({
                status: true,
                message: "Code send to email"
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

// Проверка кол-ва доступных промокодов
router.get('/v1/code/available', async (req, res) => {
    try {
        const count = (await dataBase.selectCodesCount(db));

        res.status(200).send({
            status: true,
            count: count
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

// Проверка информации по imei
router.post('/v1/imei/inspect', async (req, res) => {
    try {
        const imei = req.body.imei;
        const secret = req.body.secret;

        if (imei === undefined || secret === undefined) {
            res.status(400).send({
                status: false,
                message: 'Field must not be empty'
            });
        } else if (!Number.isInteger(imei) || imei < 0) {
            res.status(400).send({
                status: false,
                message: 'Incorrect imei'
            });
        } else if (secret !== tokenSecret) {
            res.status(401).send({
                status: false,
                message: 'Unauthorized'
            });
        } else {
            const foundedImei = (await dataBase.selectImeiInfo(db, imei));
            if (foundedImei.length === 0) {
                res.status(404).send({
                    status: false,
                    message: 'Imei not founded'
                });
                return;
            }

            res.status(200).send({
                status: true,
                data: foundedImei
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

// Получение фидбека от пользователя
router.post('/v1/feedback', async (req, res) => {
    try {
        const email = req.body.email;
        const message = req.body.message;

        if (email === undefined || message === undefined || message === '') {
            res.status(400).send({
                status: false,
                message: 'Field must not be empty'
            });
        } else if (typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email) || email.length > 64) {
            res.status(400).send({
                status: false,
                message: 'Incorrect email'
            });
        } else {
            await nodeMailer.sendFeedback(mailer,
                email,
                message)

            res.status(200).send({
                status: true,
                message: "Feedback received"
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

module.exports = router;
