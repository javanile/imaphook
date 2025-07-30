require('dotenv').config(); // carica le variabili da .env

const Imap = require('imap');
const { simpleParser } = require('mailparser');

const imap = new Imap({
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT),
    tls: process.env.IMAP_TLS === 'true',
});

function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
}

imap.once('ready', function () {
    openInbox(function (err, box) {
        if (err) throw err;
        console.log('Mailbox aperta, in attesa di nuove mail...');

        imap.on('mail', function (numNewMsgs) {
            console.log(`Sono arrivate ${numNewMsgs} nuove mail!`);

            // fetch ultime mail nuove
            const fetch = imap.seq.fetch(
                `${box.messages.total - numNewMsgs + 1}:${box.messages.total}`,
                {
                    bodies: '',
                    markSeen: true,
                }
            );

            fetch.on('message', function (msg, seqno) {
                let mailBody = '';

                msg.on('body', function (stream) {
                    stream.on('data', function (chunk) {
                        mailBody += chunk.toString('utf8');
                    });
                });

                msg.once('end', function () {
                    simpleParser(mailBody)
                        .then((mail) => {
                            console.log('Da:', mail.from.text);
                            console.log('Soggetto:', mail.subject);
                            // Qui puoi inserire la chiamata al tuo script custom
                        })
                        .catch((err) => console.error('Errore parsing mail:', err));
                });
            });

            fetch.once('error', function (err) {
                console.log('Fetch error:', err);
            });

            fetch.once('end', function () {
                console.log('Fetch finito');
            });
        });
    });
});

imap.once('error', function (err) {
    console.log(err);
});

imap.once('end', function () {
    console.log('Connessione IMAP terminata');
});

imap.connect();