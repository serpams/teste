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

const BOTConnection = async (fn,jid,msg) => {
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

  if(fn == 'msg'){

   await socket.presenceSubscribe(jid);
   await delay(2500);
   await socket.sendPresenceUpdate("composing", jid);
   await delay(2500);
   await socket.sendPresenceUpdate("paused", jid);
   return await socket.sendMessage(jid, msg);

  }
//   const BotSendMessage = async (jid, msg) => {
   
//   };
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

// use BotSendMessage(jid, templateMessage);
 
  const result = await  BOTConnection()
  await result.BotSendMessage(jid, templateMessage)
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

  const result = await BOTConnection('msg',jid,message);
  if(result.error == ''){
      res.status(200).json({
         status: true,
         response: result,
      });
  }
  
//  await result.BotSendMessage(jid, { text: message })
//     .then((response) => {
//       res.status(200).json({
//         status: true,
//         response: response,
//       });
//     })
//     .catch((err) => {
//       res.status(500).json({
//         status: false,
//         response: err,
//       });
//     });
});

server.listen(port, function () {
  console.log("Servidor rodando na porta: " + port);
});
