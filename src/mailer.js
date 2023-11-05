const nodemailer = require("nodemailer");

require('dotenv').config();


const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASSWORD;

const service = process.env.EMAIL_SERVICE;
const host = process.env.EMAIL_HOST;
const port = process.env.EMAIL_PORT;
const secure = process.env.EMAIL_SECURE;


// Создание мейлера для отправки писем
function createMailer() {
    return nodemailer.createTransport({
        service: service,
        host: host,
        port: port,
        secure: secure,
        auth: {
            user: user,
            pass: pass,
        },
    });
}

//Отправка промокода на почту клиента
async function sendPromoCode(mailer, sendTo, code) {
    const info = await mailer.sendMail({
        from: `"PromoCoder" <${user}>`,
        to: sendTo,
        subject: "Промокод Яндекс.Плюс",
        html: `<b>Ваш промокод: ${code}</b>`,
    });

    console.log("Message sent: %s", info.accepted);
}

//Отправка фидбека на нашу почту
async function sendFeedback(mailer, email, message) {
    await mailer.sendMail({
        from: `"PromoCoder" <${user}>`,
        to: user,
        subject: "Обратная связь с сайта",
        html: `<b>EMAIL: ${email}<br>MESSAGE: ${message}</b>`,
    });

    console.log("Feedback received");
}

module.exports = {
    createMailer,
    sendPromoCode,
    sendFeedback
}
