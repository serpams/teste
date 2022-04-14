const makeWaSocket = require("@adiwajshing/baileys").default;
const {
  delay,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@adiwajshing/baileys");
const P = require("pino");
const { unlink, existsSync, mkdirSync, readFileSync } = require("fs");
const express = require("express");
const { body, validationResult } = require("express-validator");
const cors = require("cors");

const http = require("http");
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const AuthPath = "./BotSessions/";
const Auth = "auth_info.json";
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.use(
  express.urlencoded({
    extended: true,
  })
);

const BotUpdate = (socket) => {
  socket.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("BOT - Qrcode: ", qr);
    }
    if (connection === "close") {
      const Reconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (Reconnect) BOTConnection();
      console.log(
        `BOT - CONEXÃO FECHADA! RAZÃO: ` + DisconnectReason.loggedOut.toString()
      );
      if (Reconnect === false) {
        const removeAuth = AuthPath + Auth;
        unlink(removeAuth, (err) => {
          if (err) throw err;
        });
      }
    }
    if (connection === "open") {
      console.log("BOT -CONECTADO");
    }
  });
};

const BOTConnection = async () => {
  const { version } = await fetchLatestBaileysVersion();
  if (!existsSync(AuthPath)) {
    mkdirSync(AuthPath, { recursive: true });
  }
  const { saveState, state } = useSingleFileAuthState(AuthPath + Auth);
  const config = {
    auth: state,
    logger: P({ level: "error" }),
    printQRInTerminal: true,
    version,
    connectTimeoutMs: 6000,
    async getMessage(key) {
      return { conversation: "BOT" };
    },
  };
  const socket = makeWaSocket(config);
  BotUpdate(socket.ev);
  socket.ev.on("creds.update", saveState);

  const BotSendMessage = async (jid, msg) => {
    await socket.presenceSubscribe(jid);
    await delay(2000);
    await socket.sendPresenceUpdate("composing", jid);
    await delay(2000);
    await socket.sendPresenceUpdate("paused", jid);
    await delay(1000);
    return await socket.sendMessage(jid, msg);
  };
};
app.get('/connectbot', async (req, res) => {
  await BOTConnection();
   res.send('BOT CONECTADO');
});

app.post("/sendlink", [body("jid").notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }

  const jid = req.body.jid;
  const link = req.body.link;
  const messagetoLink = req.body.messagetolink;
  const title = req.body.title;
  const description = req.body.description;

  const templateMessage = {
    forward: {
      key: { fromMe: true },
      message: {
        extendedTextMessage: {
          text: `*${messagetoLink}*: \n\n ${link}`,
          matchedText: `${link}`,
          canonicalUrl: `${link}`,
          title: `${title}`,
          description: `${description}`,
          jpegThumbnail: readFileSync("./assets/cfc.jpg"),
        },
      },
    },
  };

  await BOTConnection()
    .BotSendMessage(jid, templateMessage)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

app.post("/text-message", [body("jid").notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }

  const jid = req.body.jid.toString();
  const message = req.body.message;
  // const metadata = await socket.groupMetadata("La8QJc2n55IGP2GtHD2szA@g.us")
  // console.log(metadata)
  // const metadata =await socket.groupMetadata("La8QJc2n55IGP2GtHD2szA@g.us")
  // console.log(metadata.id + ", title: " + metadata.subject + ", description: " + metadata.desc)
  // const group = await socket.groupCreate("My Fab Group", [jid ,'5521977085506@s.whatsapp.net' ])
  // console.log ("created group with id: " + group.gid + JSON.stringify(group))
  // socket.sendMessage(group.id, { text: 'hello there' }) // say hello to everyone on the group

 await  BOTConnection()
    .BotSendMessage(jid, { text: message })
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

server.listen(port, function () {
  console.log("Servidor rodando na porta: " + port);
});
