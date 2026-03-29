/*import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// PostgreSQL connection
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "quiz",
  password: "sam341@",
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

let quiz = [];
let currentQuestion = {};
let score = 0;

// Load data from DB
async function loadData() {
  const result = await db.query("SELECT * FROM capitals");
  quiz = result.rows;
}

// Random question
function nextQuestion() {
  currentQuestion = quiz[Math.floor(Math.random() * quiz.length)];
}

// Home page
app.get("/", async (req, res) => {
  score = 0;
  await loadData();
  nextQuestion();

  res.render("index.ejs", {
    question: currentQuestion,
    score: score,
  });
});

// Submit answer
app.post("/submit", (req, res) => {
  let answer = req.body.answer.trim().toLowerCase();

  let correct =
    currentQuestion.capital.toLowerCase() === answer;

  if (correct) score++;

  nextQuestion();

  res.render("index.ejs", {
    question: currentQuestion,
    score: score,
    wasCorrect: correct,
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});*/
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;

// DB CONNECTION
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "quiz",
  password: "sam341@",
  port: 5432,
});

// MIDDLEWARE
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: "quizsecret",
    resave: false,
    saveUninitialized: true,
  })
);

// QUIZ DATA
let quiz = [
  { country: "India", capital: "New Delhi" },
  { country: "USA", capital: "Washington" },
  { country: "Japan", capital: "Tokyo" },
  { country: "France", capital: "Paris" },
  { country: "Germany", capital: "Berlin" },
];

let currentQuestion = {};
let score = 0;

// RANDOM QUESTION
function nextQuestion() {
  currentQuestion = quiz[Math.floor(Math.random() * quiz.length)];
}

// ---------------- AUTH ----------------

// REGISTER PAGE
app.get("/register", (req, res) => {
  res.render("register");
});

// REGISTER USER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users (username, password) VALUES ($1, $2)",
    [username, hashedPassword]
  );

  res.redirect("/login");
});

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.render("login");
});

// LOGIN USER
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await db.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (result.rows.length > 0) {
    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (valid) {
      req.session.user = user;
      res.redirect("/");
    } else {
      res.send("Wrong password");
    }
  } else {
    res.send("User not found");
  }
});

// ---------------- QUIZ ----------------

// HOME PAGE
app.get("/", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  nextQuestion();

  res.render("index", {
    question: currentQuestion,
    user: req.session.user,
    score: score,
  });
});

// SUBMIT ANSWER
app.post("/submit", (req, res) => {
  let answer = req.body.answer.trim().toLowerCase();

  let correct =
    currentQuestion.capital.toLowerCase() === answer;

  if (correct) score++;

  nextQuestion();

  res.render("index", {
    question: currentQuestion,
    score: score,
    wasCorrect: correct,
    user: req.session.user,
  });
});

// SAVE SCORE
app.post("/save-score", async (req, res) => {
  const userId = req.session.user.id;

  await db.query(
    "INSERT INTO scores (user_id, score) VALUES ($1, $2)",
    [userId, score]
  );

  score = 0;
  res.redirect("/leaderboard");
});

// LEADERBOARD
app.get("/leaderboard", async (req, res) => {
  const result = await db.query(`
    SELECT users.username, scores.score
    FROM scores
    JOIN users ON users.id = scores.user_id
    ORDER BY scores.score DESC
    LIMIT 10
  `);

  res.render("leaderboard", {
    leaders: result.rows,
  });
});

// SERVER START
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});