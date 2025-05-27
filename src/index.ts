import net from "net";
import dotenv from "dotenv";
dotenv.config();

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 2525; // Using 2525 for dev because I am on the MAC OS and port 25 is usually blocked or requires sudo

type Session = {
  sender: string;
  recipients: string[];
  dataMode: boolean;
  messageLines: string[];
};

const server = net.createServer((socket) => {
  const session: Session = {
    sender: "",
    recipients: [],
    dataMode: false,
    messageLines: [],
  };

  const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`Client connected: ${clientAddress}`);

  socket.write("220 CC NIEL SMTP Server\r\n");

  socket.on("data", (buffer) => {
    const input = buffer.toString().trim();
    console.log(`[${clientAddress}] > ${input}`);

    // Handle DATA mode
    if (session.dataMode) {
      if (input === ".") {
        session.dataMode = false;
        console.log(`[${clientAddress}] Message received:`);
        console.log(session.messageLines.join("\n"));
        session.messageLines = [];
        socket.write("250 Message received\r\n");
      } else {
        // Handle transparency
        const line = input.startsWith("..") ? input.slice(1) : input;
        session.messageLines.push(line);
      }
      return;
    }

    // Parse SMTP commands
    if (/^HELLO\s+/i.test(input)) {
      const domain = input.split(" ")[1] || "unknown";
      socket.write(`250 Hello ${domain}, pleased to meet you\r\n`);
    } else if (/^MAIL FROM:/i.test(input)) {
      const match = input.match(/^MAIL FROM:\s*<(.+)>/i);
      if (match) {
        session.sender = match[1];
        socket.write("250 OK\r\n");
      } else {
        socket.write("501 Syntax error in parameters or arguments\r\n");
      }
    } else if (/^RCPT TO:/i.test(input)) {
      const match = input.match(/^RCPT TO:\s*<(.+)>/i);
      if (match) {
        session.recipients.push(match[1]);
        socket.write("250 OK\r\n");
      } else {
        socket.write("501 Syntax error in parameters or arguments\r\n");
      }
    } else if (/^DATA$/i.test(input)) {
      if (session.sender && session.recipients.length > 0) {
        session.dataMode = true;
        socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
      } else {
        socket.write("503 Bad sequence of commands\r\n");
      }
    } else if (/^QUIT$/i.test(input)) {
      socket.write("221 Bye\r\n");
      socket.end();
    } else {
      socket.write("500 Command not recognized\r\n");
    }
  });

  socket.on("end", () => {
    console.log(`Client disconnected: ${clientAddress}`);
  });

  socket.on("error", (err) => {
    console.error(`Error with ${clientAddress}: ${err.message}`);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`SMTP Server listening on ${HOST}:${PORT} 🚀⚡️`);
});
