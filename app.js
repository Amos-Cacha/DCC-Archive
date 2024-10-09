const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const exphbs = require("express-handlebars");
const path = require("path");
const hbsHelpers = require("./helpers/hbsHelper");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const nocache = require("nocache");
const fse = require("fs-extra");
const db = require("./models/db.js");
const http = require("http");

const app = express();
const routes = require("./routes/routes.js");

const hbs = exphbs.create({
    defaultLayout: "main",
    extname: ".hbs",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
    helpers: hbsHelpers,
});

dotenv.config({ path: path.join(__dirname, ".env") });

const port = process.env.PORT
const hostname = process.env.HOSTNAME
let dbPath;
let logPath;

if (process.env.PORTABLE_EXECUTABLE_DIR !== undefined) {
    dbPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "database", "church.db")
    logPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "logs")
}
else {
    dbPath = path.join(__dirname, "database", "church.db")
    logPath = path.join(__dirname, "logs")
}

db.initDB(dbPath);

if (!fse.existsSync(logPath)) {
    fse.mkdirSync(logPath);
}

app.engine("hbs", hbs.engine);
app.set("view engine", ".hbs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "/public")));
app.use(
    session({
        cookie: { maxAge: 86400000 }, // 1 day
        store: new MemoryStore({
            checkPeriod: 86400000,
        }),
        saveUninitialized: true,
        resave: false,
        secret: process.env.COOKIE_SECRET || "christian-church",
    })
);
app.use(nocache());

app.use("/", routes);

// if route is not defined in the server, render an error message
app.use(function (req, res) {
    res.render("error", {
        css: ["global", "error"],
        status: {
            code: "404",
            message: "Not Found",
        },
        Level: parseInt(req.session.level),
    });
});


// Run via HTTP only
http.createServer(app).listen(port, () => {
    console.log("Disciples Christian Church Digital Archives");
    console.log(`Webserver is listening on port ${port}`);
    console.log(`http://localhost:${port}`);
    console.log(`Current Node Environment: ${process.env.NODE_ENV || "unconfigured"}`);
    console.log(`SSL: NO`);
});

module.exports = app;
